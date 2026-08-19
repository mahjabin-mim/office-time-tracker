"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/lib/actions/settings";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, formAction] = useActionState(updateProfileAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.success && <Alert variant="success">Profile updated.</Alert>}

      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" type="text" defaultValue={name} required />
        <FieldError>{state?.fieldErrors?.name}</FieldError>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={email} required />
        <FieldError>{state?.fieldErrors?.email}</FieldError>
      </div>

      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}
