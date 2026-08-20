import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-noise px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-glow">
        <WifiOff className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">You&apos;re offline</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Office Time Tracker needs a connection to load your attendance data. Reconnect
          and reopen the app to continue.
        </p>
      </div>
    </div>
  );
}
