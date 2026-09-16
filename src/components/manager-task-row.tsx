"use client";

import { useActionState, useState, useTransition } from "react";
import {
  updateTaskDeadline,
  createComplaint,
  type CreateComplaintState,
} from "@/app/(app)/manager/actions";

const dateFormatter = new Intl.DateTimeFormat("ar", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const STATUS_LABELS: Record<string, string> = {
  PENDING: "لم تبدأ",
  IN_PROGRESS: "قيد التنفيذ",
  DONE: "منجزة",
};

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const initialComplaintState: CreateComplaintState = {};

export type ManagerTaskData = {
  id: string;
  employeeName: string;
  title: string;
  deadline: Date;
  status: string;
  isOverdue: boolean;
  hasOpenComplaint: boolean;
};

export function ManagerTaskRow({ task }: { task: ManagerTaskData }) {
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [deadlineValue, setDeadlineValue] = useState(
    toDateInputValue(task.deadline),
  );
  const [isPending, startTransition] = useTransition();
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  const [isComplaintOpen, setIsComplaintOpen] = useState(false);
  const [complaintState, complaintAction, isComplaintPending] = useActionState(
    createComplaint,
    initialComplaintState,
  );

  const [handledComplaintState, setHandledComplaintState] =
    useState(complaintState);
  if (complaintState !== handledComplaintState) {
    setHandledComplaintState(complaintState);
    if (complaintState.success) {
      setIsComplaintOpen(false);
    }
  }

  const handleSaveDeadline = () => {
    setDeadlineError(null);
    startTransition(async () => {
      const result = await updateTaskDeadline(task.id, deadlineValue);
      if (result.error) {
        setDeadlineError(result.error);
        return;
      }
      setIsEditingDeadline(false);
    });
  };

  const handleCancelDeadline = () => {
    setDeadlineValue(toDateInputValue(task.deadline));
    setDeadlineError(null);
    setIsEditingDeadline(false);
  };

  return (
    <tr className="border-b border-border/60 even:bg-stripe">
      <td className="px-4 py-2.5">{task.employeeName}</td>
      <td className="px-4 py-2.5">{task.title}</td>
      <td className="px-4 py-2.5">
        {isEditingDeadline ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={deadlineValue}
                onChange={(e) => setDeadlineValue(e.target.value)}
                className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleSaveDeadline}
                disabled={isPending}
                className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {isPending ? "..." : "حفظ"}
              </button>
              <button
                type="button"
                onClick={handleCancelDeadline}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground transition-colors hover:bg-background"
              >
                إلغاء
              </button>
            </div>
            {deadlineError && (
              <p className="text-xs text-danger">{deadlineError}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span>{dateFormatter.format(task.deadline)}</span>
            <button
              type="button"
              onClick={() => setIsEditingDeadline(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              تعديل الديدلاين
            </button>
          </div>
        )}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span>{STATUS_LABELS[task.status] ?? task.status}</span>
          {task.isOverdue && (
            <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs text-white">
              متأخرة
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5">
        {task.isOverdue && (
          <div className="flex flex-col gap-2">
            {task.hasOpenComplaint ? (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                تم رفع شكوى لهذه المهمة
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsComplaintOpen((open) => !open)}
                  className="w-fit text-xs font-medium text-primary hover:underline"
                >
                  {isComplaintOpen ? "إغلاق" : "رفع شكوى لـ HR"}
                </button>
                {isComplaintOpen && (
                  <form
                    action={complaintAction}
                    className="flex flex-col gap-2"
                  >
                    <input type="hidden" name="taskId" value={task.id} />
                    <textarea
                      name="reason"
                      required
                      rows={2}
                      placeholder="سبب الشكوى"
                      className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
                    />
                    {complaintState.error && (
                      <p className="text-xs text-danger">
                        {complaintState.error}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={isComplaintPending}
                      className="w-fit rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      {isComplaintPending ? "جارٍ الإرسال..." : "إرسال الشكوى"}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
