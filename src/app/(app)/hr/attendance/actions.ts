"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseDateOnly, combineDateAndTime } from "@/lib/attendance";
import { Prisma, AttendanceSource } from "@/generated/prisma/client";

export type AttendanceFormState = {
  error?: string;
  success?: boolean;
};

export async function addManualAttendanceRecord(
  _prevState: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const session = await auth();
  if (session?.user?.role !== "HR") {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }

  const employeeId = formData.get("employeeId");
  const dateValue = formData.get("date");
  const checkInTime = formData.get("checkInTime");
  const checkOutTime = formData.get("checkOutTime");

  if (typeof employeeId !== "string" || !employeeId) {
    return { error: "الرجاء اختيار الموظف" };
  }
  if (typeof dateValue !== "string" || !dateValue) {
    return { error: "الرجاء اختيار التاريخ" };
  }

  const date = parseDateOnly(dateValue);
  if (!date) {
    return { error: "التاريخ غير صالح" };
  }

  const checkInStr = typeof checkInTime === "string" ? checkInTime.trim() : "";
  const checkOutStr =
    typeof checkOutTime === "string" ? checkOutTime.trim() : "";

  if (!checkInStr && !checkOutStr) {
    return { error: "أدخل وقت حضور أو وقت انصراف على الأقل" };
  }

  const checkIn = checkInStr ? combineDateAndTime(date, checkInStr) : null;
  const checkOut = checkOutStr ? combineDateAndTime(date, checkOutStr) : null;

  if (checkInStr && !checkIn) {
    return { error: "وقت الحضور غير صالح" };
  }
  if (checkOutStr && !checkOut) {
    return { error: "وقت الانصراف غير صالح" };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });
  if (!employee) {
    return { error: "الموظف غير موجود" };
  }

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });
  if (existing) {
    return {
      error:
        "يوجد سجل بالفعل لهذا الموظف بهذا التاريخ — استخدم زر التعديل بدلاً من الإضافة",
    };
  }

  try {
    await prisma.attendance.create({
      data: {
        employeeId,
        date,
        checkIn,
        checkOut,
        source: AttendanceSource.HR,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "يوجد سجل بالفعل لهذا الموظف بهذا التاريخ" };
    }
    throw error;
  }

  revalidatePath("/hr/attendance");
  return { success: true };
}

export async function updateAttendanceRecord(
  _prevState: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const session = await auth();
  if (session?.user?.role !== "HR") {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }

  const recordId = formData.get("recordId");
  const checkInTime = formData.get("checkInTime");
  const checkOutTime = formData.get("checkOutTime");

  if (typeof recordId !== "string" || !recordId) {
    return { error: "سجل غير صالح" };
  }

  const record = await prisma.attendance.findUnique({
    where: { id: recordId },
  });
  if (!record) {
    return { error: "السجل غير موجود" };
  }

  const checkInStr = typeof checkInTime === "string" ? checkInTime.trim() : "";
  const checkOutStr =
    typeof checkOutTime === "string" ? checkOutTime.trim() : "";

  const checkIn = checkInStr
    ? combineDateAndTime(record.date, checkInStr)
    : null;
  const checkOut = checkOutStr
    ? combineDateAndTime(record.date, checkOutStr)
    : null;

  if (checkInStr && !checkIn) {
    return { error: "وقت الحضور غير صالح" };
  }
  if (checkOutStr && !checkOut) {
    return { error: "وقت الانصراف غير صالح" };
  }

  await prisma.attendance.update({
    where: { id: recordId },
    data: {
      checkIn,
      checkOut,
      source: AttendanceSource.HR,
    },
  });

  revalidatePath("/hr/attendance");
  return { success: true };
}
