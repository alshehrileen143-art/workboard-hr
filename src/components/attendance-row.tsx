"use client";

import { useActionState, useState } from "react";
import {
  updateAttendanceRecord,
  type AttendanceFormState,
} from "@/app/(app)/hr/attendance/actions";
import { toTimeInputValue } from "@/lib/attendance";

const initialState: AttendanceFormState = {};

const SOURCE_LABELS: Record<string, string> = {
  SELF: "الموظف نفسه",
  HR: "الموارد البشرية",
  IMPORT: "استيراد Excel",
};

const dateFormatter = new Intl.DateTimeFormat("ar", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat("ar", {
  hour: "2-digit",
  minute: "2-digit",
});

export type AttendanceRecordDTO = {
  id: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  source: string;
  employee: { fullName: string };
};

export function AttendanceRow({ record }: { record: AttendanceRecordDTO }) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateAttendanceRecord,
    initialState,
  );

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setIsEditing(false);
    }
  }

  if (isEditing) {
    return (
      <tr className="border-b border-border/60 even:bg-stripe">
        <td className="px-4 py-2.5">{record.employee.fullName}</td>
        <td className="px-4 py-2.5">{dateFormatter.format(record.date)}</td>
        <td colSpan={4} className="px-4 py-2.5">
          <form action={formAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="recordId" value={record.id} />
            <input
              type="time"
              name="checkInTime"
              defaultValue={toTimeInputValue(record.checkIn)}
              aria-label="وقت الحضور"
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
            />
            <input
              type="time"
              name="checkOutTime"
              defaultValue={toTimeInputValue(record.checkOut)}
              aria-label="وقت الانصراف"
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isPending ? "جارٍ الحفظ..." : "حفظ"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground transition-colors hover:bg-background"
            >
              إلغاء
            </button>
            {state.error && (
              <span className="w-full text-xs text-danger">{state.error}</span>
            )}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border/60 even:bg-stripe">
      <td className="px-4 py-2.5">{record.employee.fullName}</td>
      <td className="px-4 py-2.5">{dateFormatter.format(record.date)}</td>
      <td className="px-4 py-2.5">
        {record.checkIn ? timeFormatter.format(record.checkIn) : "-"}
      </td>
      <td className="px-4 py-2.5">
        {record.checkOut ? timeFormatter.format(record.checkOut) : "-"}
      </td>
      <td className="px-4 py-2.5">{SOURCE_LABELS[record.source] ?? record.source}</td>
      <td className="px-4 py-2.5">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs font-medium text-primary hover:underline"
        >
          تعديل
        </button>
      </td>
    </tr>
  );
}
