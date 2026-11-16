import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NextUp | Personal Planner",
  description: "Production-ready personal productivity and planning application",
};

  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
        <html lang="en">
          <body className="antialiased min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
            {children}
          </body>
        </html>
        );
}
