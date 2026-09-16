import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AddEmployeeForm } from "@/components/add-employee-form";
import { ImportEmployeesForm } from "@/components/import-employees-form";
import { EmployeeRow } from "@/components/employee-row";
import {
  ManagerTasksBarChart,
  type ManagerTaskBarDatum,
} from "@/components/manager-tasks-bar-chart";
import { isTaskOverdue } from "@/lib/tasks";
import { isIqamaExpiringSoon } from "@/lib/employee";

export default async function HrPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await auth();

  if (session?.user?.role !== "HR") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const showArchived = params.view === "archived";

  const employees = await prisma.employee.findMany({
    where: { status: showArchived ? "ARCHIVED" : "ACTIVE" },
    orderBy: { fullName: "asc" },
    include: {
      user: { select: { role: true } },
      manager: { select: { fullName: true } },
      _count: { select: { directReports: true } },
    },
  });

  const managers = await prisma.employee.findMany({
    where: { user: { role: "MANAGER" }, status: "ACTIVE" },
    orderBy: { fullName: "asc" },
  });

  const allTasks = await prisma.task.findMany({
    include: {
      employee: { select: { id: true, fullName: true } },
    },
  });

  const managerTaskStats = new Map<string, ManagerTaskBarDatum>(
    managers.map((manager) => [
      manager.id,
      { managerName: manager.fullName, done: 0, overdue: 0 },
    ]),
  );
  const employeeOverdueCounts = new Map<
    string,
    { employeeName: string; count: number }
  >();

  for (const task of allTasks) {
    const overdue = isTaskOverdue(task.status, task.deadline);

    const managerStat = managerTaskStats.get(task.managerId);
    if (managerStat) {
      if (task.status === "DONE") managerStat.done += 1;
      if (overdue) managerStat.overdue += 1;
    }

    if (overdue) {
      const existing = employeeOverdueCounts.get(task.employeeId) ?? {
        employeeName: task.employee.fullName,
        count: 0,
      };
      existing.count += 1;
      employeeOverdueCounts.set(task.employeeId, existing);
    }
  }

  const managerBarChartData = Array.from(managerTaskStats.values());
  const topOverdueEmployees = Array.from(employeeOverdueCounts.entries())
    .map(([employeeId, entry]) => ({ employeeId, ...entry }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold text-primary">الموظفون (HR فقط)</h1>

      <div className="flex flex-wrap items-start gap-4">
        <AddEmployeeForm managers={managers} />
        <ImportEmployeesForm />
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-border bg-surface p-1 shadow-sm">
        <Link
          href="/hr"
          className={
            !showArchived
              ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              : "rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-background"
          }
        >
          الموظفون النشطون
        </Link>
        <Link
          href="/hr?view=archived"
          className={
            showArchived
              ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              : "rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-background"
          }
        >
          الموظفون السابقون
        </Link>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-primary">نظرة عامة على المهام</h2>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <ManagerTasksBarChart data={managerBarChartData} />
          </div>

          <div className="flex w-full flex-col gap-2 lg:w-72">
            <h3 className="text-sm font-medium text-foreground">
              أكثر 5 موظفين لديهم مهام متأخرة
            </h3>
            {topOverdueEmployees.length === 0 ? (
              <p className="text-sm text-muted">
                لا يوجد موظفون لديهم مهام متأخرة
              </p>
            ) : (
              <ol className="flex flex-col gap-1 text-sm">
                {topOverdueEmployees.map((entry, index) => (
                  <li
                    key={entry.employeeId}
                    className="flex items-center justify-between border-b border-border/60 py-1"
                  >
                    <span>
                      {index + 1}. {entry.employeeName}
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      {entry.count}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium text-muted">الاسم</th>
              <th className="px-4 py-3 font-medium text-muted">البريد الإلكتروني</th>
              <th className="px-4 py-3 font-medium text-muted">المسمى الوظيفي</th>
              <th className="px-4 py-3 font-medium text-muted">القسم</th>
              <th className="px-4 py-3 font-medium text-muted">تاريخ التوظيف</th>
              <th className="px-4 py-3 font-medium text-muted">رصيد الإجازة</th>
              <th className="px-4 py-3 font-medium text-muted">الدور</th>
              <th className="px-4 py-3 font-medium text-muted">المدير المباشر</th>
              <th className="px-4 py-3 font-medium text-muted">الحالة</th>
              <th className="px-4 py-3 font-medium text-muted">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={{
                  id: employee.id,
                  fullName: employee.fullName,
                  email: employee.email,
                  jobTitle: employee.jobTitle,
                  department: employee.department,
                  hireDate: employee.hireDate,
                  role: employee.user?.role ?? null,
                  managerId: employee.managerId,
                  managerName: employee.manager?.fullName ?? null,
                  directReportsCount: employee._count.directReports,
                  annualLeaveBalance: employee.annualLeaveBalance,
                  leaveBalanceNote: employee.leaveBalanceNote,
                  status: employee.status,
                  nationalId: employee.nationalId,
                  iqamaExpiryDate: employee.iqamaExpiryDate,
                  phoneNumber: employee.phoneNumber,
                  emergencyContactName: employee.emergencyContactName,
                  emergencyContactPhone: employee.emergencyContactPhone,
                  iqamaExpiringSoon: isIqamaExpiringSoon(
                    employee.iqamaExpiryDate,
                  ),
                }}
                managers={managers}
              />
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-muted">
                  {showArchived ? "لا يوجد موظفون سابقون" : "لا يوجد موظفون بعد"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
