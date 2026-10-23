"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/actions/settings";
import { Label, FieldError } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction] = useActionState(changePasswordAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.success && (
        <Alert variant="success">Password saved. You&apos;ve been signed out on your other devices.</Alert>
      )}
      {!hasPassword && !state?.success && (
        <p className="text-sm text-muted-foreground">
          You sign in with Google. Set a password to also log in with your email address.
        </p>
      )}

      {hasPassword && (
        <div>
          <Label htmlFor="currentPassword">Current password</Label>
          <PasswordInput
            id="currentPassword"
            name="currentPassword"
            autoComplete="current-password"
            required
          />
          <FieldError>{state?.fieldErrors?.currentPassword}</FieldError>
        </div>
      )}

      <div>
        <Label htmlFor="newPassword">New password</Label>
        <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" required />
        <FieldError>{state?.fieldErrors?.newPassword}</FieldError>
      </div>

      <div>
        <Label htmlFor="confirmNewPassword">Confirm new password</Label>
        <PasswordInput
          id="confirmNewPassword"
          name="confirmNewPassword"
          autoComplete="new-password"
          required
        />
        <FieldError>{state?.fieldErrors?.confirmNewPassword}</FieldError>
      </div>

      <SubmitButton pendingLabel="Saving…">
        {hasPassword ? "Change password" : "Set password"}
      </SubmitButton>
    </form>
  );
}
