export default function Home() {
  return (
          <main className="flex min-h-screen flex-col items-center justify-center p-8">
            <div className="max-w-2xl text-center space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">NextUp</h1>
              <p className="text-lg text-neutral-600 dark:text-neutral-400">
                Personal Productivity and Planning Application Monorepo
              </p>
              <div className="pt-4 flex items-center justify-center gap-3">
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300">
                  Next.js App Router (TypeScript)
                </span>
                <span className="inline-flex items-center rounded-md bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300">
                  Django REST Framework API
                </span>
              </div>
    </div>
    </main >
  );
}
