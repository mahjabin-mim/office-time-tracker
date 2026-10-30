import SwiftUI

/// Edit or remove a day's extra-hours session, kept apart from the regular entry/out.
struct ExtraHoursEditorView: View {
    let row: DayRow
    let onSaved: () -> Void

    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss

    @State private var entry: Date
    @State private var stillRunning: Bool
    @State private var out: Date
    @State private var busy = false
    @State private var error: String?
    @State private var fieldErrors: [String: String] = [:]
    @State private var confirmingDelete = false

    init(row: DayRow, onSaved: @escaping () -> Void) {
        self.row = row
        self.onSaved = onSaved
        let start = row.extraEntryMinutes ?? 18 * 60
        _entry = State(initialValue: Fmt.pickerDate(start))
        _stillRunning = State(initialValue: row.isToday && row.extraOutMinutes == nil)
        _out = State(initialValue: Fmt.pickerDate(row.extraOutMinutes ?? min(start + 60, 1439)))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker("Entry", selection: $entry, displayedComponents: .hourAndMinute)
                    FieldError(message: fieldErrors["extraEntryTime"])
                    if row.isToday {
                        Toggle("Still running", isOn: $stillRunning)
                    }
                    if !stillRunning {
                        DatePicker("Out", selection: $out, displayedComponents: .hourAndMinute)
                    }
                    FieldError(message: fieldErrors["extraOutTime"])
                } footer: {
                    Text("Every minute counts as extra time. A session still running at midnight continues on the next day.")
                }

                if let error {
                    Section { Text(error).foregroundStyle(Color.less) }
                }

                if row.extraEntryMinutes != nil {
                    Section {
                        Button("Delete extra hours", role: .destructive) { confirmingDelete = true }
                    }
                }
            }
            .navigationTitle("Extra hours")
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
            .confirmationDialog("Delete these extra hours?", isPresented: $confirmingDelete,
                                titleVisibility: .visible) {
                Button("Delete", role: .destructive) { Task { await delete() } }
            } message: {
                Text("The rest of the day is left as it is.")
            }
        }
    }

    private func save() async {
        busy = true
        defer { busy = false }
        fieldErrors = [:]
        do {
            let _: SuccessResponse = try await app.api.send("POST", "extra", body: [
                "date": row.dateKey,
                "extraEntryTime": Fmt.apiTime(Fmt.minutesOfDay(entry)),
                "extraOutTime": stillRunning ? "" : Fmt.apiTime(Fmt.minutesOfDay(out)),
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

    private func delete() async {
        busy = true
        defer { busy = false }
        do {
            let _: SuccessResponse = try await app.api.send("DELETE", "extra", query: ["date": row.dateKey])
            onSaved()
            dismiss()
        } catch is CancellationError {
        } catch {
            self.error = error.localizedDescription
        }
    }
}
