"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteAccountAction } from "@/lib/actions/settings";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function DeleteAccount({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Permanently delete your account, working schedule, and every attendance record. This
          can&apos;t be undone.
        </p>
        <Button variant="danger" onClick={() => setOpen(true)}>
          <Trash2 className="h-4 w-4" />
          Delete account
        </Button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your account?"
        description="Your profile, schedule, and all attendance history will be removed for good."
      >
        <DeleteAccountForm hasPassword={hasPassword} onCancel={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function DeleteAccountForm({
  hasPassword,
  onCancel,
}: {
  hasPassword: boolean;
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState(deleteAccountAction, null);
  const [confirmation, setConfirmation] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}

      <p className="rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 text-sm text-muted-foreground">
        Want a copy first?{" "}
        <a
          href="/api/export?format=json"
          className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          Download a backup
        </a>
      </p>

      {hasPassword && (
        <div>
          <Label htmlFor="deletePassword">Password</Label>
          <PasswordInput
            id="deletePassword"
            name="password"
            autoComplete="current-password"
            required
          />
          <FieldError>{state?.fieldErrors?.password}</FieldError>
        </div>
      )}

      <div>
        <Label htmlFor="confirmation">
          Type <span className="font-mono font-semibold">DELETE</span> to confirm
        </Label>
        <Input
          id="confirmation"
          name="confirmation"
          autoComplete="off"
          placeholder="DELETE"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        <FieldError>{state?.fieldErrors?.confirmation}</FieldError>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <SubmitButton
          variant="danger"
          pendingLabel="Deleting…"
          disabled={confirmation.trim() !== "DELETE"}
        >
          Delete forever
        </SubmitButton>
      </div>
    </form>
  );
}
