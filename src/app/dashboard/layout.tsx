import { redirect } from "next/navigation";
import { Clock3 } from "lucide-react";
import { requireCurrentUser, userNeedsSetup } from "@/lib/data";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { InstallAppButton } from "@/components/dashboard/InstallAppButton";
import { TimezoneSync } from "@/components/dashboard/TimezoneSync";
import { AuroraBackground } from "@/components/ui/AuroraBackground";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  // Nothing can be recorded on a schedule the user didn't choose, so every page waits for setup.
  if (await userNeedsSetup(user.id)) redirect("/welcome");

  return (
    <div className="relative flex min-h-screen">
      <AuroraBackground />
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="bg-brand-gradient flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-glow">
              <Clock3 className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold tracking-tight">Office Time</p>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <InstallAppButton />
            <ThemeToggle />
            <UserMenu name={user.name} email={user.email} />
          </div>
        </header>
        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileTabBar />
      <TimezoneSync current={user.timezone} />
    </div>
  );
}
