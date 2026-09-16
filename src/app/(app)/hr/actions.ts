"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, Role, EmployeeStatus } from "@/generated/prisma/client";
import { ROLE_VALUE_LABELS } from "@/lib/employee";

export type CreateEmployeeState = {
  error?: string;
  success?: boolean;
  createdAccount?: {
    email: string;
    tempPassword: string;
  };
};

function generateTemporaryPassword(): string {
  return randomBytes(9).toString("base64url");
}

function optionalTrimmed(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function createEmployee(
  _prevState: CreateEmployeeState,
  formData: FormData,
): Promise<CreateEmployeeState> {
  const session = await auth();
  if (session?.user?.role !== "HR") {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }

  const fullName = formData.get("fullName");
  const email = formData.get("email");
  const jobTitle = formData.get("jobTitle");
  const department = formData.get("department");
  const hireDate = formData.get("hireDate");
  const roleValue = formData.get("role");
  const managerIdValue = formData.get("managerId");

  if (
    typeof fullName !== "string" ||
    !fullName.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof jobTitle !== "string" ||
    !jobTitle.trim() ||
    typeof department !== "string" ||
    !department.trim() ||
    typeof hireDate !== "string" ||
    !hireDate
  ) {
    return { error: "الرجاء تعبئة جميع الحقول" };
  }

  const parsedHireDate = new Date(hireDate);
  if (Number.isNaN(parsedHireDate.getTime())) {
    return { error: "تاريخ التوظيف غير صالح" };
  }

  const iqamaExpiryDateValue = formData.get("iqamaExpiryDate");
  let iqamaExpiryDate: Date | null = null;
  if (typeof iqamaExpiryDateValue === "string" && iqamaExpiryDateValue.trim()) {
    const parsed = new Date(iqamaExpiryDateValue);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "تاريخ انتهاء الإقامة غير صالح" };
    }
    iqamaExpiryDate = parsed;
  }

  const nationalId = optionalTrimmed(formData.get("nationalId"));
  const phoneNumber = optionalTrimmed(formData.get("phoneNumber"));
  const emergencyContactName = optionalTrimmed(
    formData.get("emergencyContactName"),
  );
  const emergencyContactPhone = optionalTrimmed(
    formData.get("emergencyContactPhone"),
  );

  const newUserRole =
    roleValue === "MANAGER" ? Role.MANAGER : Role.EMPLOYEE;

  const managerId =
    typeof managerIdValue === "string" && managerIdValue.trim()
      ? managerIdValue.trim()
      : null;

  if (managerId) {
    const manager = await prisma.employee.findUnique({
      where: { id: managerId },
      include: { user: true },
    });
    if (
      !manager ||
      manager.user?.role !== Role.MANAGER ||
      manager.status !== EmployeeStatus.ACTIVE
    ) {
      return { error: "المدير المحدد غير صالح" };
    }
  }

  const trimmedEmail = email.trim();
  const tempPassword = generateTemporaryPassword();

  try {
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          fullName: fullName.trim(),
          email: trimmedEmail,
          jobTitle: jobTitle.trim(),
          department: department.trim(),
          hireDate: parsedHireDate,
          managerId,
          nationalId,
          iqamaExpiryDate,
          phoneNumber,
          emergencyContactName,
          emergencyContactPhone,
        },
      });

      await tx.user.create({
        data: {
          email: trimmedEmail,
          password: hashedPassword,
          role: newUserRole,
          employeeId: employee.id,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "يوجد موظف أو حساب مستخدم بهذا البريد الإلكتروني بالفعل" };
    }
    throw error;
  }

  revalidatePath("/hr");
  return {
    success: true,
    createdAccount: { email: trimmedEmail, tempPassword },
  };
}

export type UpdateEmployeeInput = {
  employeeId: string;
  fullName: string;
  jobTitle: string;
  department: string;
  role: "EMPLOYEE" | "MANAGER";
  managerId: string | null;
  annualLeaveBalance: number;
  leaveBalanceNote: string;
  nationalId: string;
  iqamaExpiryDate: string;
  phoneNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

export type UpdateEmployeeResult = { error?: string; success?: boolean };

function dateLabel(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export async function updateEmployee(
  input: UpdateEmployeeInput,
): Promise<UpdateEmployeeResult> {
  const session = await auth();
  if (session?.user?.role !== "HR" || !session.user.id) {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }
  const changedByUserId = session.user.id;

  const fullName = input.fullName.trim();
  const jobTitle = input.jobTitle.trim();
  const department = input.department.trim();

  if (!fullName || !jobTitle || !department) {
    return { error: "الرجاء تعبئة جميع الحقول" };
  }

  if (input.managerId === input.employeeId) {
    return { error: "لا يمكن اختيار الموظف كمديرٍ لنفسه" };
  }

  if (
    !Number.isFinite(input.annualLeaveBalance) ||
    !Number.isInteger(input.annualLeaveBalance) ||
    input.annualLeaveBalance < 0
  ) {
    return { error: "رصيد الإجازة يجب أن يكون رقمًا صحيحًا غير سالب" };
  }

  let iqamaExpiryDate: Date | null = null;
  if (input.iqamaExpiryDate.trim()) {
    const parsed = new Date(input.iqamaExpiryDate);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "تاريخ انتهاء الإقامة غير صالح" };
    }
    iqamaExpiryDate = parsed;
  }

  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    include: { user: true, manager: { select: { fullName: true } } },
  });
  if (!employee) {
    return { error: "الموظف غير موجود" };
  }

  let newManagerName: string | null = null;
  if (input.managerId) {
    const manager = await prisma.employee.findUnique({
      where: { id: input.managerId },
      include: { user: true },
    });
    if (
      !manager ||
      manager.user?.role !== Role.MANAGER ||
      manager.status !== EmployeeStatus.ACTIVE
    ) {
      return { error: "المدير المحدد غير صالح" };
    }
    newManagerName = manager.fullName;
  }

  const newRole = input.role === "MANAGER" ? Role.MANAGER : Role.EMPLOYEE;
  const oldRoleKey = employee.user?.role === Role.MANAGER ? "MANAGER" : "EMPLOYEE";
  const leaveBalanceNote = input.leaveBalanceNote.trim() || null;
  const nationalId = input.nationalId.trim() || null;
  const phoneNumber = input.phoneNumber.trim() || null;
  const emergencyContactName = input.emergencyContactName.trim() || null;
  const emergencyContactPhone = input.emergencyContactPhone.trim() || null;

  const diffs: { fieldChanged: string; oldValue: string | null; newValue: string | null }[] = [];
  const pushDiff = (
    fieldChanged: string,
    oldValue: string | null,
    newValue: string | null,
  ) => {
    if (oldValue !== newValue) {
      diffs.push({ fieldChanged, oldValue, newValue });
    }
  };

  pushDiff("fullName", employee.fullName, fullName);
  pushDiff("jobTitle", employee.jobTitle, jobTitle);
  pushDiff("department", employee.department, department);
  pushDiff("role", ROLE_VALUE_LABELS[oldRoleKey], ROLE_VALUE_LABELS[input.role]);
  pushDiff(
    "managerId",
    employee.manager?.fullName ?? "بدون مدير",
    newManagerName ?? "بدون مدير",
  );
  pushDiff(
    "annualLeaveBalance",
    String(employee.annualLeaveBalance),
    String(input.annualLeaveBalance),
  );
  pushDiff("leaveBalanceNote", employee.leaveBalanceNote, leaveBalanceNote);
  pushDiff("nationalId", employee.nationalId, nationalId);
  pushDiff(
    "iqamaExpiryDate",
    dateLabel(employee.iqamaExpiryDate),
    dateLabel(iqamaExpiryDate),
  );
  pushDiff("phoneNumber", employee.phoneNumber, phoneNumber);
  pushDiff(
    "emergencyContactName",
    employee.emergencyContactName,
    emergencyContactName,
  );
  pushDiff(
    "emergencyContactPhone",
    employee.emergencyContactPhone,
    emergencyContactPhone,
  );

  await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: input.employeeId },
      data: {
        fullName,
        jobTitle,
        department,
        managerId: input.managerId,
        annualLeaveBalance: input.annualLeaveBalance,
        leaveBalanceNote,
        nationalId,
        iqamaExpiryDate,
        phoneNumber,
        emergencyContactName,
        emergencyContactPhone,
      },
    });

    if (employee.user) {
      await tx.user.update({
        where: { id: employee.user.id },
        data: { role: newRole },
      });
    }

    if (diffs.length > 0) {
      await tx.employeeAuditLog.createMany({
        data: diffs.map((diff) => ({
          employeeId: input.employeeId,
          changedByUserId,
          fieldChanged: diff.fieldChanged,
          oldValue: diff.oldValue,
          newValue: diff.newValue,
        })),
      });
    }
  });

  revalidatePath("/hr");
  return { success: true };
}

export type EmployeeStatusActionResult = { error?: string; success?: boolean };

export async function archiveEmployee(
  employeeId: string,
): Promise<EmployeeStatusActionResult> {
  const session = await auth();
  if (session?.user?.role !== "HR") {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  });
  if (!employee) {
    return { error: "الموظف غير موجود" };
  }
  if (employee.status === EmployeeStatus.ARCHIVED) {
    return { error: "الموظف مؤرشف بالفعل" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: employeeId },
      data: { status: EmployeeStatus.ARCHIVED },
    });
    if (employee.user) {
      await tx.user.update({
        where: { id: employee.user.id },
        data: { isActive: false },
      });
    }
  });

  revalidatePath("/hr");
  return { success: true };
}

export async function reactivateEmployee(
  employeeId: string,
): Promise<EmployeeStatusActionResult> {
  const session = await auth();
  if (session?.user?.role !== "HR") {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  });
  if (!employee) {
    return { error: "الموظف غير موجود" };
  }
  if (employee.status === EmployeeStatus.ACTIVE) {
    return { error: "الموظف نشط بالفعل" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: employeeId },
      data: { status: EmployeeStatus.ACTIVE },
    });
    if (employee.user) {
      await tx.user.update({
        where: { id: employee.user.id },
        data: { isActive: true },
      });
    }
  });

  revalidatePath("/hr");
  return { success: true };
}

export type EmployeeAuditLogEntry = {
  id: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: Date;
  changedByEmail: string;
};

export type EmployeeAuditLogResult = {
  error?: string;
  entries?: EmployeeAuditLogEntry[];
};

export async function getEmployeeAuditLog(
  employeeId: string,
): Promise<EmployeeAuditLogResult> {
  const session = await auth();
  if (session?.user?.role !== "HR") {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }

  const logs = await prisma.employeeAuditLog.findMany({
    where: { employeeId },
    include: { changedByUser: { select: { email: true } } },
    orderBy: { changedAt: "desc" },
  });

  return {
    entries: logs.map((log) => ({
      id: log.id,
      fieldChanged: log.fieldChanged,
      oldValue: log.oldValue,
      newValue: log.newValue,
      changedAt: log.changedAt,
      changedByEmail: log.changedByUser.email,
    })),
  };
}
