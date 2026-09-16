import type { Role } from "@/generated/prisma/client";
import type { DefaultSession } from "@auth/core/types";

declare module "@auth/core/types" {
  interface User {
    role: Role;
    employeeId: string | null;
  }

  interface Session {
    user: {
      role: Role;
      employeeId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    employeeId: string | null;
  }
}
