"use client";

import { useState, useTransition } from "react";
import { checkIn, checkOut } from "@/app/(app)/my-profile/actions";

type AttendanceButtonsProps = {
  hasCheckedInToday: boolean;
  hasCheckedOutToday: boolean;
};

export function AttendanceButtons({
  hasCheckedInToday,
  hasCheckedOutToday,
}: AttendanceButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCheckIn = () => {
    setError(null);
    startTransition(async () => {
      const result = await checkIn();
      if (result?.error) setError(result.error);
    });
  };

  const handleCheckOut = () => {
    setError(null);
    startTransition(async () => {
      const result = await checkOut();
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCheckIn}
          disabled={isPending || hasCheckedInToday}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none"
        >
          تسجيل حضور
        </button>
        <button
          type="button"
          onClick={handleCheckOut}
          disabled={isPending || !hasCheckedInToday || hasCheckedOutToday}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background disabled:opacity-50 disabled:pointer-events-none"
        >
          تسجيل انصراف
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
