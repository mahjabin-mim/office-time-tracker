"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "@/lib/actions/password-reset";
import { Label, FieldError } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && (
        <Alert>
          {state.error}{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            Request a new link
          </Link>
        </Alert>
      )}

      <div>
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          name="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          autoFocus
        />
        <FieldError>{state?.fieldErrors?.password}</FieldError>
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          placeholder="Repeat password"
          autoComplete="new-password"
          required
        />
        <FieldError>{state?.fieldErrors?.confirmPassword}</FieldError>
      </div>

      <SubmitButton size="lg" className="w-full" pendingLabel="Saving…">
        Set new password
      </SubmitButton>
    </form>
  );
}
