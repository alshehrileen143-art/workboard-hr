export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export function computeFinalLeaveStatus(
  managerStatus: ApprovalStatus,
  hrStatus: ApprovalStatus,
): ApprovalStatus {
  if (managerStatus === "REJECTED" || hrStatus === "REJECTED") {
    return "REJECTED";
  }
  if (managerStatus === "APPROVED" && hrStatus === "APPROVED") {
    return "APPROVED";
  }
  return "PENDING";
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Inclusive of both endpoints: Jan 1 -> Jan 3 is 3 days off.
export function daysBetweenInclusive(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

export const DATE_RANGE_LEAVE_TYPES = [
  "ANNUAL",
  "SICK",
  "EMERGENCY",
  "UNAUTHORIZED_ABSENCE",
] as const;

export function isDateRangeLeaveType(type: string): boolean {
  return (DATE_RANGE_LEAVE_TYPES as readonly string[]).includes(type);
}

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "إجازة سنوية",
  SICK: "إجازة مرضية",
  EMERGENCY: "إجازة طارئة",
  PERMISSION: "استئذان بساعات",
  UNAUTHORIZED_ABSENCE: "غياب بدون إذن",
};

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد الانتظار",
  APPROVED: "موافَق عليه",
  REJECTED: "مرفوض",
};

export type ApprovedLeaveRequest = {
  startDate: Date | null;
  endDate: Date | null;
  employee: { fullName: string };
};

// `date` and the requests' startDate/endDate are all UTC-midnight day markers
// (consistent with the rest of the app's @db.Date fields), so a plain
// timestamp comparison correctly checks day-inclusive coverage.
export function employeesOnLeaveForDate(
  date: Date,
  requests: ApprovedLeaveRequest[],
): string[] {
  const names: string[] = [];
  for (const request of requests) {
    if (
      request.startDate &&
      request.endDate &&
      date.getTime() >= request.startDate.getTime() &&
      date.getTime() <= request.endDate.getTime()
    ) {
      names.push(request.employee.fullName);
    }
  }
  return names;
}

export const STALE_PENDING_THRESHOLD_DAYS = 3;

// createdAt is a real timestamp (not a day-only marker), so this checks
// actual elapsed time rather than calendar-day boundaries.
export function isStalePendingRequest(
  createdAt: Date,
  thresholdDays: number = STALE_PENDING_THRESHOLD_DAYS,
): boolean {
  return Date.now() - createdAt.getTime() > thresholdDays * MS_PER_DAY;
}
