import "server-only";
import nodemailer from "nodemailer";

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Sends an email over SMTP (e.g. Gmail with an app password, or any mail provider). Without SMTP
 * settings in development, the message is printed to the server console instead so the flow
 * can still be tried locally. Returns whether it was delivered or logged.
 */
export async function sendMail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  if (!isMailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[mail] SMTP not configured; would send to ${message.to}:\n${message.text}\n`);
      return true;
    }
    console.error("[mail] SMTP is not configured; email to", message.to, "was not sent.");
    return false;
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || `Office Time Tracker <${process.env.SMTP_USER}>`,
      ...message,
    });
    return true;
  } catch (err) {
    console.error("[mail] Failed to send email:", err);
    return false;
  }
}
