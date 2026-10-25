import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Full name must be at least 2 characters"),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional().default(false),
});

export const attendanceSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    // "work" records times; the others mark the whole day as leave or a holiday.
    dayType: z.enum(["work", "leave", "holiday"]),
    entryTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    outTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    isHalfDay: z.boolean(),
    // Extra hours are a separate session that can sit on any day type.
    extraEntryTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    extraOutTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  })
  .refine(
    (data) =>
      data.dayType !== "work" ||
      !!data.entryTime ||
      !!data.outTime ||
      !!data.extraEntryTime ||
      !!data.extraOutTime,
    {
      message: "Enter at least an entry time or an out time",
      path: ["entryTime"],
    }
  )
  .refine((data) => !data.extraOutTime || !!data.extraEntryTime, {
    message: "Add the extra hours entry time",
    path: ["extraEntryTime"],
  })
  .refine(
    (data) => !data.extraEntryTime || !data.extraOutTime || data.extraOutTime > data.extraEntryTime,
    {
      message: "Must be after the entry time. Sessions running past midnight continue on the next day.",
      path: ["extraOutTime"],
    }
  );

export const scheduleSchema = z.object({
  expectedDailyMinutes: z.number().int().min(60).max(1440),
  halfDayMinutes: z
    .number({ invalid_type_error: "Enter the half-day hours" })
    .int()
    .min(30, "A half day must be at least 30 minutes")
    .max(1440),
  workStartMinutes: z.number().int().min(0).max(1439),
  workEndMinutes: z.number().int().min(0).max(1439),
  workingDays: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Select at least one working day"),
});

export const lateEntrySchema = z.object({
  // null turns late-entry tracking off
  lateAfterMinutes: z.number().int().min(0).max(1439).nullable(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const passwordChangeSchema = z
  .object({
    // Optional for Google-only accounts that are setting a password for the first time.
    currentPassword: z.string(),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  timeFormat: z.enum(["12h", "24h"]),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", {
    errorMap: () => ({ message: 'Type "DELETE" to confirm' }),
  }),
  password: z.string(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://"),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, "This reset link is invalid"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
