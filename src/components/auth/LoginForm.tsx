"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@company.com" required autoFocus />
        <FieldError>{state?.fieldErrors?.email}</FieldError>
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" placeholder="••••••••" required />
        <FieldError>{state?.fieldErrors?.password}</FieldError>
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="remember"
            className="h-4 w-4 rounded border-input text-brand-600 focus:ring-ring"
          />
          Remember me
        </label>
      </div>

      <SubmitButton size="lg" className="w-full" pendingLabel="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}
