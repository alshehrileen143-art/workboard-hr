import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CreateTaskForm } from "@/components/create-task-form";
import { ManagerTaskRow } from "@/components/manager-task-row";
import { TaskStatCards } from "@/components/task-stat-cards";
import { TaskStatusPieChart } from "@/components/task-status-pie-chart";
import { isTaskOverdue, bucketizeTasks } from "@/lib/tasks";
import { ComplaintStatus } from "@/generated/prisma/client";
import { LeaveRequestDecision } from "@/components/leave-request-decision";
import { decideManagerLeaveRequest } from "@/app/(app)/manager/actions";
import { TeamCalendar } from "@/components/team-calendar";
import {
  daysBetweenInclusive,
  employeesOnLeaveForDate,
  isStalePendingRequest,
  LEAVE_TYPE_LABELS,
  DATE_RANGE_LEAVE_TYPES,
  STALE_PENDING_THRESHOLD_DAYS,
} from "@/lib/leave";
import { startOfTodayUTC } from "@/lib/attendance";

const dateFormatter = new Intl.DateTimeFormat("ar", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export default async function ManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ calYear?: string; calMonth?: string }>;
}) {
  const session = await auth();

  if (session?.user?.role !== "MANAGER") {
    redirect("/dashboard");
  }

  const managerId = session.user.employeeId;

  const directReports = managerId
    ? await prisma.employee.findMany({
        where: { managerId },
        orderBy: { fullName: "asc" },
      })
    : [];

  const tasks = managerId
    ? await prisma.task.findMany({
        where: { managerId },
        include: { employee: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const openComplaints = tasks.length
    ? await prisma.complaintToHR.findMany({
        where: {
          taskId: { in: tasks.map((task) => task.id) },
          status: ComplaintStatus.OPEN,
        },
        select: { taskId: true },
      })
    : [];
  const taskIdsWithOpenComplaint = new Set(
    openComplaints.map((complaint) => complaint.taskId),
  );

  const buckets = bucketizeTasks(tasks);

  const pendingLeaveRequests = managerId
    ? await prisma.leaveRequest.findMany({
        where: {
          employee: { managerId },
          managerStatus: "PENDING",
        },
        include: { employee: { select: { fullName: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const approvedTeamLeaveRequests = managerId
    ? await prisma.leaveRequest.findMany({
        where: {
          employee: { managerId },
          managerStatus: "APPROVED",
          hrStatus: "APPROVED",
          type: { in: [...DATE_RANGE_LEAVE_TYPES] },
        },
        include: { employee: { select: { fullName: true } } },
      })
    : [];

  const today = startOfTodayUTC();
  const employeesOnLeaveToday = employeesOnLeaveForDate(
    today,
    approvedTeamLeaveRequests,
  );

  const staleLeaveRequestCount = pendingLeaveRequests.filter((request) =>
    isStalePendingRequest(request.createdAt),
  ).length;

  const params = await searchParams;
  const now = new Date();
  const calYear = params.calYear ? Number(params.calYear) : now.getUTCFullYear();
  const calMonth = params.calMonth ? Number(params.calMonth) : now.getUTCMonth() + 1;

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold text-primary">فريقي</h1>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium text-muted">الاسم</th>
              <th className="px-4 py-3 font-medium text-muted">البريد الإلكتروني</th>
              <th className="px-4 py-3 font-medium text-muted">المسمى الوظيفي</th>
              <th className="px-4 py-3 font-medium text-muted">القسم</th>
            </tr>
          </thead>
          <tbody>
            {directReports.map((employee) => (
              <tr key={employee.id} className="border-b border-border/60 even:bg-stripe">
                <td className="px-4 py-2.5">{employee.fullName}</td>
                <td className="px-4 py-2.5">{employee.email}</td>
                <td className="px-4 py-2.5">{employee.jobTitle}</td>
                <td className="px-4 py-2.5">{employee.department}</td>
              </tr>
            ))}
            {directReports.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted">
                  لا يوجد موظفون تحت إدارتك حاليًا
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-primary">مهام موظفيّ</h2>

        <TaskStatCards
          total={tasks.length}
          done={buckets.done}
          inProgress={buckets.inProgress}
          overdue={buckets.overdue}
        />

        <TaskStatusPieChart buckets={buckets} />

        <CreateTaskForm employees={directReports} />

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-medium text-muted">الموظف</th>
                <th className="px-4 py-3 font-medium text-muted">العنوان</th>
                <th className="px-4 py-3 font-medium text-muted">الديدلاين</th>
                <th className="px-4 py-3 font-medium text-muted">الحالة</th>
                <th className="px-4 py-3 font-medium text-muted">شكوى لـ HR</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <ManagerTaskRow
                  key={task.id}
                  task={{
                    id: task.id,
                    employeeName: task.employee.fullName,
                    title: task.title,
                    deadline: task.deadline,
                    status: task.status,
                    isOverdue: isTaskOverdue(task.status, task.deadline),
                    hasOpenComplaint: taskIdsWithOpenComplaint.has(task.id),
                  }}
                />
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted">
                    لا توجد مهام بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-primary">طلبات بانتظار موافقتي</h2>

        {staleLeaveRequestCount > 0 && (
          <p className="w-fit rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            لديك {staleLeaveRequestCount}{" "}
            {staleLeaveRequestCount === 1 ? "طلب" : "طلبات"} بانتظار الرد منذ
            أكثر من {STALE_PENDING_THRESHOLD_DAYS} أيام
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-medium text-muted">الموظف</th>
                <th className="px-4 py-3 font-medium text-muted">النوع</th>
                <th className="px-4 py-3 font-medium text-muted">التفاصيل</th>
                <th className="px-4 py-3 font-medium text-muted">السبب</th>
                <th className="px-4 py-3 font-medium text-muted">القرار</th>
              </tr>
            </thead>
            <tbody>
              {pendingLeaveRequests.map((request) => (
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
                  <td className="px-4 py-2.5">
                    <LeaveRequestDecision
                      requestId={request.id}
                      onDecide={decideManagerLeaveRequest}
                    />
                  </td>
                </tr>
              ))}
              {pendingLeaveRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted">
                    لا توجد طلبات بانتظار موافقتك
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-primary">تقويم الفريق</h2>

        {employeesOnLeaveToday.length > 0 ? (
          <p className="text-sm">
            <span className="font-medium">
              {employeesOnLeaveToday.length} من موظفيك في إجازة اليوم:
            </span>{" "}
            {employeesOnLeaveToday.join("، ")}
          </p>
        ) : (
          <p className="text-sm text-muted">
            لا يوجد من موظفيك في إجازة اليوم
          </p>
        )}

        <TeamCalendar
          year={calYear}
          month={calMonth}
          requests={approvedTeamLeaveRequests}
          basePath="/manager"
        />
      </section>
    </main>
  );
}
