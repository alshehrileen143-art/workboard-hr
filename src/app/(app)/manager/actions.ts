"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTaskOverdue } from "@/lib/tasks";
import { ComplaintStatus, LeaveRequestStatus } from "@/generated/prisma/client";

export type CreateTaskState = {
  error?: string;
  success?: boolean;
};

export async function createTask(
  _prevState: CreateTaskState,
  formData: FormData,
): Promise<CreateTaskState> {
  const session = await auth();
  if (session?.user?.role !== "MANAGER" || !session.user.employeeId) {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }

  const employeeId = formData.get("employeeId");
  const title = formData.get("title");
  const description = formData.get("description");
  const deadline = formData.get("deadline");

  if (typeof employeeId !== "string" || !employeeId) {
    return { error: "الرجاء اختيار الموظف" };
  }
  if (typeof title !== "string" || !title.trim()) {
    return { error: "الرجاء إدخال عنوان المهمة" };
  }
  if (typeof deadline !== "string" || !deadline) {
    return { error: "الرجاء اختيار تاريخ الاستحقاق" };
  }

  const parsedDeadline = new Date(deadline);
  if (Number.isNaN(parsedDeadline.getTime())) {
    return { error: "تاريخ الاستحقاق غير صالح" };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });
  if (!employee || employee.managerId !== session.user.employeeId) {
    return { error: "لا يمكنك إسناد مهمة لموظف ليس تحت إدارتك" };
  }

  const trimmedDescription =
    typeof description === "string" && description.trim()
      ? description.trim()
      : null;

  await prisma.task.create({
    data: {
      employeeId,
      managerId: session.user.employeeId,
      title: title.trim(),
      description: trimmedDescription,
      deadline: parsedDeadline,
    },
  });

  revalidatePath("/manager");
  return { success: true };
}

export type UpdateDeadlineResult = { error?: string; success?: boolean };

export async function updateTaskDeadline(
  taskId: string,
  deadline: string,
): Promise<UpdateDeadlineResult> {
  const session = await auth();
  if (session?.user?.role !== "MANAGER" || !session.user.employeeId) {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }

  const parsedDeadline = new Date(deadline);
  if (Number.isNaN(parsedDeadline.getTime())) {
    return { error: "تاريخ الاستحقاق غير صالح" };
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.managerId !== session.user.employeeId) {
    return { error: "المهمة غير موجودة" };
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { deadline: parsedDeadline },
  });

  revalidatePath("/manager");
  return { success: true };
}

export type CreateComplaintState = {
  error?: string;
  success?: boolean;
};

export async function createComplaint(
  _prevState: CreateComplaintState,
  formData: FormData,
): Promise<CreateComplaintState> {
  const session = await auth();
  if (session?.user?.role !== "MANAGER" || !session.user.employeeId) {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }

  const taskId = formData.get("taskId");
  const reason = formData.get("reason");

  if (typeof taskId !== "string" || !taskId) {
    return { error: "مهمة غير صالحة" };
  }
  if (typeof reason !== "string" || !reason.trim()) {
    return { error: "الرجاء كتابة سبب الشكوى" };
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.managerId !== session.user.employeeId) {
    return { error: "المهمة غير موجودة" };
  }

  if (!isTaskOverdue(task.status, task.deadline)) {
    return { error: "لا يمكن رفع شكوى إلا على مهمة متأخرة" };
  }

  const existingOpenComplaint = await prisma.complaintToHR.findFirst({
    where: { taskId, status: ComplaintStatus.OPEN },
  });
  if (existingOpenComplaint) {
    return { error: "توجد شكوى مفتوحة بالفعل لهذه المهمة" };
  }

  await prisma.complaintToHR.create({
    data: {
      taskId,
      employeeId: task.employeeId,
      managerId: session.user.employeeId,
      reason: reason.trim(),
    },
  });

  revalidatePath("/manager");
  revalidatePath("/hr/complaints");
  return { success: true };
}

export type DecideLeaveRequestResult = { error?: string; success?: boolean };

export async function decideManagerLeaveRequest(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  note: string,
): Promise<DecideLeaveRequestResult> {
  const session = await auth();
  if (session?.user?.role !== "MANAGER" || !session.user.employeeId) {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }

  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: { employee: { select: { managerId: true } } },
  });
  if (!request || request.employee.managerId !== session.user.employeeId) {
    return { error: "الطلب غير موجود" };
  }
  if (request.managerStatus !== LeaveRequestStatus.PENDING) {
    return { error: "تم اتخاذ قرار بخصوص هذا الطلب بالفعل" };
  }

  await prisma.leaveRequest.update({
    where: { id: requestId },
    data: {
      managerStatus: decision as LeaveRequestStatus,
      managerNote: note.trim() || null,
    },
  });

  revalidatePath("/manager");
  revalidatePath("/hr/leave-requests");
  return { success: true };
}
