import Link from "next/link";
import {
  employeesOnLeaveForDate,
  type ApprovedLeaveRequest,
} from "@/lib/leave";

const WEEKDAY_LABELS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const monthTitleFormatter = new Intl.DateTimeFormat("ar", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(total / 12),
    month: (((total % 12) + 12) % 12) + 1,
  };
}

export function TeamCalendar({
  year,
  month,
  requests,
  basePath,
}: {
  year: number;
  month: number;
  requests: ApprovedLeaveRequest[];
  basePath: string;
}) {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startWeekday = firstOfMonth.getUTCDay();

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link
          href={`${basePath}?calYear=${prev.year}&calMonth=${prev.month}`}
          className="rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground transition-colors hover:bg-background"
        >
          الشهر السابق
        </Link>
        <h3 className="text-sm font-medium">
          {monthTitleFormatter.format(firstOfMonth)}
        </h3>
        <Link
          href={`${basePath}?calYear=${next.year}&calMonth=${next.month}`}
          className="rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground transition-colors hover:bg-background"
        >
          الشهر التالي
        </Link>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    key={index}
                    className="min-h-[4.5rem] rounded border border-transparent"
                  />
                );
              }
              const date = new Date(Date.UTC(year, month - 1, day));
              const names = employeesOnLeaveForDate(date, requests);
              return (
                <div
                  key={index}
                  className={`flex min-h-[4.5rem] flex-col gap-1 rounded-md border p-1 text-xs ${
                    names.length > 0
                      ? "border-accent/40 bg-accent/5"
                      : "border-border"
                  }`}
                >
                  <span className="font-medium">{day}</span>
                  {names.map((name, nameIndex) => (
                    <span
                      key={`${name}-${nameIndex}`}
                      className="truncate rounded bg-background px-1 py-0.5"
                      title={name}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
