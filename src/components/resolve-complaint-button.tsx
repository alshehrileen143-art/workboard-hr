"use client";

import { useState, useTransition } from "react";
import { resolveComplaint } from "@/app/(app)/hr/complaints/actions";

export function ResolveComplaintButton({
  complaintId,
}: {
  complaintId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await resolveComplaint(complaintId);
      if (result.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-fit rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {isPending ? "جارٍ التحديث..." : "تحديد كـ تم الحل"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
