import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

type NavLink = { href: string; label: string };

function getNavLinks(role: string | undefined): NavLink[] {
  switch (role) {
    case "HR":
      return [
        { href: "/dashboard", label: "الرئيسية" },
        { href: "/hr", label: "لوحتي" },
        { href: "/hr/attendance", label: "الحضور والانصراف" },
        { href: "/hr/complaints", label: "الشكاوى" },
        { href: "/hr/leave-requests", label: "الإجازات" },
        { href: "/ask-labor-law", label: "اسأل عن نظام العمل" },
      ];
    case "MANAGER":
      return [
        { href: "/manager", label: "فريقي" },
        { href: "/ask-labor-law", label: "اسأل عن نظام العمل" },
      ];
    case "EMPLOYEE":
      return [
        { href: "/my-profile", label: "بياناتي" },
        { href: "/ask-labor-law", label: "اسأل عن نظام العمل" },
      ];
    default:
      return [];
  }
}

function getHomeHref(role: string | undefined): string {
  switch (role) {
    case "HR":
      return "/dashboard";
    case "MANAGER":
      return "/manager";
    case "EMPLOYEE":
      return "/my-profile";
    default:
      return "/login";
  }
}

export async function AppNav() {
  const session = await auth();
  const role = session?.user?.role;
  const links = getNavLinks(role);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-1 sm:gap-4">
          <Link
            href={getHomeHref(role)}
            className="ml-1 text-base font-semibold text-primary sm:ml-0"
          >
            نظام الموارد البشرية
          </Link>
          {links.length > 0 && (
            <nav className="flex flex-wrap items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-background hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
