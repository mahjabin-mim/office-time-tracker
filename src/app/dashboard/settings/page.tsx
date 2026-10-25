import {
  Bell,
  CalendarClock,
  AlarmClock,
  Database,
  KeyRound,
  Link2,
  SlidersHorizontal,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { getOrCreateSchedule, requireCurrentUser } from "@/lib/data";
import { GOOGLE_ERROR_MESSAGES } from "@/lib/google";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { PasswordForm } from "@/components/settings/PasswordForm";
import { ScheduleForm } from "@/components/settings/ScheduleForm";
import { LateEntryForm } from "@/components/settings/LateEntryForm";
import { PreferencesForm } from "@/components/settings/PreferencesForm";
import { SignInMethods } from "@/components/settings/SignInMethods";
import { DataExport } from "@/components/settings/DataExport";
import { DeleteAccount } from "@/components/settings/DeleteAccount";
import { ReminderSettings } from "@/components/settings/ReminderSettings";
import { getVapidPublicKey } from "@/lib/push";
import { Alert } from "@/components/ui/Alert";
import { Reveal } from "@/components/ui/Reveal";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const params = await searchParams;
  const user = await requireCurrentUser();
  const schedule = await getOrCreateSchedule(user.id);
  const hasPassword = user.passwordHash != null;
  const googleError = params.google ? GOOGLE_ERROR_MESSAGES[params.google] : undefined;

  return (
    <div className="space-y-8">
      <Reveal>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your profile, working schedule, and preferences.
        </p>
      </Reveal>

      {params.google === "connected" && (
        <Alert variant="success">Your Google account is now connected.</Alert>
      )}
      {googleError && <Alert>{googleError}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal delay={0.05} className="h-full">
          <SettingsSection
            icon={<UserRound className="h-4 w-4" />}
            title="Profile"
            description="Your name and the email you log in with."
          >
            <ProfileForm name={user.name} email={user.email} />
          </SettingsSection>
        </Reveal>

        <Reveal delay={0.1} className="h-full">
          <SettingsSection
            icon={<KeyRound className="h-4 w-4" />}
            title="Password"
            description={
              hasPassword ? "Change the password for your account." : "Add a password to your account."
            }
          >
            <PasswordForm hasPassword={hasPassword} />
          </SettingsSection>
        </Reveal>

        <Reveal delay={0.15} className="lg:col-span-2">
          <SettingsSection
            icon={<CalendarClock className="h-4 w-4" />}
            title="Working Schedule"
            description="Used to calculate your expected hours and daily balance."
          >
            <ScheduleForm schedule={schedule} />
          </SettingsSection>
        </Reveal>

        <Reveal delay={0.18} className="lg:col-span-2">
          <SettingsSection
            icon={<AlarmClock className="h-4 w-4" />}
            title="Late Entry"
            description="Set the time after which an entry is marked late."
          >
            <LateEntryForm lateAfterMinutes={schedule.lateAfterMinutes} />
          </SettingsSection>
        </Reveal>

        <Reveal delay={0.2} className="h-full">
          <SettingsSection
            icon={<SlidersHorizontal className="h-4 w-4" />}
            title="Preferences"
            description="How the app looks and how times are shown."
          >
            <PreferencesForm
              theme={user.theme}
              timeFormat={user.timeFormat}
              timezone={user.timezone}
            />
          </SettingsSection>
        </Reveal>

        <Reveal delay={0.22} className="h-full">
          <SettingsSection
            icon={<Bell className="h-4 w-4" />}
            title="Reminders"
            description="Get a notification on your phone or computer."
          >
            <ReminderSettings
              vapidPublicKey={getVapidPublicKey()}
              prefs={{
                remindClockIn: user.remindClockIn,
                remindLeave: user.remindLeave,
                remindClockOut: user.remindClockOut,
              }}
            />
          </SettingsSection>
        </Reveal>

        <Reveal delay={0.25} className="h-full">
          <SettingsSection
            icon={<Link2 className="h-4 w-4" />}
            title="Sign-in & security"
            description="How you log in, and where you're signed in."
          >
            <SignInMethods
              email={user.email}
              hasPassword={hasPassword}
              googleConnected={user.googleId != null}
            />
          </SettingsSection>
        </Reveal>

        <Reveal delay={0.3} className="h-full">
          <SettingsSection
            icon={<Database className="h-4 w-4" />}
            title="Your data"
            description="Download a copy of everything you've tracked."
          >
            <DataExport />
          </SettingsSection>
        </Reveal>

        <Reveal delay={0.35} className="lg:col-span-2">
          <SettingsSection
            icon={<TriangleAlert className="h-4 w-4" />}
            title="Delete account"
            description="Remove your account and all associated data."
            tone="danger"
          >
            <DeleteAccount hasPassword={hasPassword} />
          </SettingsSection>
        </Reveal>
      </div>
    </div>
  );
}
