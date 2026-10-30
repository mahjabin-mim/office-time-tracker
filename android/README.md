# Office Time Tracker for Android

A native Android app (Kotlin + Jetpack Compose). It draws its own screens and talks to the website
only through the JSON API in `src/app/api/mobile/*`, signing in with a bearer token.

It replaces the old Trusted Web Activity (`~/Desktop/projects/office-time-tracker-android`), which
only showed the website full screen. It keeps that app's package ID
(`app.vercel.officetimetracker.twa`) and signing key, so it installs as an update over it, and it
keeps the old launcher component name, so existing home-screen icons keep working.

## What's in it

- **Today**: clock in/out, a live progress ring with the leave time, extra hours (start, end, edit),
  this month's stats and recent days
- **Month**: the balance, stats and every day with the website's status filters; tap a day to edit it
- **Year**: the yearly balance, a chart of monthly balances with a running total, and each month
- **Settings**: profile, working schedule, late entry, time format, time zone, reminders, log out,
  log out of all devices, delete account
- **Day editor**: entry/out times, half day, leave or holiday, clear the day
- **Reminders**: local notifications with the website's rules and wording (forgot to clock in, time
  to leave, still at work, extra hours still running), rescheduled every time Today loads and
  re-armed after a reboot
- **Sign-in**: email and password, or Google. Google runs the website's OAuth in a browser tab
  (`/api/auth/google?app_challenge=…`), which redirects to `officetimetracker://google-auth?code=…`;
  the app trades that code and its PKCE verifier for a token at `/api/mobile/auth/google`

Not in the app (it links to the website instead): password change, forgot password, data export.

## Requirements

The API must be deployed: the app gets a 404 from any site without `/api/mobile`.

Build tools are the ones already on this Mac from CompareHub: JDK 17 and the Android SDK in
`~/.comparehub-android-tools`. `local.properties` (gitignored) points Gradle at the SDK.

```bash
export JAVA_HOME=~/.comparehub-android-tools/jdk-17.0.20.1+1/Contents/Home
export GRADLE_USER_HOME=~/.comparehub-android-tools/gradle   # reuses the downloaded Gradle and libraries
cd android
```

## Build and test

```bash
./gradlew :app:testDebugUnitTest   # formatting and reminder rules
./gradlew :app:assembleDebug       # app/build/outputs/apk/debug/app-debug.apk
```

The debug build installs next to the released app as "Time Tracker (debug)". To point it at a local
server (`npm run dev` listens on port 3001; `10.0.2.2` is the host as seen from the emulator):

```bash
./gradlew :app:assembleDebug -PapiBaseUrl=http://10.0.2.2:3001
```

A plain-HTTP server also needs cleartext traffic allowed, which the app doesn't do by default.

## Release build

Signed with the Trusted Web Activity's key. Every update must use that key, or Android refuses to
install it over the installed app.

```bash
P=~/Desktop/projects/office-time-tracker-android/signing-key-passwords.txt
export OTT_KEYSTORE=~/Desktop/projects/office-time-tracker-android/android.keystore
export OTT_KEY_ALIAS="$(grep '^Alias:' "$P" | cut -d' ' -f2-)"
export OTT_KEYSTORE_PASSWORD="$(grep '^Keystore password:' "$P" | cut -d' ' -f3-)"
export OTT_KEY_PASSWORD="$(grep '^Key password:' "$P" | cut -d' ' -f3-)"
./gradlew :app:assembleRelease     # app/build/outputs/apk/release/app-release.apk
```

Bump `versionCode` and `versionName` in `app/build.gradle.kts` for every release.

## Publish an update

The website's "Download for Android" button points to the APK on the latest GitHub release:

```bash
cp app/build/outputs/apk/release/app-release.apk OfficeTimeTracker.apk
gh release create v2.0.0 OfficeTimeTracker.apk --title "Android app 2.0.0" --notes "Native app"
```

## Layout

```
app/src/main/java/app/vercel/officetimetracker/
├── data/        API client, response models, encrypted token storage, shared app state
├── reminders/   reminder rules (ReminderPlanner) and alarm scheduling
├── ui/          Compose screens: auth, today, month, year, settings, editors, components, theme
└── util/        formatting and time zones (matching src/lib/time.ts)
```
