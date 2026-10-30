import AuthenticationServices
import SwiftUI

struct AuthView: View {
    private enum Mode: String, CaseIterable {
        case login = "Log in"
        case signup = "Sign up"
    }

    @Environment(AppModel.self) private var app
    @Environment(\.openURL) private var openURL
    @Environment(\.webAuthenticationSession) private var webAuthenticationSession

    @State private var mode = Mode.login
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var busy = false
    @State private var error: String?
    @State private var fieldErrors: [String: String] = [:]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(spacing: 8) {
                        Image("Logo")
                            .resizable()
                            .frame(width: 72, height: 72)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                        Text("Office Time Tracker")
                            .font(.title2.weight(.bold))
                        Text("Track your entry and out times, and see your balance at a glance.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
                }

                Section {
                    Picker("Mode", selection: $mode) {
                        ForEach(Mode.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                }

                Section {
                    if mode == .signup {
                        TextField("Full name", text: $name)
                            .textContentType(.name)
                        FieldError(message: fieldErrors["name"])
                    }
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    FieldError(message: fieldErrors["email"])
                    SecureField("Password", text: $password)
                        .textContentType(mode == .signup ? .newPassword : .password)
                    FieldError(message: fieldErrors["password"])
                    if mode == .signup {
                        SecureField("Confirm password", text: $confirmPassword)
                            .textContentType(.newPassword)
                        FieldError(message: fieldErrors["confirmPassword"])
                    }
                } footer: {
                    if let error {
                        Text(error).foregroundStyle(Color.less)
                    }
                }

                Section {
                    Button(action: submit) {
                        HStack {
                            Spacer()
                            if busy { ProgressView() } else { Text(mode.rawValue).bold() }
                            Spacer()
                        }
                    }
                    .disabled(busy || email.isEmpty || password.isEmpty)
                } footer: {
                    if mode == .login {
                        Button("Forgot password?") { openURL(app.api.webURL("forgot-password")) }
                            .font(.footnote)
                    }
                }

                Section {
                    Button(action: continueWithGoogle) {
                        HStack(spacing: 10) {
                            Spacer()
                            Text("G")
                                .font(.headline.weight(.heavy))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [.blue, .red, .yellow, .green],
                                        startPoint: .topLeading, endPoint: .bottomTrailing
                                    )
                                )
                            Text("Continue with Google").bold()
                            Spacer()
                        }
                    }
                    .disabled(busy)
                } footer: {
                    Text("Signs in to the same account as the website. A new account is created on first use.")
                }
            }
            .onChange(of: mode) {
                error = nil
                fieldErrors = [:]
            }
            .onSubmit(submit)
        }
    }

    private func continueWithGoogle() {
        guard !busy else { return }
        busy = true
        error = nil
        fieldErrors = [:]
        Task {
            defer { busy = false }
            do {
                try await app.loginWithGoogle(using: webAuthenticationSession)
            } catch is CancellationError {
            } catch {
                self.error = error.localizedDescription
            }
        }
    }

    private func submit() {
        guard !busy else { return }
        busy = true
        error = nil
        fieldErrors = [:]
        Task {
            defer { busy = false }
            do {
                if mode == .login {
                    try await app.login(email: email, password: password)
                } else {
                    try await app.signup(
                        name: name, email: email, password: password, confirmPassword: confirmPassword
                    )
                }
            } catch let apiError as APIError {
                fieldErrors = apiError.fieldErrors
                error = apiError.formMessage
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}
