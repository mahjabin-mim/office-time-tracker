"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ForgotPasswordForm({ devMode }: { devMode: boolean }) {
  const [state, formAction] = useActionState(requestPasswordResetAction, null);

  if (state?.sent) {
    return (
      <div className="animate-fade-in-up space-y-3 rounded-2xl border border-extra/30 bg-extra/10 p-5 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-extra/15 text-extra">
          <MailCheck className="h-5 w-5" />
        </div>
        <p className="font-medium">Check your inbox</p>
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, we&apos;ve sent a link to reset your password. It
          expires in an hour.
        </p>
        {devMode && (
          <p className="text-xs text-muted-foreground">
            Email isn&apos;t set up locally, so the link is printed in the dev server&apos;s terminal.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          required
          autoFocus
        />
        <FieldError>{state?.fieldErrors?.email}</FieldError>
      </div>
      <SubmitButton size="lg" className="w-full" pendingLabel="Sending link…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
