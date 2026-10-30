import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock3 } from "lucide-react";
import { requireCurrentUser, userNeedsSetup } from "@/lib/data";
import { getVapidPublicKey } from "@/lib/push";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { WorkdaySetup } from "@/components/setup/WorkdaySetup";

export const metadata: Metadata = { title: "Set up your workday" };

export default async function WelcomePage() {
  const user = await requireCurrentUser();
  if (!(await userNeedsSetup(user.id))) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-noise px-4 py-10">
      <AuthBackground />

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="bg-brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-glow">
            <Clock3 className="h-5 w-5" />
          </div>
          <p className="font-semibold tracking-tight">Office Time Tracker</p>
        </div>
        <div className="animate-fade-up rounded-3xl border border-border bg-card/90 p-6 shadow-soft backdrop-blur-sm sm:p-8">
          <WorkdaySetup
            firstName={user.name.trim().split(/\s+/)[0]}
            vapidPublicKey={getVapidPublicKey()}
            savedReminders={{
              remindClockIn: user.remindClockIn,
              remindLeave: user.remindLeave,
              remindClockOut: user.remindClockOut,
            }}
          />
        </div>
      </div>
    </div>
  );
}
