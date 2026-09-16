import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AddAttendanceForm } from "@/components/add-attendance-form";
import { ImportAttendanceForm } from "@/components/import-attendance-form";
import { AttendanceRow } from "@/components/attendance-row";
import { startOfTodayUTC, parseDateOnly, toDateInputValue } from "@/lib/attendance";

type SearchParams = {
  employeeId?: string;
  from?: string;
  to?: string;
};

export default async function HrAttendancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (session?.user?.role !== "HR") {
    redirect("/my-profile");
  }

  const params = await searchParams;

  const today = startOfTodayUTC();
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);

  const from = (params.from && parseDateOnly(params.from)) || defaultFrom;
  const to = (params.to && parseDateOnly(params.to)) || today;
  const employeeId = params.employeeId?.trim() || "";

  const [employees, records] = await Promise.all([
    prisma.employee.findMany({ orderBy: { fullName: "asc" } }),
    prisma.attendance.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        date: { gte: from, lte: to },
      },
      include: { employee: true },
      orderBy: [{ date: "desc" }, { employee: { fullName: "asc" } }],
    }),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-primary">الحضور والانصراف</h1>
        <Link href="/hr" className="w-fit text-sm font-medium text-primary hover:underline">
          الرجوع لقائمة الموظفين
        </Link>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="employeeId" className="text-sm font-medium">
            الموظف
          </label>
          <select
            id="employeeId"
            name="employeeId"
            defaultValue={employeeId}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
          >
            <option value="">كل الموظفين</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-sm font-medium">
            من تاريخ
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={toDateInputValue(from)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-sm font-medium">
            إلى تاريخ
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={toDateInputValue(to)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
        >
          تصفية
        </button>
      </form>

      <div className="flex flex-wrap items-start gap-4">
        <AddAttendanceForm employees={employees} />
        <ImportAttendanceForm />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium text-muted">الاسم</th>
              <th className="px-4 py-3 font-medium text-muted">التاريخ</th>
              <th className="px-4 py-3 font-medium text-muted">وقت الحضور</th>
              <th className="px-4 py-3 font-medium text-muted">وقت الانصراف</th>
              <th className="px-4 py-3 font-medium text-muted">مصدر التسجيل</th>
              <th className="px-4 py-3 font-medium text-muted">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <AttendanceRow key={record.id} record={record} />
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted">
                  لا توجد سجلات ضمن هذا الفلتر
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
