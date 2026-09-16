"use client";

import { useActionState, useState } from "react";
import {
  importEmployeesFromExcel,
  type ImportEmployeesState,
} from "@/app/(app)/hr/import-actions";

const initialState: ImportEmployeesState = {};

export function ImportEmployeesForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    importEmployeesFromExcel,
    initialState,
  );

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-fit rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background"
      >
        {isOpen ? "إغلاق" : "استيراد من Excel"}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:max-w-lg">
          <form action={formAction} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="excelFile" className="text-sm font-medium">
                ملف Excel (.xlsx)
              </label>
              <input
                id="excelFile"
                name="file"
                type="file"
                accept=".xlsx"
                required
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
              <p className="text-xs text-muted">
                الأعمدة المطلوبة في الصف الأول (بهذه الأسماء بالإنجليزية):
                fullName, email, jobTitle, department, hireDate
              </p>
            </div>

            {state.error && (
              <p className="text-sm text-danger">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none"
            >
              {isPending ? "جارٍ الاستيراد..." : "رفع واستيراد"}
            </button>
          </form>

          {state.report && (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 text-sm shadow-sm">
              <p className="font-medium">ملخص الاستيراد</p>
              <p>إجمالي الصفوف: {state.report.totalRows}</p>
              <p className="text-green-700 dark:text-green-400">
                تم استيراد {state.report.importedCount} موظف بنجاح (تم إنشاء{" "}
                {state.report.importedCount} حساب دخول لهم)
              </p>
              <p
                className={
                  state.report.failedCount > 0
                    ? "text-red-600"
                    : "text-muted"
                }
              >
                فشل استيراد {state.report.failedCount} صف
              </p>

              {state.report.failures.length > 0 && (
                <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2">
                  {state.report.failures.map((failure) => (
                    <li key={failure.row}>
                      صف {failure.row}: {failure.reason}
                    </li>
                  ))}
                </ul>
              )}

              {state.report.importedCount > 0 && (
                <p className="text-xs text-muted">
                  لم تُعرض كلمات المرور المؤقتة هنا تجنبًا لتكدس بيانات حساسة
                  على الشاشة. يمكن إضافة خاصية تصدير ملف بها لاحقًا عند
                  الحاجة.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
