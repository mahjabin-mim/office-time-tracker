import Foundation
import Observation

/// The signed-in session, shared by every screen.
@MainActor
@Observable
final class AppModel {
    private static let tokenAccount = "session-token"

    let api: APIClient
    private(set) var token: String?
    /// The latest copy of the user, from sign-in, the dashboard or settings.
    var user: User?

    var isSignedIn: Bool { token != nil }

    init() {
        api = APIClient(baseURL: APIClient.configuredBaseURL())
        token = Keychain.read(Self.tokenAccount)
        api.token = token
        api.onUnauthorized = { [weak self] in self?.signOut() }
    }

    func login(email: String, password: String) async throws {
        let response: AuthResponse = try await api.send(
            "POST", "auth/login", body: ["email": email, "password": password]
        )
        signIn(response)
    }

    func signup(name: String, email: String, password: String, confirmPassword: String) async throws {
        let response: AuthResponse = try await api.send(
            "POST",
            "auth/signup",
            body: [
                "name": name,
                "email": email,
                "password": password,
                "confirmPassword": confirmPassword,
                "timezone": TimeZone.current.identifier,
            ]
        )
        signIn(response)
    }

    private func signIn(_ response: AuthResponse) {
        Keychain.save(response.token, for: Self.tokenAccount)
        token = response.token
        api.token = response.token
        user = response.user
    }

    /// Forgets the token on this device only.
    func signOut() {
        Keychain.delete(Self.tokenAccount)
        token = nil
        api.token = nil
        user = nil
        Reminders.cancelAll()
    }

    /// "Today" and "now" are worked out in the user's time zone on the server, so keep it in step
    /// with the phone's. Returns whether it changed.
    func syncTimeZone(with user: User) async -> Bool {
        let current = TimeZone.current.identifier
        guard user.timezone != current else { return false }
        let response: SettingsResponse? = try? await api.send(
            "PATCH", "settings", body: ["timezone": current]
        )
        if let response { self.user = response.user }
        return response != nil
    }
}
