import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-medium text-muted">نظام الموارد البشرية</span>
        <h1 className="text-xl font-semibold text-primary">تسجيل الدخول</h1>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
