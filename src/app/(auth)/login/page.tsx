import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthDivider, GoogleButton } from "@/components/auth/GoogleButton";
import { Alert } from "@/components/ui/Alert";
import { GOOGLE_ERROR_MESSAGES } from "@/lib/google";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; deleted?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const googleError = params.error ? GOOGLE_ERROR_MESSAGES[params.error] : undefined;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Log in to see today&apos;s balance.
      </p>

      <div className="mt-6 space-y-5">
        {params.deleted && (
          <Alert variant="success">Your account and all of its data have been deleted.</Alert>
        )}
        {params.reset && (
          <Alert variant="success">Your password has been updated. Log in with your new password.</Alert>
        )}
        {googleError && <Alert>{googleError}</Alert>}

        <GoogleButton label="Continue with Google" />
        <AuthDivider label="or log in with email" />
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:text-brand-700">
          Sign up
        </Link>
      </p>
    </div>
  );
}
