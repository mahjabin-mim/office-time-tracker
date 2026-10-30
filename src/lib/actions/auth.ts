"use server";

import { redirect } from "next/navigation";
import { createPasswordAccount, verifyPasswordLogin } from "@/lib/account-service";
import { createSession, destroySession } from "@/lib/session";
import { getClientIp } from "@/lib/login-attempts";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const result = await createPasswordAccount({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
  });
  if (!("user" in result)) return result;

  await createSession(result.user, false);
  redirect("/welcome");
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const result = await verifyPasswordLogin(
    {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      remember: formData.get("remember") === "on",
    },
    await getClientIp()
  );
  if (!("user" in result)) return result;

  await createSession(result.user, result.remember);
  redirect(result.user.needsSetup ? "/welcome" : "/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
