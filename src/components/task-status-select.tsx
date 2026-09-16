"use client";

import { useState, useTransition } from "react";
import {
  updateTaskStatus,
  type TaskStatusValue,
} from "@/app/(app)/my-profile/actions";

const STATUS_OPTIONS: { value: TaskStatusValue; label: string }[] = [
  { value: "PENDING", label: "لم تبدأ" },
  { value: "IN_PROGRESS", label: "قيد التنفيذ" },
  { value: "DONE", label: "منجزة" },
];

export function TaskStatusSelect({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatusValue;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (value: TaskStatusValue) => {
    setError(null);
    startTransition(async () => {
      const result = await updateTaskStatus(taskId, value);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <select
        value={status}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as TaskStatusValue)}
        className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
