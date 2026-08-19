import { getOrCreateSchedule, requireCurrentUser } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { PasswordForm } from "@/components/settings/PasswordForm";
import { ScheduleForm } from "@/components/settings/ScheduleForm";
import { PreferencesForm } from "@/components/settings/PreferencesForm";
import { Reveal } from "@/components/ui/Reveal";

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const schedule = await getOrCreateSchedule(user.id);

  return (
    <div className="space-y-8">
      <Reveal>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your profile, working schedule, and preferences.
        </p>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal delay={0.05}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileForm name={user.name} email={user.email} />
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Password</CardTitle>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.15} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Working Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <ScheduleForm schedule={schedule} />
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.2} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <PreferencesForm theme={user.theme} timeFormat={user.timeFormat} />
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
