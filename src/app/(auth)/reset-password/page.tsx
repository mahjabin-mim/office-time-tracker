import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        After this, log in with your new password.
      </p>

      <div className="mt-6">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="rounded-xl border border-less/30 bg-less/10 px-4 py-3 text-sm text-less">
            This reset link is incomplete.{" "}
            <Link href="/forgot-password" className="font-semibold underline">
              Request a new one
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
