import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ResolveComplaintButton } from "@/components/resolve-complaint-button";

const dateFormatter = new Intl.DateTimeFormat("ar", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const STATUS_LABELS: Record<string, string> = {
  OPEN: "مفتوحة",
  RESOLVED: "تم الحل",
};

export default async function HrComplaintsPage() {
  const session = await auth();

  if (session?.user?.role !== "HR") {
    redirect("/dashboard");
  }

  const complaints = await prisma.complaintToHR.findMany({
    include: {
      employee: { select: { fullName: true } },
      manager: { select: { fullName: true } },
      task: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-primary">شكاوى للموارد البشرية</h1>
        <Link href="/hr" className="w-fit text-sm font-medium text-primary hover:underline">
          الرجوع لقائمة الموظفين
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium text-muted">الموظف</th>
              <th className="px-4 py-3 font-medium text-muted">المدير</th>
              <th className="px-4 py-3 font-medium text-muted">المهمة</th>
              <th className="px-4 py-3 font-medium text-muted">السبب</th>
              <th className="px-4 py-3 font-medium text-muted">الحالة</th>
              <th className="px-4 py-3 font-medium text-muted">التاريخ</th>
              <th className="px-4 py-3 font-medium text-muted">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((complaint) => (
              <tr key={complaint.id} className="border-b border-border/60 even:bg-stripe">
                <td className="px-4 py-2.5">{complaint.employee.fullName}</td>
                <td className="px-4 py-2.5">{complaint.manager.fullName}</td>
                <td className="px-4 py-2.5">{complaint.task.title}</td>
                <td className="max-w-xs px-4 py-2.5">{complaint.reason}</td>
                <td className="px-4 py-2.5">
                  {STATUS_LABELS[complaint.status] ?? complaint.status}
                </td>
                <td className="px-4 py-2.5">
                  {dateFormatter.format(complaint.createdAt)}
                </td>
                <td className="px-4 py-2.5">
                  {complaint.status === "OPEN" ? (
                    <ResolveComplaintButton complaintId={complaint.id} />
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
            {complaints.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted">
                  لا توجد شكاوى بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
