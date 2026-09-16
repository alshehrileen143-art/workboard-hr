import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfTodayUTC } from "@/lib/attendance";
import { AttendanceButtons } from "@/components/attendance-buttons";
import { TaskStatusSelect } from "@/components/task-status-select";
import { TaskStatCards } from "@/components/task-stat-cards";
import { bucketizeTasks } from "@/lib/tasks";
import { CreateLeaveRequestForm } from "@/components/create-leave-request-form";
import {
  computeFinalLeaveStatus,
  daysBetweenInclusive,
  LEAVE_TYPE_LABELS,
  APPROVAL_STATUS_LABELS,
} from "@/lib/leave";

const dateFormatter = new Intl.DateTimeFormat("ar", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat("ar", {
  hour: "2-digit",
  minute: "2-digit",
});

export default async function MyProfilePage() {
  const session = await auth();

  if (session?.user?.role !== "EMPLOYEE") {
    redirect("/dashboard");
  }

  const employee = session.user.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.user.employeeId },
      })
    : null;

  const today = startOfTodayUTC();
  const [recentAttendance, todayAttendance, tasks, leaveRequests] = employee
    ? await Promise.all([
        prisma.attendance.findMany({
          where: { employeeId: employee.id },
          orderBy: { date: "desc" },
          take: 7,
        }),
        prisma.attendance.findUnique({
          where: { employeeId_date: { employeeId: employee.id, date: today } },
        }),
        prisma.task.findMany({
          where: { employeeId: employee.id },
          orderBy: { deadline: "asc" },
        }),
        prisma.leaveRequest.findMany({
          where: { employeeId: employee.id },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], null, [], []];

  const taskBuckets = bucketizeTasks(tasks);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold text-primary">بياناتي</h1>

      {!employee && (
        <p className="text-sm text-muted">
          لا توجد بيانات موظف مرتبطة بحسابك بعد. تواصل مع قسم الموارد
          البشرية.
        </p>
      )}

      {employee && (
        <dl className="grid max-w-md grid-cols-1 gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-2 sm:p-5">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted">الاسم</dt>
            <dd className="text-sm">{employee.fullName}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted">البريد الإلكتروني</dt>
            <dd className="text-sm">{employee.email}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted">المسمى الوظيفي</dt>
            <dd className="text-sm">{employee.jobTitle}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted">القسم</dt>
            <dd className="text-sm">{employee.department}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted">تاريخ التوظيف</dt>
            <dd className="text-sm">
              {dateFormatter.format(employee.hireDate)}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted">رقم الهوية/الإقامة</dt>
            <dd className="text-sm">{employee.nationalId ?? "-"}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted">تاريخ انتهاء الإقامة</dt>
            <dd className="text-sm">
              {employee.iqamaExpiryDate
                ? dateFormatter.format(employee.iqamaExpiryDate)
                : "-"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted">رقم الجوال</dt>
            <dd className="text-sm">{employee.phoneNumber ?? "-"}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted">جهة الاتصال الطارئ</dt>
            <dd className="text-sm">
              {employee.emergencyContactName
                ? `${employee.emergencyContactName}${employee.emergencyContactPhone ? ` - ${employee.emergencyContactPhone}` : ""}`
                : "-"}
            </dd>
          </div>
        </dl>
      )}

      {employee && (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-primary">رصيد الإجازة السنوية</h2>
          {employee.annualLeaveBalance <= 5 && (
            <p className="w-fit rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300">
              رصيدك المتبقي منخفض ({employee.annualLeaveBalance} أيام)
            </p>
          )}
          <div className="flex w-fit flex-col gap-1 rounded-lg border border-border bg-background px-4 py-3">
            <span className="text-xs text-muted">الأيام المتبقية</span>
            <span className="text-3xl font-semibold text-primary">
              {employee.annualLeaveBalance}{" "}
              <span className="text-base font-normal text-muted">يوم</span>
            </span>
          </div>
        </section>
      )}

      {employee && (
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-primary">الحضور والانصراف</h2>

          <AttendanceButtons
            hasCheckedInToday={!!todayAttendance?.checkIn}
            hasCheckedOutToday={!!todayAttendance?.checkOut}
          />

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full max-w-md text-right text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium text-muted">التاريخ</th>
                  <th className="px-4 py-3 font-medium text-muted">وقت الحضور</th>
                  <th className="px-4 py-3 font-medium text-muted">وقت الانصراف</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.map((record) => (
                  <tr key={record.id} className="border-b border-border/60 even:bg-stripe">
                    <td className="px-4 py-2.5">{dateFormatter.format(record.date)}</td>
                    <td className="px-4 py-2.5">
                      {record.checkIn ? timeFormatter.format(record.checkIn) : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      {record.checkOut
                        ? timeFormatter.format(record.checkOut)
                        : "-"}
                    </td>
                  </tr>
                ))}
                {recentAttendance.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted">
                      لا يوجد سجل حضور بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {employee && (
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-primary">مهامي</h2>

          <TaskStatCards
            total={tasks.length}
            done={taskBuckets.done}
            inProgress={taskBuckets.inProgress}
            overdue={taskBuckets.overdue}
            size="small"
          />

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium text-muted">العنوان</th>
                  <th className="px-4 py-3 font-medium text-muted">الوصف</th>
                  <th className="px-4 py-3 font-medium text-muted">الديدلاين</th>
                  <th className="px-4 py-3 font-medium text-muted">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-border/60 even:bg-stripe">
                    <td className="px-4 py-2.5">{task.title}</td>
                    <td className="px-4 py-2.5">{task.description ?? "-"}</td>
                    <td className="px-4 py-2.5">
                      {dateFormatter.format(task.deadline)}
                    </td>
                    <td className="px-4 py-2.5">
                      <TaskStatusSelect taskId={task.id} status={task.status} />
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted">
                      لا توجد مهام بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {employee && (
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-primary">طلباتي</h2>

          <CreateLeaveRequestForm />

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium text-muted">النوع</th>
                  <th className="px-4 py-3 font-medium text-muted">التفاصيل</th>
                  <th className="px-4 py-3 font-medium text-muted">السبب</th>
                  <th className="px-4 py-3 font-medium text-muted">حالة المدير</th>
                  <th className="px-4 py-3 font-medium text-muted">حالة HR</th>
                  <th className="px-4 py-3 font-medium text-muted">الحالة النهائية</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((request) => {
                  const finalStatus = computeFinalLeaveStatus(
                    request.managerStatus,
                    request.hrStatus,
                  );
                  return (
                    <tr key={request.id} className="border-b border-border/60 even:bg-stripe">
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
                        {APPROVAL_STATUS_LABELS[request.managerStatus]}
                      </td>
                      <td className="px-4 py-2.5">
                        {APPROVAL_STATUS_LABELS[request.hrStatus]}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={
                            finalStatus === "APPROVED"
                              ? "font-medium text-accent"
                              : finalStatus === "REJECTED"
                                ? "font-medium text-red-600 dark:text-red-400"
                                : ""
                          }
                        >
                          {APPROVAL_STATUS_LABELS[finalStatus]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {leaveRequests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted">
                      لا توجد طلبات بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
