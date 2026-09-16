"use client";

import { useState, useTransition } from "react";
import {
  archiveEmployee,
  getEmployeeAuditLog,
  reactivateEmployee,
  updateEmployee,
  type EmployeeAuditLogEntry,
} from "@/app/(app)/hr/actions";
import { EMPLOYEE_FIELD_LABELS } from "@/lib/employee";

const dateFormatter = new Intl.DateTimeFormat("ar", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ar", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const ROLE_LABELS: Record<string, string> = {
  MANAGER: "مدير",
  EMPLOYEE: "موظف عادي",
  HR: "موارد بشرية",
};

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export type EmployeeRowData = {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  hireDate: Date;
  role: "HR" | "MANAGER" | "EMPLOYEE" | null;
  managerId: string | null;
  managerName: string | null;
  directReportsCount: number;
  annualLeaveBalance: number;
  leaveBalanceNote: string | null;
  status: "ACTIVE" | "ARCHIVED";
  nationalId: string | null;
  iqamaExpiryDate: Date | null;
  phoneNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  iqamaExpiringSoon: boolean;
};

type Manager = {
  id: string;
  fullName: string;
};

export function EmployeeRow({
  employee,
  managers,
}: {
  employee: EmployeeRowData;
  managers: Manager[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(employee.fullName);
  const [jobTitle, setJobTitle] = useState(employee.jobTitle);
  const [department, setDepartment] = useState(employee.department);
  const [role, setRole] = useState<"EMPLOYEE" | "MANAGER">(
    employee.role === "MANAGER" ? "MANAGER" : "EMPLOYEE",
  );
  const [managerId, setManagerId] = useState(employee.managerId ?? "");
  const [annualLeaveBalance, setAnnualLeaveBalance] = useState(
    String(employee.annualLeaveBalance),
  );
  const [leaveBalanceNote, setLeaveBalanceNote] = useState("");
  const [nationalId, setNationalId] = useState(employee.nationalId ?? "");
  const [iqamaExpiryDate, setIqamaExpiryDate] = useState(
    toDateInputValue(employee.iqamaExpiryDate),
  );
  const [phoneNumber, setPhoneNumber] = useState(employee.phoneNumber ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(
    employee.emergencyContactName ?? "",
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    employee.emergencyContactPhone ?? "",
  );

  const [isArchiveActionPending, startArchiveTransition] = useTransition();
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditEntries, setAuditEntries] = useState<
    EmployeeAuditLogEntry[] | null
  >(null);
  const [isAuditLoading, startAuditTransition] = useTransition();
  const [auditError, setAuditError] = useState<string | null>(null);

  const availableManagers = managers.filter((m) => m.id !== employee.id);

  const showDowngradeWarning =
    employee.role === "MANAGER" &&
    role === "EMPLOYEE" &&
    employee.directReportsCount > 0;

  const resetFields = () => {
    setFullName(employee.fullName);
    setJobTitle(employee.jobTitle);
    setDepartment(employee.department);
    setRole(employee.role === "MANAGER" ? "MANAGER" : "EMPLOYEE");
    setManagerId(employee.managerId ?? "");
    setAnnualLeaveBalance(String(employee.annualLeaveBalance));
    setLeaveBalanceNote("");
    setNationalId(employee.nationalId ?? "");
    setIqamaExpiryDate(toDateInputValue(employee.iqamaExpiryDate));
    setPhoneNumber(employee.phoneNumber ?? "");
    setEmergencyContactName(employee.emergencyContactName ?? "");
    setEmergencyContactPhone(employee.emergencyContactPhone ?? "");
    setError(null);
  };

  const handleCancel = () => {
    resetFields();
    setIsEditing(false);
  };

  const handleSave = () => {
    setError(null);
    const parsedBalance = Number(annualLeaveBalance);
    if (!Number.isInteger(parsedBalance) || parsedBalance < 0) {
      setError("رصيد الإجازة يجب أن يكون رقمًا صحيحًا غير سالب");
      return;
    }
    startTransition(async () => {
      const result = await updateEmployee({
        employeeId: employee.id,
        fullName,
        jobTitle,
        department,
        role,
        managerId: managerId || null,
        annualLeaveBalance: parsedBalance,
        leaveBalanceNote,
        nationalId,
        iqamaExpiryDate,
        phoneNumber,
        emergencyContactName,
        emergencyContactPhone,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
    });
  };

  const handleArchive = () => {
    if (
      !window.confirm(
        `هل تريد أرشفة "${employee.fullName}"؟ لن يتمكن من تسجيل الدخول بعد الأرشفة، لكن سجله (الحضور والمهام والإجازات) سيبقى محفوظًا.`,
      )
    ) {
      return;
    }
    setArchiveError(null);
    startArchiveTransition(async () => {
      const result = await archiveEmployee(employee.id);
      if (result.error) {
        setArchiveError(result.error);
      }
    });
  };

  const handleReactivate = () => {
    setArchiveError(null);
    startArchiveTransition(async () => {
      const result = await reactivateEmployee(employee.id);
      if (result.error) {
        setArchiveError(result.error);
      }
    });
  };

  const toggleAuditLog = () => {
    if (showAuditLog) {
      setShowAuditLog(false);
      return;
    }
    setShowAuditLog(true);
    if (auditEntries === null) {
      setAuditError(null);
      startAuditTransition(async () => {
        const result = await getEmployeeAuditLog(employee.id);
        if (result.error) {
          setAuditError(result.error);
          return;
        }
        setAuditEntries(result.entries ?? []);
      });
    }
  };

  const auditLogRow = showAuditLog && (
    <tr className="border-b border-border/60 bg-background">
      <td colSpan={10} className="px-4 py-3">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            سجل تعديلات {employee.fullName}
          </h3>
          {isAuditLoading && (
            <p className="text-sm text-muted">جارٍ التحميل...</p>
          )}
          {auditError && <p className="text-sm text-danger">{auditError}</p>}
          {!isAuditLoading && auditEntries && auditEntries.length === 0 && (
            <p className="text-sm text-muted">لا توجد تعديلات مسجلة بعد</p>
          )}
          {!isAuditLoading && auditEntries && auditEntries.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 font-medium text-muted">
                      التاريخ
                    </th>
                    <th className="px-3 py-2 font-medium text-muted">
                      من عدّل
                    </th>
                    <th className="px-3 py-2 font-medium text-muted">
                      الحقل
                    </th>
                    <th className="px-3 py-2 font-medium text-muted">
                      القيمة القديمة
                    </th>
                    <th className="px-3 py-2 font-medium text-muted">
                      القيمة الجديدة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auditEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border/60 even:bg-stripe"
                    >
                      <td className="px-3 py-2">
                        {dateTimeFormatter.format(entry.changedAt)}
                      </td>
                      <td className="px-3 py-2">{entry.changedByEmail}</td>
                      <td className="px-3 py-2">
                        {EMPLOYEE_FIELD_LABELS[entry.fieldChanged] ??
                          entry.fieldChanged}
                      </td>
                      <td className="max-w-[10rem] px-3 py-2 text-muted">
                        {entry.oldValue ?? "-"}
                      </td>
                      <td className="max-w-[10rem] px-3 py-2">
                        {entry.newValue ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </td>
    </tr>
  );

  if (isEditing) {
    return (
      <>
        <tr className="border-b border-border/60 even:bg-stripe">
          <td className="px-4 py-2.5">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
            />
          </td>
          <td className="py-2 text-muted">
            {employee.email}
          </td>
          <td className="px-4 py-2.5">
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
            />
          </td>
          <td className="px-4 py-2.5">
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
            />
          </td>
          <td className="py-2 text-muted">
            {dateFormatter.format(employee.hireDate)}
          </td>
          <td className="px-4 py-2.5">
            <input
              type="number"
              min={0}
              step={1}
              value={annualLeaveBalance}
              onChange={(e) => setAnnualLeaveBalance(e.target.value)}
              className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
            />
          </td>
          <td className="px-4 py-2.5">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "EMPLOYEE" | "MANAGER")}
              className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="EMPLOYEE">موظف عادي</option>
              <option value="MANAGER">مدير</option>
            </select>
          </td>
          <td className="px-4 py-2.5">
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">بدون مدير</option>
              {availableManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.fullName}
                </option>
              ))}
            </select>
          </td>
          <td className="px-4 py-2.5 text-muted">
            {employee.status === "ACTIVE" ? "نشط" : "مؤرشف"}
          </td>
          <td className="px-4 py-2.5">
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {isPending ? "جارٍ الحفظ..." : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground transition-colors hover:bg-background"
                >
                  إلغاء
                </button>
              </div>
              <input
                value={leaveBalanceNote}
                onChange={(e) => setLeaveBalanceNote(e.target.value)}
                placeholder="سبب تعديل رصيد الإجازة (اختياري)"
                className="w-full max-w-[16rem] rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground transition-colors hover:bg-background"
              />
              {showDowngradeWarning && (
                <p className="max-w-[16rem] text-xs text-amber-600 dark:text-amber-400">
                  تنبيه: هذا الموظف مدير حاليًا لـ {employee.directReportsCount}{" "}
                  موظف. تغييره لموظف عادي سيتركهم بدون مدير مباشر (الحفظ لن
                  يُمنع).
                </p>
              )}
              {error && <p className="text-xs text-danger">{error}</p>}
            </div>
          </td>
        </tr>
        <tr className="border-b border-border/60 bg-background">
          <td colSpan={10} className="px-4 py-3">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted">
                بيانات إضافية (اختياري)
              </span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">
                    رقم الهوية/الإقامة
                  </label>
                  <input
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">
                    تاريخ انتهاء الإقامة
                  </label>
                  <input
                    type="date"
                    value={iqamaExpiryDate}
                    onChange={(e) => setIqamaExpiryDate(e.target.value)}
                    className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">رقم الجوال</label>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">
                    اسم جهة الاتصال الطارئ
                  </label>
                  <input
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">
                    رقم جهة الاتصال الطارئ
                  </label>
                  <input
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </td>
        </tr>
      </>
    );
  }

  return (
    <>
      <tr className="border-b border-border/60 even:bg-stripe">
        <td className="px-4 py-2.5">
          <div className="flex flex-col gap-0.5">
            <span>{employee.fullName}</span>
            {employee.iqamaExpiringSoon && (
              <span className="w-fit rounded-md bg-red-500/10 px-1.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                الإقامة تنتهي قريبًا
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-2.5">{employee.email}</td>
        <td className="px-4 py-2.5">{employee.jobTitle}</td>
        <td className="px-4 py-2.5">{employee.department}</td>
        <td className="px-4 py-2.5">{dateFormatter.format(employee.hireDate)}</td>
        <td className="px-4 py-2.5">
          <div className="flex flex-col">
            <span>{employee.annualLeaveBalance}</span>
            {employee.leaveBalanceNote && (
              <span
                className="max-w-[10rem] truncate text-xs text-muted"
                title={employee.leaveBalanceNote}
              >
                {employee.leaveBalanceNote}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-2.5">
          {employee.role ? (ROLE_LABELS[employee.role] ?? employee.role) : "-"}
        </td>
        <td className="px-4 py-2.5">{employee.managerName ?? "-"}</td>
        <td className="px-4 py-2.5">
          {employee.status === "ACTIVE" ? (
            <span className="w-fit rounded-md bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">
              نشط
            </span>
          ) : (
            <span className="w-fit rounded-md bg-muted/10 px-1.5 py-0.5 text-xs font-medium text-muted">
              مؤرشف
            </span>
          )}
        </td>
        <td className="px-4 py-2.5">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs font-medium text-primary hover:underline"
              >
                تعديل
              </button>
              {employee.status === "ACTIVE" ? (
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={isArchiveActionPending}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                >
                  أرشفة
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReactivate}
                  disabled={isArchiveActionPending}
                  className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                >
                  إعادة تفعيل
                </button>
              )}
              <button
                type="button"
                onClick={toggleAuditLog}
                className="text-xs font-medium text-muted hover:underline"
              >
                {showAuditLog ? "إخفاء السجل" : "سجل التعديلات"}
              </button>
            </div>
            {archiveError && (
              <p className="text-xs text-danger">{archiveError}</p>
            )}
          </div>
        </td>
      </tr>
      {auditLogRow}
    </>
  );
}
