import { requireCurrentUser } from "@/lib/data";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { InstallAppButton } from "@/components/dashboard/InstallAppButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex min-h-screen bg-noise">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <MobileNav />
          <div className="ml-auto flex items-center gap-3">
            <InstallAppButton />
            <ThemeToggle />
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-1.5 py-1 pr-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                {initial}
              </div>
              <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
