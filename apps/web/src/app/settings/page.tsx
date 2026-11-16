"use client";

import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/hooks/use-auth";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-50">
          Workspace Settings
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Owner profile and NextUP workspace preferences.
        </p>
      </div>

      <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Owner Account
        </h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm">
          <div>
            <dt className="text-zinc-400 font-medium">Username</dt>
            <dd className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {user?.username}
            </dd>
          </div>

          <div>
            <dt className="text-zinc-400 font-medium">Email</dt>
            <dd className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {user?.email}
            </dd>
          </div>

          <div>
            <dt className="text-zinc-400 font-medium">Account ID (UUID)</dt>
            <dd className="font-mono text-zinc-600 dark:text-zinc-400 mt-0.5">
              {user?.id}
            </dd>
          </div>

          <div>
            <dt className="text-zinc-400 font-medium">Access Tier</dt>
            <dd className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              Verified Owner
            </dd>
          </div>
        </dl>
      </div>
    </AppShell>
  );
}
