import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";

/** On the dashboard while a new account still uses the default schedule (it skipped setup). */
export function FinishSetupCard() {
  return (
    <Link
      href="/welcome"
      className="group flex items-center gap-3 rounded-2xl border border-brand-600/30 bg-brand-600/[0.07] p-3 pr-4 transition-colors hover:bg-brand-600/[0.1]"
    >
      <span className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-glow">
        <CalendarClock className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Set up your workday</span>
        <span className="block text-xs text-muted-foreground">
          Your balance uses a default schedule until you choose your own days and hours.
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
