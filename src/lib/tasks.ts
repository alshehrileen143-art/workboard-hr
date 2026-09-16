import { startOfTodayUTC } from "./attendance";

export function isTaskOverdue(status: string, deadline: Date): boolean {
  return status !== "DONE" && deadline.getTime() < startOfTodayUTC().getTime();
}

export type TaskStatusBuckets = {
  pending: number;
  inProgress: number;
  done: number;
  overdue: number;
};

// Four mutually-exclusive buckets that partition every task with no overlap:
// a task counts as "overdue" instead of its raw PENDING/IN_PROGRESS status
// once its deadline has passed, so the buckets always sum to the task total.
export function bucketizeTasks(
  tasks: { status: string; deadline: Date }[],
): TaskStatusBuckets {
  const buckets: TaskStatusBuckets = {
    pending: 0,
    inProgress: 0,
    done: 0,
    overdue: 0,
  };

  for (const task of tasks) {
    if (task.status === "DONE") {
      buckets.done += 1;
    } else if (isTaskOverdue(task.status, task.deadline)) {
      buckets.overdue += 1;
    } else if (task.status === "IN_PROGRESS") {
      buckets.inProgress += 1;
    } else {
      buckets.pending += 1;
    }
  }

  return buckets;
}
