"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfTodayUTC } from "@/lib/attendance";
import { AttendanceSource, TaskStatus, LeaveType } from "@/generated/prisma/client";
import { daysBetweenInclusive, isDateRangeLeaveType } from "@/lib/leave";

export type AttendanceActionResult = { error?: string } | undefined;

const VALID_TASK_STATUSES = ["PENDING", "IN_PROGRESS", "DONE"] as const;
export type TaskStatusValue = (typeof VALID_TASK_STATUSES)[number];

const VALID_LEAVE_TYPES = [
  "ANNUAL",
  "SICK",
  "EMERGENCY",
  "PERMISSION",
  "UNAUTHORIZED_ABSENCE",
] as const;

async function requireEmployeeId(): Promise<
  { employeeId: string } | { error: string }
> {
  const session = await auth();
  if (session?.user?.role !== "EMPLOYEE") {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }
  if (!session.user.employeeId) {
    return { error: "لا يوجد سجل موظف مرتبط بحسابك" };
  }
  return { employeeId: session.user.employeeId };
}

export async function checkIn(): Promise<AttendanceActionResult> {
  const authResult = await requireEmployeeId();
  if ("error" in authResult) {
    return { error: authResult.error };
  }
  const { employeeId } = authResult;
  const date = startOfTodayUTC();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });

  if (existing?.checkIn) {
    return { error: "لقد سجّلت حضورك لهذا اليوم مسبقًا" };
  }

  if (existing) {
    await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkIn: new Date(), source: AttendanceSource.SELF },
    });
  } else {
    await prisma.attendance.create({
      data: {
        employeeId,
        date,
        checkIn: new Date(),
        source: AttendanceSource.SELF,
      },
    });
  }

  revalidatePath("/my-profile");
}

export async function checkOut(): Promise<AttendanceActionResult> {
  const authResult = await requireEmployeeId();
  if ("error" in authResult) {
    return { error: authResult.error };
  }
  const { employeeId } = authResult;
  const date = startOfTodayUTC();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });

  if (!existing?.checkIn) {
    return { error: "يجب تسجيل الحضور أولاً" };
  }

  if (existing.checkOut) {
    return { error: "لقد سجّلت انصرافك لهذا اليوم مسبقًا" };
  }

  await prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOut: new Date() },
  });

  revalidatePath("/my-profile");
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatusValue,
): Promise<AttendanceActionResult> {
  const authResult = await requireEmployeeId();
  if ("error" in authResult) {
    return { error: authResult.error };
  }
  const { employeeId } = authResult;

  if (!VALID_TASK_STATUSES.includes(status)) {
    return { error: "حالة غير صالحة" };
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.employeeId !== employeeId) {
    return { error: "المهمة غير موجودة" };
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { status: status as TaskStatus },
  });

  revalidatePath("/my-profile");
}

export type CreateLeaveRequestState = {
  error?: string;
  success?: boolean;
};

export async function createLeaveRequest(
  _prevState: CreateLeaveRequestState,
  formData: FormData,
): Promise<CreateLeaveRequestState> {
  const authResult = await requireEmployeeId();
  if ("error" in authResult) {
    return { error: authResult.error };
  }
  const { employeeId } = authResult;

  const typeValue = formData.get("type");
  const reason = formData.get("reason");
  const startDateValue = formData.get("startDate");
  const endDateValue = formData.get("endDate");
  const requestDateValue = formData.get("requestDate");
  const hoursValue = formData.get("hours");

  if (
    typeof typeValue !== "string" ||
    !(VALID_LEAVE_TYPES as readonly string[]).includes(typeValue)
  ) {
    return { error: "الرجاء اختيار نوع الطلب" };
  }
  if (typeof reason !== "string" || !reason.trim()) {
    return { error: "الرجاء كتابة السبب" };
  }

  const isDateRange = isDateRangeLeaveType(typeValue);

  let startDate: Date | null = null;
  let endDate: Date | null = null;
  let requestDate: Date | null = null;
  let hours: number | null = null;
  let requestedDays = 0;

  if (isDateRange) {
    if (typeof startDateValue !== "string" || !startDateValue) {
      return { error: "الرجاء اختيار تاريخ البداية" };
    }
    if (typeof endDateValue !== "string" || !endDateValue) {
      return { error: "الرجاء اختيار تاريخ النهاية" };
    }
    startDate = new Date(startDateValue);
    endDate = new Date(endDateValue);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { error: "التواريخ غير صالحة" };
    }
    if (endDate.getTime() < startDate.getTime()) {
      return { error: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية" };
    }
    requestedDays = daysBetweenInclusive(startDate, endDate);
  } else {
    if (typeof requestDateValue !== "string" || !requestDateValue) {
      return { error: "الرجاء اختيار التاريخ" };
    }
    requestDate = new Date(requestDateValue);
    if (Number.isNaN(requestDate.getTime())) {
      return { error: "التاريخ غير صالح" };
    }
    const parsedHours =
      typeof hoursValue === "string" ? Number(hoursValue) : NaN;
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      return { error: "الرجاء إدخال عدد ساعات صحيح" };
    }
    hours = parsedHours;
  }

  if (typeValue === "ANNUAL") {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { annualLeaveBalance: true },
    });
    if (!employee) {
      return { error: "الموظف غير موجود" };
    }
    if (requestedDays > employee.annualLeaveBalance) {
      return {
        error: `عدد الأيام المطلوبة (${requestedDays}) يتجاوز رصيدك المتبقي (${employee.annualLeaveBalance} يوم)`,
      };
    }
  }

  await prisma.leaveRequest.create({
    data: {
      employeeId,
      type: typeValue as LeaveType,
      startDate,
      endDate,
      requestDate,
      hours,
      reason: reason.trim(),
    },
  });

  revalidatePath("/my-profile");
  return { success: true };
}
