import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SectionCard = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const SECTION_CARDS: SectionCard[] = [
  {
    href: "/hr",
    title: "إدارة الموظفين",
    description: "عرض وإضافة وتعديل بيانات الموظفين",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M17 20a5 5 0 0 0-10 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 20a5 5 0 0 0-3.5-4.77M16.5 3.29a4 4 0 0 1 0 7.42"
      />
    ),
  },
  {
    href: "/hr/attendance",
    title: "الحضور والانصراف",
    description: "متابعة وتعديل سجلات الحضور",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    ),
  },
  {
    href: "/hr/complaints",
    title: "الشكاوى",
    description: "مراجعة وحل شكاوى الموظفين",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 9v4m0 4h.01M4.93 4.93 19.07 19.07M12 3a9 9 0 1 0 9 9c0-1.5-.4-2.9-1.1-4.1"
      />
    ),
  },
  {
    href: "/hr/leave-requests",
    title: "طلبات الإجازات",
    description: "الموافقة أو الرفض النهائي لطلبات الإجازة",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M8 2v4M16 2v4M3.5 9h17M4.5 6h15A1.5 1.5 0 0 1 21 7.5v12A1.5 1.5 0 0 1 19.5 21h-15A1.5 1.5 0 0 1 3 19.5v-12A1.5 1.5 0 0 1 4.5 6Z"
      />
    ),
  },
  {
    href: "/ask-labor-law",
    title: "اسأل عن نظام العمل",
    description: "إجابات فورية عن أسئلة نظام العمل",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M21 12c0 4.14-4.03 7.5-9 7.5-1.06 0-2.08-.15-3.02-.43L3 20.5l1.2-3.6C3.44 15.62 3 13.87 3 12c0-4.14 4.03-7.5 9-7.5s9 3.36 9 7.5Z"
      />
    ),
  },
];

function StatIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-6 w-6 text-primary"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export default async function DashboardPage() {
  const session = await auth();

  if (session?.user?.role === "EMPLOYEE") {
    redirect("/my-profile");
  }

  if (session?.user?.role === "MANAGER") {
    redirect("/manager");
  }

  if (session?.user?.role !== "HR") {
    redirect("/login");
  }

  const [employeeCount, pendingLeaveCount, openComplaintCount] = await Promise.all([
    prisma.employee.count(),
    prisma.leaveRequest.count({ where: { managerStatus: "APPROVED", hrStatus: "PENDING" } }),
    prisma.complaintToHR.count({ where: { status: "OPEN" } }),
  ]);

  const stats = [
    { href: "/hr", label: "عدد الموظفين", value: employeeCount },
    { href: "/hr/leave-requests", label: "طلبات إجازة معلّقة", value: pendingLeaveCount },
    { href: "/hr/complaints", label: "شكاوى مفتوحة", value: openComplaintCount },
  ];

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-primary">لوحة التحكم</h1>
        <p className="text-sm text-muted">مرحبًا، إليك نظرة سريعة على النظام</p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.href}
            href={stat.href}
            className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 shadow-sm transition-colors hover:bg-background sm:p-5"
          >
            <span className="text-sm font-medium text-muted">{stat.label}</span>
            <span className="text-3xl font-semibold text-primary">{stat.value}</span>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTION_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:bg-background"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10">
              <StatIcon>{card.icon}</StatIcon>
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-foreground">{card.title}</span>
              <span className="text-sm text-muted">{card.description}</span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
