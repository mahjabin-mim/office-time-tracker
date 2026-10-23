"use client";

import { useActionState, useState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { disconnectGoogleAction, logoutAllDevicesAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/Button";
import { GoogleIcon } from "@/components/auth/GoogleButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/cn";

export function SignInMethods({
  email,
  hasPassword,
  googleConnected,
}: {
  email: string;
  hasPassword: boolean;
  googleConnected: boolean;
}) {
  const [state, formAction] = useActionState(disconnectGoogleAction, null);

  return (
    <div className="space-y-3">
      {state?.error && <Alert>{state.error}</Alert>}

      <MethodRow
        icon={<KeyRound className="h-4 w-4 text-muted-foreground" />}
        title="Email & password"
        detail={hasPassword ? email : "Not set — add one in the Password section"}
        connected={hasPassword}
      />

      <MethodRow
        icon={<GoogleIcon className="h-4 w-4" />}
        title="Google"
        detail={googleConnected ? "Connected" : "Sign in with one click"}
        connected={googleConnected}
        action={
          googleConnected ? (
            <form action={formAction}>
              <SubmitButton variant="outline" size="sm" pendingLabel="Disconnecting…">
                Disconnect
              </SubmitButton>
            </form>
          ) : (
            <a
              href="/api/auth/google"
              className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Connect
            </a>
          )
        }
      />

      <LogoutEverywhere />
    </div>
  );
}

function LogoutEverywhere() {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mt-2 rounded-xl border border-border px-3.5 py-3">
      <p className="text-sm font-medium">Signed in somewhere you don&apos;t recognise?</p>
      <p className="text-xs text-muted-foreground">
        Log out on every phone, tablet, and computer, including this one.
      </p>
      {confirming ? (
        <form action={logoutAllDevicesAction} className="mt-3 flex flex-wrap items-center gap-2">
          <SubmitButton variant="danger" size="sm" pendingLabel="Logging out…">
            <LogOut className="h-3.5 w-3.5" />
            Yes, log out everywhere
          </SubmitButton>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setConfirming(true)}
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out of all devices
        </Button>
      )}
    </div>
  );
}

function MethodRow({
  icon,
  title,
  detail,
  connected,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  connected: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          {title}
          <span
            className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-extra" : "bg-muted-foreground/40")}
          />
        </p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      {action}
    </div>
  );
}
