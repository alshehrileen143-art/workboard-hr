"use client";

import { useActionState, useState } from "react";
import {
  createLeaveRequest,
  type CreateLeaveRequestState,
} from "@/app/(app)/my-profile/actions";
import { LEAVE_TYPE_LABELS, isDateRangeLeaveType } from "@/lib/leave";

const initialState: CreateLeaveRequestState = {};

const TYPE_OPTIONS = [
  "ANNUAL",
  "SICK",
  "EMERGENCY",
  "PERMISSION",
  "UNAUTHORIZED_ABSENCE",
] as const;

export function CreateLeaveRequestForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<string>("ANNUAL");
  const [state, formAction, isPending] = useActionState(
    createLeaveRequest,
    initialState,
  );

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setIsOpen(false);
    }
  }

  const isDateRange = isDateRangeLeaveType(type);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
      >
        {isOpen ? "إغلاق" : "+ تقديم طلب"}
      </button>

      {isOpen && (
        <form
          action={formAction}
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:max-w-md"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="type" className="text-sm font-medium">
              نوع الطلب
            </label>
            <select
              id="type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {LEAVE_TYPE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>

          {isDateRange ? (
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="startDate" className="text-sm font-medium">
                  تاريخ البداية
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="endDate" className="text-sm font-medium">
                  تاريخ النهاية
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="requestDate" className="text-sm font-medium">
                  التاريخ
                </label>
                <input
                  id="requestDate"
                  name="requestDate"
                  type="date"
                  required
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="hours" className="text-sm font-medium">
                  عدد الساعات
                </label>
                <input
                  id="hours"
                  name="hours"
                  type="number"
                  min={0.5}
                  step={0.5}
                  required
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="reason" className="text-sm font-medium">
              السبب
            </label>
            <textarea
              id="reason"
              name="reason"
              required
              rows={3}
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
            {isPending ? "جارٍ الإرسال..." : "إرسال الطلب"}
          </button>
        </form>
      )}
    </div>
  );
}
