"use client";

import { useActionState, useState } from "react";
import {
  addManualAttendanceRecord,
  type AttendanceFormState,
} from "@/app/(app)/hr/attendance/actions";

const initialState: AttendanceFormState = {};

type Employee = {
  id: string;
  fullName: string;
};

export function AddAttendanceForm({ employees }: { employees: Employee[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    addManualAttendanceRecord,
    initialState,
  );

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setIsOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-fit rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background"
      >
        {isOpen ? "إغلاق" : "+ إضافة سجل حضور يدوي"}
      </button>

      {isOpen && (
        <form
          action={formAction}
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:max-w-md"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="manualEmployeeId" className="text-sm font-medium">
              الموظف
            </label>
            <select
              id="manualEmployeeId"
              name="employeeId"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            >
              <option value="">اختر موظفًا</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="date" className="text-sm font-medium">
              التاريخ
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="checkInTime" className="text-sm font-medium">
                وقت الحضور
              </label>
              <input
                id="checkInTime"
                name="checkInTime"
                type="time"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="checkOutTime" className="text-sm font-medium">
                وقت الانصراف
              </label>
              <input
                id="checkOutTime"
                name="checkOutTime"
                type="time"
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
            className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending ? "جارٍ الحفظ..." : "حفظ السجل"}
          </button>
        </form>
      )}
    </div>
  );
}
