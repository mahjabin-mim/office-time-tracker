import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  LOGIN_WINDOW_MINUTES,
  MAX_FAILURES_PER_ACCOUNT,
  MAX_FAILURES_PER_IP,
  clientIpFrom,
  loginLockout,
} from "@/lib/rate-limit";

export async function getClientIp(): Promise<string> {
  return clientIpFrom(await headers());
}

export async function checkLoginAllowed(email: string, ip: string) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000);
  const [account, byIp] = await Promise.all([
    db.loginAttempt.findMany({
      where: { email, createdAt: { gt: since } },
      orderBy: { createdAt: "desc" },
      take: MAX_FAILURES_PER_ACCOUNT,
      select: { createdAt: true },
    }),
    db.loginAttempt.findMany({
      where: { ip, createdAt: { gt: since } },
      orderBy: { createdAt: "desc" },
      take: MAX_FAILURES_PER_IP,
      select: { createdAt: true },
    }),
  ]);
  return loginLockout({
    accountFailures: account.map((a) => a.createdAt),
    ipFailures: byIp.map((a) => a.createdAt),
  });
}

export async function recordFailedLogin(email: string, ip: string) {
  await db.loginAttempt.create({ data: { email, ip } });
  // Keep the table small; nothing older than a day is ever needed.
  await db.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } },
  });
}

export async function clearFailedLogins(email: string) {
  await db.loginAttempt.deleteMany({ where: { email } });
}
