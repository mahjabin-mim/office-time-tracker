"use client";

import { useActionState } from "react";
import { signupAction } from "@/lib/actions/auth";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}

      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" type="text" placeholder="Jordan Lee" required autoFocus />
        <FieldError>{state?.fieldErrors?.name}</FieldError>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@company.com" required />
        <FieldError>{state?.fieldErrors?.email}</FieldError>
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" placeholder="At least 8 characters" required />
        <FieldError>{state?.fieldErrors?.password}</FieldError>
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repeat password" required />
        <FieldError>{state?.fieldErrors?.confirmPassword}</FieldError>
      </div>

      <SubmitButton size="lg" className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
