"use client";

/**
 * Minimal protected dashboard placeholder.
 * Allows session inspection, verification, and logout.
 */

import { ProtectedRoute } from "@/features/auth/components";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useRouter } from "next/navigation";

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6 md:p-12">
      <header className="max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold">NextUP Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Secure Owner Workspace
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </header>

      <main className="max-w-4xl mx-auto mt-8 space-y-6">
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Owner Profile</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400 font-medium">User ID (UUID)</dt>
              <dd className="font-mono mt-0.5 text-zinc-800 dark:text-zinc-200">{user?.id}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400 font-medium">Username</dt>
              <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">{user?.username}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400 font-medium">Email Address</dt>
              <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400 font-medium">Authentication State</dt>
              <dd className="mt-0.5 inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Active Session
              </dd>
            </div>
          </dl>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Workspace Status</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Authentication system verified. Task and calendar domains will be introduced in subsequent milestones.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
