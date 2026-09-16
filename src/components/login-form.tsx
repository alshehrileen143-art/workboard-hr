"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          البريد الإلكتروني
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          كلمة المرور
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none"
      >
        {isSubmitting ? "جارٍ الدخول..." : "تسجيل الدخول"}
      </button>
    </form>
  );
}
