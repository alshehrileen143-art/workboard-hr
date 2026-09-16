"use client";

import { useActionState, useState } from "react";
import {
  importAttendanceFromExcel,
  type ImportAttendanceState,
} from "@/app/(app)/hr/attendance/import-actions";

const initialState: ImportAttendanceState = {};

export function ImportAttendanceForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    importAttendanceFromExcel,
    initialState,
  );

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-fit rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background"
      >
        {isOpen ? "إغلاق" : "استيراد حضور من Excel"}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:max-w-lg">
          <form action={formAction} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="attendanceExcelFile" className="text-sm font-medium">
                ملف Excel (.xlsx)
              </label>
              <input
                id="attendanceExcelFile"
                name="file"
                type="file"
                accept=".xlsx"
                required
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
              <p className="text-xs text-muted">
                الأعمدة المطلوبة في الصف الأول: employeeEmail, date,
                checkInTime, checkOutTime (صيغة الوقت HH:MM، ويلزم وجود واحد
                منهما على الأقل بكل صف)
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
              <p className="font-medium">ملخص استيراد الحضور</p>
              <p>إجمالي الصفوف: {state.report.totalRows}</p>
              <p className="text-green-700 dark:text-green-400">
                سجلات جديدة: {state.report.createdCount}
              </p>
              <p className="text-blue-700 dark:text-blue-400">
                سجلات محدّثة: {state.report.updatedCount}
              </p>
              <p
                className={
                  state.report.failedCount > 0
                    ? "text-red-600"
                    : "text-muted"
                }
              >
                فشل: {state.report.failedCount} صف
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
