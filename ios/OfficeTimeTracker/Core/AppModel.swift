import AuthenticationServices
import CryptoKit
import Foundation
import Observation
// With AuthenticationServices, brings in SwiftUI's WebAuthenticationSession.
import SwiftUI

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

    /// Google sign-in runs on the website in a browser sheet, which hands back a short-lived code
    /// through the app's URL scheme. Only this sign-in's `verifier` can redeem it.
    func loginWithGoogle(using session: WebAuthenticationSession) async throws {
        let verifier = Self.base64URL(Data((0..<32).map { _ in UInt8.random(in: .min ... .max) }))
        let challenge = Self.base64URL(Data(SHA256.hash(data: Data(verifier.utf8))))
        var start = URLComponents(url: api.webURL("api/auth/google"), resolvingAgainstBaseURL: false)!
        start.queryItems = [URLQueryItem(name: "app_challenge", value: challenge)]

        let callback: URL
        do {
            callback = try await session.authenticate(
                using: start.url!, callbackURLScheme: "officetimetracker", preferredBrowserSession: .shared
            )
        } catch let error as ASWebAuthenticationSessionError where error.code == .canceledLogin {
            throw CancellationError()
        }

        let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
        if let error = items.first(where: { $0.name == "error" })?.value {
            throw GoogleSignInError(code: error)
        }
        guard let code = items.first(where: { $0.name == "code" })?.value else {
            throw GoogleSignInError(code: "google_failed")
        }
        let response: AuthResponse = try await api.send(
            "POST", "auth/google", body: ["code": code, "verifier": verifier]
        )
        signIn(response)
    }

    private static func base64URL(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
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

/// Errors the website reports back from Google sign-in (GOOGLE_ERROR_MESSAGES in src/lib/google.ts).
struct GoogleSignInError: LocalizedError {
    let code: String

    var errorDescription: String? {
        switch code {
        case "google_cancelled": return "Google sign-in was cancelled."
        case "google_unavailable": return "Google sign-in isn't available right now."
        case "google_conflict": return "This email is already linked to a different Google account."
        default: return "Couldn't sign in with Google. Please try again."
        }
    }
}
