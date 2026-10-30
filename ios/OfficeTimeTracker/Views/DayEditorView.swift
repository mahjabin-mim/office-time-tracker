import SwiftUI

/// Add or edit a day's regular times, or mark it as leave or a holiday.
struct DayEditorView: View {
    let row: DayRow
    let schedule: Schedule
    let onSaved: () -> Void

    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss

    @State private var dayType: String
    @State private var hasEntry: Bool
    @State private var entry: Date
    @State private var hasOut: Bool
    @State private var out: Date
    @State private var isHalfDay: Bool
    @State private var busy = false
    @State private var error: String?
    @State private var fieldErrors: [String: String] = [:]
    @State private var confirmingClear = false

    init(row: DayRow, schedule: Schedule, onSaved: @escaping () -> Void) {
        self.row = row
        self.schedule = schedule
        self.onSaved = onSaved
        // Legacy "sick" days are edited as leave, like on the website.
        _dayType = State(initialValue: row.leaveType == nil ? (row.isFuture ? "leave" : "work")
                                                            : row.leaveType == "holiday" ? "holiday" : "leave")
        _hasEntry = State(initialValue: row.entryMinutes != nil || !row.hasTimes)
        _entry = State(initialValue: Fmt.pickerDate(row.entryMinutes ?? schedule.workStartMinutes))
        _hasOut = State(initialValue: row.outMinutes != nil)
        _out = State(initialValue: Fmt.pickerDate(row.outMinutes ?? schedule.workEndMinutes))
        _isHalfDay = State(initialValue: row.isHalfDay)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Day type", selection: $dayType) {
                        if !row.isFuture { Text("Work").tag("work") }
                        Text("Leave").tag("leave")
                        Text("Holiday").tag("holiday")
                    }
                    .pickerStyle(.segmented)
                } footer: {
                    if row.isFuture {
                        Text("Future days can only be marked as leave or a holiday.")
                    } else if dayType != "work" {
                        Text("Leave and holidays never count as missing or short.")
                    }
                }

                if dayType == "work" {
                    Section {
                        Toggle("Entry time", isOn: $hasEntry)
                        if hasEntry {
                            DatePicker("Entry", selection: $entry, displayedComponents: .hourAndMinute)
                        }
                        FieldError(message: fieldErrors["entryTime"])
                        Toggle("Out time", isOn: $hasOut)
                        if hasOut {
                            DatePicker("Out", selection: $out, displayedComponents: .hourAndMinute)
                        }
                        FieldError(message: fieldErrors["outTime"])
                    } footer: {
                        Text("An out time earlier than the entry counts as an overnight shift.")
                    }

                    Section {
                        Toggle("Half day", isOn: $isHalfDay)
                    } footer: {
                        Text("Expected time drops to \(Fmt.duration(schedule.halfDayMinutes)).")
                    }
                }

                if let error {
                    Section { Text(error).foregroundStyle(Color.less) }
                }

                if row.hasRecord {
                    Section {
                        Button("Clear day", role: .destructive) { confirmingClear = true }
                    } footer: {
                        if row.extraEntryMinutes != nil {
                            Text("Extra hours on this day are kept.")
                        }
                    }
                }
            }
            .navigationTitle(Fmt.dayLabel(row.dateKey))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(busy)
                }
            }
            .confirmationDialog("Clear this day?", isPresented: $confirmingClear, titleVisibility: .visible) {
                Button("Clear day", role: .destructive) { Task { await clear() } }
            } message: {
                Text("Its times and leave are removed.")
            }
        }
    }

    private func save() async {
        busy = true
        defer { busy = false }
        fieldErrors = [:]
        do {
            let _: SuccessResponse = try await app.api.send("POST", "attendance", body: [
                "date": row.dateKey,
                "dayType": dayType,
                "entryTime": hasEntry ? Fmt.apiTime(Fmt.minutesOfDay(entry)) : "",
                "outTime": hasOut ? Fmt.apiTime(Fmt.minutesOfDay(out)) : "",
                "isHalfDay": isHalfDay,
            ])
            onSaved()
            dismiss()
        } catch let apiError as APIError {
            fieldErrors = apiError.fieldErrors
            error = apiError.formMessage
        } catch is CancellationError {
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func clear() async {
        busy = true
        defer { busy = false }
        do {
            let _: SuccessResponse = try await app.api.send(
                "DELETE", "attendance", query: ["date": row.dateKey]
            )
            onSaved()
            dismiss()
        } catch is CancellationError {
        } catch {
            self.error = error.localizedDescription
        }
    }
}
