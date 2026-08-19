"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/actions/settings";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function PasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.success && <Alert variant="success">Password changed successfully.</Alert>}

      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required />
        <FieldError>{state?.fieldErrors?.currentPassword}</FieldError>
      </div>

      <div>
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" required />
        <FieldError>{state?.fieldErrors?.newPassword}</FieldError>
      </div>

      <div>
        <Label htmlFor="confirmNewPassword">Confirm new password</Label>
        <Input id="confirmNewPassword" name="confirmNewPassword" type="password" required />
        <FieldError>{state?.fieldErrors?.confirmNewPassword}</FieldError>
      </div>

      <SubmitButton pendingLabel="Updating…">Change password</SubmitButton>
    </form>
  );
}
