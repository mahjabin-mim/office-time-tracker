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
    entryTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    outTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  })
  .refine((data) => !!data.entryTime || !!data.outTime, {
    message: "Enter at least an entry time or an out time",
    path: ["entryTime"],
  });

export const scheduleSchema = z.object({
  expectedDailyMinutes: z.number().int().min(60).max(1440),
  breakMinutes: z.number().int().min(0).max(720),
  workStartMinutes: z.number().int().min(0).max(1439),
  workEndMinutes: z.number().int().min(0).max(1439),
  workingDays: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Select at least one working day"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
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
