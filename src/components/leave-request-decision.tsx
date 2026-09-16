"use client";

import { useState, useTransition } from "react";

type DecideResult = { error?: string; success?: boolean };
type DecideFn = (
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  note: string,
) => Promise<DecideResult>;

export function LeaveRequestDecision({
  requestId,
  onDecide,
}: {
  requestId: string;
  onDecide: DecideFn;
}) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const decide = (decision: "APPROVED" | "REJECTED") => {
    setError(null);
    startTransition(async () => {
      const result = await onDecide(requestId, decision, note);
      if (result.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="ملاحظة (اختياري)"
        className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground transition-colors hover:bg-background"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => decide("APPROVED")}
          disabled={isPending}
          className="rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          موافقة
        </button>
        <button
          type="button"
          onClick={() => decide("REJECTED")}
          disabled={isPending}
          className="rounded-md border border-red-300 bg-surface px-2 py-1 text-xs text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          رفض
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
