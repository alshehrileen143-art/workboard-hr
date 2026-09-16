import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LeaveRequestDecision } from "@/components/leave-request-decision";
import { decideHrLeaveRequest } from "@/app/(app)/hr/leave-requests/actions";
import {
  daysBetweenInclusive,
  isStalePendingRequest,
  LEAVE_TYPE_LABELS,
  STALE_PENDING_THRESHOLD_DAYS,
} from "@/lib/leave";

const dateFormatter = new Intl.DateTimeFormat("ar", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export default async function HrLeaveRequestsPage() {
  const session = await auth();

  if (session?.user?.role !== "HR") {
    redirect("/dashboard");
  }

  const requests = await prisma.leaveRequest.findMany({
    where: { managerStatus: "APPROVED", hrStatus: "PENDING" },
    include: {
      employee: { select: { fullName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const staleRequestCount = requests.filter((request) =>
    isStalePendingRequest(request.createdAt),
  ).length;

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-primary">طلبات الإجازات</h1>
        <Link href="/hr" className="w-fit text-sm font-medium text-primary hover:underline">
          الرجوع لقائمة الموظفين
        </Link>
      </div>

      {staleRequestCount > 0 && (
        <p className="w-fit rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300">
          لديك {staleRequestCount} {staleRequestCount === 1 ? "طلب" : "طلبات"}{" "}
          بانتظار الرد منذ أكثر من {STALE_PENDING_THRESHOLD_DAYS} أيام
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium text-muted">الموظف</th>
              <th className="px-4 py-3 font-medium text-muted">النوع</th>
              <th className="px-4 py-3 font-medium text-muted">التفاصيل</th>
              <th className="px-4 py-3 font-medium text-muted">السبب</th>
              <th className="px-4 py-3 font-medium text-muted">ملاحظة المدير</th>
              <th className="px-4 py-3 font-medium text-muted">القرار</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr
                key={request.id}
                className={
                  isStalePendingRequest(request.createdAt)
                    ? "border-b border-amber-500/30 bg-amber-500/10"
                    : "border-b border-border/60 even:bg-stripe"
                }
              >
                <td className="px-4 py-2.5">{request.employee.fullName}</td>
                <td className="px-4 py-2.5">
                  {LEAVE_TYPE_LABELS[request.type] ?? request.type}
                </td>
                <td className="px-4 py-2.5">
                  {request.startDate && request.endDate
                    ? `${dateFormatter.format(request.startDate)} - ${dateFormatter.format(request.endDate)} (${daysBetweenInclusive(request.startDate, request.endDate)} يوم)`
                    : request.requestDate
                      ? `${dateFormatter.format(request.requestDate)} (${request.hours} ساعة)`
                      : "-"}
                </td>
                <td className="max-w-xs px-4 py-2.5">{request.reason}</td>
                <td className="max-w-xs px-4 py-2.5">{request.managerNote ?? "-"}</td>
                <td className="px-4 py-2.5">
                  <LeaveRequestDecision
                    requestId={request.id}
                    onDecide={decideHrLeaveRequest}
                  />
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted">
                  لا توجد طلبات بانتظار قرارك حاليًا
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
