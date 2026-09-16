import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

function defaultLandingPath(role: string | undefined): string {
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

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.employeeId = user.employeeId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role;
        session.user.employeeId = token.employeeId;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;

      if (pathname === "/login") {
        if (isLoggedIn) {
          return NextResponse.redirect(
            new URL(defaultLandingPath(role), request.nextUrl),
          );
        }
        return true;
      }

      if (!isLoggedIn) {
        return false;
      }

      if (pathname.startsWith("/hr") && role !== "HR") {
        return NextResponse.redirect(
          new URL(defaultLandingPath(role), request.nextUrl),
        );
      }

      if (pathname.startsWith("/my-profile") && role !== "EMPLOYEE") {
        return NextResponse.redirect(
          new URL(defaultLandingPath(role), request.nextUrl),
        );
      }

      if (pathname.startsWith("/manager") && role !== "MANAGER") {
        return NextResponse.redirect(
          new URL(defaultLandingPath(role), request.nextUrl),
        );
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
