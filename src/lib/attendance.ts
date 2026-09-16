export function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY_PATTERN = /^\d{2}:\d{2}$/;

export function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Times are combined and later displayed using the server's local timezone
// (no explicit `timeZone` on the display formatters), so this deliberately
// uses the local `Date` constructor rather than a UTC ("Z") timestamp -- if
// it didn't, a manually-entered "08:00" would round-trip and display as a
// different hour once formatted.
export function combineDateAndTime(date: Date, time: string): Date | null {
  if (!TIME_ONLY_PATTERN.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hours,
    minutes,
  );
  return Number.isNaN(combined.getTime()) ? null : combined;
}

export function toTimeInputValue(date: Date | null): string {
  if (!date) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
