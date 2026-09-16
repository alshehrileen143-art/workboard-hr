"use client";

import { useActionState, useState } from "react";
import { createEmployee, type CreateEmployeeState } from "@/app/(app)/hr/actions";

const initialState: CreateEmployeeState = {};

type CreatedAccount = NonNullable<CreateEmployeeState["createdAccount"]>;

type Manager = {
  id: string;
  fullName: string;
};

export function AddEmployeeForm({ managers }: { managers: Manager[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [createdAccount, setCreatedAccount] =
    useState<CreatedAccount | null>(null);
  const [state, formAction, isPending] = useActionState(
    createEmployee,
    initialState,
  );

  // Reacting to a successful submission is derived during render (React's
  // "adjusting state while rendering" pattern) instead of an effect.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success && state.createdAccount) {
      setCreatedAccount(state.createdAccount);
    }
  }

  const closePanel = () => {
    setIsOpen(false);
    setCreatedAccount(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => (isOpen ? closePanel() : setIsOpen(true))}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
      >
        {isOpen ? "إغلاق" : "+ إضافة موظف"}
      </button>

      {isOpen && createdAccount && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm sm:max-w-md">
          <p className="font-medium text-green-700 dark:text-green-400">
            تمت إضافة الموظف وإنشاء حساب دخول له. سلّمه بيانات الدخول التالية:
          </p>
          <div className="flex flex-col gap-1">
            <span className="text-muted">
              البريد الإلكتروني
            </span>
            <code className="rounded-md bg-background px-2 py-1 font-mono">
              {createdAccount.email}
            </code>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted">
              كلمة المرور المؤقتة
            </span>
            <code className="rounded-md bg-background px-2 py-1 font-mono">
              {createdAccount.tempPassword}
            </code>
          </div>
          <p className="text-xs text-muted">
            لن تظهر كلمة المرور هذه مرة أخرى — احفظها الآن قبل الإغلاق.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreatedAccount(null)}
              className="w-fit rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background"
            >
              إضافة موظف آخر
            </button>
            <button
              type="button"
              onClick={closePanel}
              className="w-fit rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {isOpen && !createdAccount && (
        <form
          action={formAction}
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:max-w-md"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="fullName" className="text-sm font-medium">
              الاسم الكامل
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="jobTitle" className="text-sm font-medium">
              المسمى الوظيفي
            </label>
            <input
              id="jobTitle"
              name="jobTitle"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="department" className="text-sm font-medium">
              القسم
            </label>
            <input
              id="department"
              name="department"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="hireDate" className="text-sm font-medium">
              تاريخ التوظيف
            </label>
            <input
              id="hireDate"
              name="hireDate"
              type="date"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="role" className="text-sm font-medium">
              الدور (اختياري)
            </label>
            <select
              id="role"
              name="role"
              defaultValue="EMPLOYEE"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            >
              <option value="EMPLOYEE">موظف عادي</option>
              <option value="MANAGER">مدير</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="managerId" className="text-sm font-medium">
              المدير المباشر (اختياري)
            </label>
            <select
              id="managerId"
              name="managerId"
              defaultValue=""
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            >
              <option value="">بدون مدير</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <span className="text-sm font-medium text-muted">
              بيانات إضافية (اختياري)
            </span>

            <div className="flex flex-col gap-1">
              <label htmlFor="nationalId" className="text-sm font-medium">
                رقم الهوية/الإقامة
              </label>
              <input
                id="nationalId"
                name="nationalId"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="iqamaExpiryDate" className="text-sm font-medium">
                تاريخ انتهاء الإقامة (لغير السعوديين)
              </label>
              <input
                id="iqamaExpiryDate"
                name="iqamaExpiryDate"
                type="date"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="phoneNumber" className="text-sm font-medium">
                رقم الجوال
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="emergencyContactName"
                className="text-sm font-medium"
              >
                اسم جهة الاتصال الطارئ
              </label>
              <input
                id="emergencyContactName"
                name="emergencyContactName"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="emergencyContactPhone"
                className="text-sm font-medium"
              >
                رقم جهة الاتصال الطارئ
              </label>
              <input
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          {state.error && (
            <p className="text-sm text-danger">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending ? "جارٍ الحفظ..." : "حفظ الموظف"}
          </button>
        </form>
      )}
    </div>
  );
}
