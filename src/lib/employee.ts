export const IQAMA_EXPIRY_WARNING_DAYS = 30;

export function isIqamaExpiringSoon(
  iqamaExpiryDate: Date | null | undefined,
  referenceDate: Date = new Date(),
): boolean {
  if (!iqamaExpiryDate) return false;
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.ceil(
    (iqamaExpiryDate.getTime() - referenceDate.getTime()) / msPerDay,
  );
  return diffDays <= IQAMA_EXPIRY_WARNING_DAYS;
}

export const EMPLOYEE_FIELD_LABELS: Record<string, string> = {
  fullName: "الاسم الكامل",
  jobTitle: "المسمى الوظيفي",
  department: "القسم",
  role: "الدور",
  managerId: "المدير المباشر",
  annualLeaveBalance: "رصيد الإجازة السنوي",
  leaveBalanceNote: "ملاحظة رصيد الإجازة",
  nationalId: "رقم الهوية/الإقامة",
  iqamaExpiryDate: "تاريخ انتهاء الإقامة",
  phoneNumber: "رقم الجوال",
  emergencyContactName: "اسم جهة الاتصال الطارئ",
  emergencyContactPhone: "رقم جهة الاتصال الطارئ",
};

export const ROLE_VALUE_LABELS: Record<string, string> = {
  EMPLOYEE: "موظف عادي",
  MANAGER: "مدير",
};
