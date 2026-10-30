import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

struct SettingsView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.openURL) private var openURL

    @State private var loaded: SettingsResponse?
    @State private var error: String?
    @State private var fieldErrors: [String: String] = [:]
    @State private var saved: String?
    @State private var busy = false
    @State private var notificationsDenied = false

    // Profile
    @State private var name = ""
    @State private var email = ""
    // Preferences and reminders
    @State private var timeFormat = "12h"
    @State private var remindClockIn = false
    @State private var remindLeave = true
    @State private var remindClockOut = true
    // Schedule
    @State private var expectedMinutes = 540
    @State private var halfDayMinutes = 270
    @State private var workStart = Fmt.pickerDate(540)
    @State private var workEnd = Fmt.pickerDate(1140)
    @State private var workingDays: Set<Int> = []
    @State private var tracksLate = false
    @State private var lateAfter = Fmt.pickerDate(570)

    @State private var confirmingLogoutAll = false
    @State private var deletingAccount = false

    var body: some View {
        NavigationStack {
            Form {
                if let error {
                    Section { Text(error).foregroundStyle(Color.less) }
                }

                if loaded != nil {
                    profileSection
                    scheduleSection
                    preferencesSection
                    remindersSection
                    accountSection
                } else if error == nil {
                    ProgressView().frame(maxWidth: .infinity)
                }
            }
            .navigationTitle("Settings")
            .task { await load() }
            .refreshable { await load() }
            .overlay(alignment: .bottom) {
                if let saved {
                    Label(saved, systemImage: "checkmark.circle.fill")
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(.thinMaterial, in: Capsule())
                        .padding(.bottom, 12)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(.snappy, value: saved)
            .confirmationDialog("Log out of all devices?", isPresented: $confirmingLogoutAll,
                                titleVisibility: .visible) {
                Button("Log out everywhere", role: .destructive) { Task { await logoutAll() } }
            } message: {
                Text("This signs you out of the website and the app on every device, including this one.")
            }
            .sheet(isPresented: $deletingAccount) {
                DeleteAccountView(hasPassword: loaded?.user.hasPassword ?? true)
            }
        }
    }

    // MARK: Sections

    private var profileSection: some View {
        Section {
            TextField("Full name", text: $name)
                .textContentType(.name)
            FieldError(message: fieldErrors["name"])
            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            FieldError(message: fieldErrors["email"])
            Button("Save profile") {
                Task { await save(["profile": ["name": name, "email": email]], "Profile saved") }
            }
            .disabled(busy)
        } header: {
            Text("Profile")
        }
    }

    private var scheduleSection: some View {
        Section {
            Stepper(value: $expectedMinutes, in: 60...1440, step: 15) {
                LabeledContent("Daily hours", value: Fmt.duration(expectedMinutes))
            }
            Stepper(value: $halfDayMinutes, in: 30...1440, step: 15) {
                LabeledContent("Half day", value: Fmt.duration(halfDayMinutes))
            }
            FieldError(message: fieldErrors["halfDayMinutes"])
            DatePicker("Work starts", selection: $workStart, displayedComponents: .hourAndMinute)
            DatePicker("Work ends", selection: $workEnd, displayedComponents: .hourAndMinute)

            VStack(alignment: .leading, spacing: 8) {
                Text("Working days")
                HStack(spacing: 6) {
                    ForEach(0..<7, id: \.self) { day in
                        let on = workingDays.contains(day)
                        Button {
                            if on { workingDays.remove(day) } else { workingDays.insert(day) }
                        } label: {
                            Text(String(weekdayNames[day].prefix(2)))
                                .font(.footnote.weight(.semibold))
                                .frame(maxWidth: .infinity, minHeight: 34)
                                .foregroundStyle(on ? Color.white : .primary)
                                .background(on ? Color.brand : Color.secondary.opacity(0.15),
                                            in: RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(weekdayNames[day])
                        .accessibilityAddTraits(on ? .isSelected : [])
                    }
                }
                FieldError(message: fieldErrors["workingDays"])
            }
            .padding(.vertical, 4)

            Toggle("Track late entries", isOn: $tracksLate)
            if tracksLate {
                DatePicker("Late after", selection: $lateAfter, displayedComponents: .hourAndMinute)
            }
            FieldError(message: fieldErrors["lateAfter"])

            Button("Save schedule") { Task { await saveSchedule() } }
                .disabled(busy)
        } header: {
            Text("Working schedule")
        } footer: {
            Text("Work on a day off counts entirely as extra time.")
        }
    }

    private var preferencesSection: some View {
        Section("Preferences") {
            Picker("Time format", selection: $timeFormat) {
                Text("12-hour").tag("12h")
                Text("24-hour").tag("24h")
            }
            .onChange(of: timeFormat) { _, value in
                guard value != loaded?.user.timeFormat else { return }
                Task { await save(["preferences": ["timeFormat": value]], "Time format saved") }
            }
        }
    }

    private var remindersSection: some View {
        Section {
            Toggle("Forgot to clock in", isOn: $remindClockIn)
            Toggle("Time to leave", isOn: $remindLeave)
            Toggle("Forgot to clock out", isOn: $remindClockOut)
            if notificationsDenied {
                Button("Turn on notifications in iOS Settings") { openSystemSettings() }
            }
        } header: {
            Text("Reminders")
        } footer: {
            Text("Notifications are scheduled on this iPhone each time you open the app.")
        }
        .onChange(of: [remindClockIn, remindLeave, remindClockOut]) { _, values in
            guard let user = loaded?.user,
                  values != [user.remindClockIn, user.remindLeave, user.remindClockOut]
            else { return }
            Task {
                await save(["reminders": [
                    "remindClockIn": values[0],
                    "remindLeave": values[1],
                    "remindClockOut": values[2],
                ]], "Reminders saved")
                await rescheduleReminders()
            }
        }
    }

    private var accountSection: some View {
        Section {
            Button("Password, Google sign-in and data export") {
                openURL(app.api.webURL("dashboard/settings"))
            }
            Button("Log out") { app.signOut() }
            Button("Log out of all devices", role: .destructive) { confirmingLogoutAll = true }
            Button("Delete account", role: .destructive) { deletingAccount = true }
        } header: {
            Text("Account")
        } footer: {
            Text("Signed in as \(loaded?.user.email ?? "").")
        }
    }

    // MARK: Data

    private func load() async {
        await runReportingError($error) {
            apply(try await app.api.get("settings"))
        }
        notificationsDenied = await Reminders.isDenied()
    }

    private func apply(_ response: SettingsResponse) {
        loaded = response
        app.user = response.user
        let user = response.user
        let schedule = response.schedule
        name = user.name
        email = user.email
        timeFormat = user.timeFormat
        remindClockIn = user.remindClockIn
        remindLeave = user.remindLeave
        remindClockOut = user.remindClockOut
        expectedMinutes = schedule.expectedDailyMinutes
        halfDayMinutes = schedule.halfDayMinutes
        workStart = Fmt.pickerDate(schedule.workStartMinutes)
        workEnd = Fmt.pickerDate(schedule.workEndMinutes)
        workingDays = Set(schedule.workingDays)
        tracksLate = schedule.lateAfterMinutes != nil
        lateAfter = Fmt.pickerDate(schedule.lateAfterMinutes ?? schedule.workStartMinutes + 30)
    }

    private func saveSchedule() async {
        await save([
            "schedule": [
                "expectedDailyMinutes": expectedMinutes,
                "halfDayMinutes": halfDayMinutes,
                "workStartMinutes": Fmt.minutesOfDay(workStart),
                "workEndMinutes": Fmt.minutesOfDay(workEnd),
                "workingDays": workingDays.sorted(),
            ],
            "lateAfterMinutes": tracksLate ? Fmt.minutesOfDay(lateAfter) : NSNull(),
        ], "Schedule saved")
        await rescheduleReminders()
    }

    private func save(_ body: [String: Any], _ message: String) async {
        busy = true
        defer { busy = false }
        fieldErrors = [:]
        do {
            apply(try await app.api.send("PATCH", "settings", body: body))
            error = nil
            flash(message)
        } catch let apiError as APIError {
            fieldErrors = apiError.fieldErrors
            error = apiError.formMessage
        } catch is CancellationError {
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// Reminder times depend on the schedule and preferences, so refresh them right away.
    private func rescheduleReminders() async {
        if let data: DashboardResponse = try? await app.api.get("dashboard") {
            Reminders.schedule(from: data)
        }
    }

    private func logoutAll() async {
        await runReportingError($error) {
            let _: SuccessResponse = try await app.api.send("POST", "account", body: ["action": "logout-all"])
            app.signOut()
        }
    }

    private func flash(_ message: String) {
        saved = message
        Task {
            try? await Task.sleep(for: .seconds(2))
            if saved == message { saved = nil }
        }
    }

    private func openSystemSettings() {
        #if canImport(UIKit)
        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
        #endif
    }
}

private struct DeleteAccountView: View {
    let hasPassword: Bool

    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss

    @State private var confirmation = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error: String?
    @State private var fieldErrors: [String: String] = [:]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("This permanently deletes your account, schedule and all attendance. It can't be undone.")
                }
                Section {
                    if hasPassword {
                        SecureField("Password", text: $password)
                            .textContentType(.password)
                        FieldError(message: fieldErrors["password"])
                    }
                    TextField("Type DELETE to confirm", text: $confirmation)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                    FieldError(message: fieldErrors["confirmation"])
                }
                if let error {
                    Section { Text(error).foregroundStyle(Color.less) }
                }
                Section {
                    Button("Delete my account", role: .destructive) { Task { await delete() } }
                        .disabled(busy || confirmation.trimmingCharacters(in: .whitespaces) != "DELETE")
                }
            }
            .navigationTitle("Delete account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
    }

    private func delete() async {
        busy = true
        defer { busy = false }
        fieldErrors = [:]
        do {
            let _: SuccessResponse = try await app.api.send(
                "DELETE", "account", body: ["confirmation": confirmation, "password": password]
            )
            dismiss()
            app.signOut()
        } catch let apiError as APIError {
            fieldErrors = apiError.fieldErrors
            error = apiError.formMessage
        } catch is CancellationError {
        } catch {
            self.error = error.localizedDescription
        }
    }
}
