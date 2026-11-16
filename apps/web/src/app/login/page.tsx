import { LoginForm } from "@/features/auth/components";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | NextUP",
  description: "NextUP Owner Portal Authentication",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <LoginForm />
    </div>
  );
}
