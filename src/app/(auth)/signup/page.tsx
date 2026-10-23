import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";
import { AuthDivider, GoogleButton } from "@/components/auth/GoogleButton";

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start tracking your office hours in under a minute.
      </p>

      <div className="mt-6 space-y-5">
        <GoogleButton label="Sign up with Google" />
        <AuthDivider label="or sign up with email" />
        <SignupForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
