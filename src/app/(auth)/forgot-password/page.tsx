import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { isMailConfigured } from "@/lib/mail";

export default function ForgotPasswordPage() {
  const mailConfigured = isMailConfigured();
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a link to choose a new one.
      </p>

      <div className="mt-6">
        {!mailConfigured && isProduction ? (
          <p className="rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm text-muted-foreground">
            Password reset by email isn&apos;t set up yet. If your account uses Google, continue
            with Google and then set a new password in Settings.
          </p>
        ) : (
          <ForgotPasswordForm devMode={!mailConfigured} />
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to log in
        </Link>
      </p>
    </div>
  );
}
