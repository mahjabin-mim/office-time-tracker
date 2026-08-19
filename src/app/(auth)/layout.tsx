import { Clock3 } from "lucide-react";
import { AuthBackground } from "@/components/auth/AuthBackground";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-noise px-4 py-10">
      <AuthBackground />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 animate-glow-pulse items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Clock3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">Office Time Tracker</p>
            <p className="text-sm text-muted-foreground">Your personal working-hours balance</p>
          </div>
        </div>
        <div className="animate-fade-up rounded-3xl border border-border bg-card/90 p-7 shadow-soft backdrop-blur-sm sm:p-9">
          {children}
        </div>
      </div>
    </div>
  );
}
