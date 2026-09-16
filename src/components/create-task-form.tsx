"use client";

import { useActionState, useState } from "react";
import { createTask, type CreateTaskState } from "@/app/(app)/manager/actions";

const initialState: CreateTaskState = {};

type Employee = {
  id: string;
  fullName: string;
};

export function CreateTaskForm({ employees }: { employees: Employee[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createTask,
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
        className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
      >
        {isOpen ? "إغلاق" : "+ إضافة مهمة"}
      </button>

      {isOpen && (
        <form
          action={formAction}
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:max-w-md"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="taskEmployeeId" className="text-sm font-medium">
              الموظف
            </label>
            <select
              id="taskEmployeeId"
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
            <label htmlFor="title" className="text-sm font-medium">
              العنوان
            </label>
            <input
              id="title"
              name="title"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-sm font-medium">
              الوصف (اختياري)
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="deadline" className="text-sm font-medium">
              تاريخ الاستحقاق
            </label>
            <input
              id="deadline"
              name="deadline"
              type="date"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>

          {state.error && (
            <p className="text-sm text-danger">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending ? "جارٍ الحفظ..." : "حفظ المهمة"}
          </button>
        </form>
      )}
    </div>
  );
}
