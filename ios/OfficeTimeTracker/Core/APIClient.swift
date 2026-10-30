import Foundation

struct APIErrorBody: Decodable {
    let error: String?
    let fieldErrors: [String: String]?
}

enum APIError: LocalizedError {
    case unauthorized(String)
    case validation(String?, [String: String])
    case server(Int)
    case transport
    case decoding

    var errorDescription: String? {
        switch self {
        case .unauthorized(let message):
            return message
        case .validation(let message, let fields):
            return message ?? fields.values.sorted().first ?? "Please check the form and try again."
        case .server(let status):
            return "The server had a problem (\(status)). Please try again."
        case .transport:
            return "Couldn't reach the server. Check your connection and try again."
        case .decoding:
            return "The server sent an unexpected response. Try updating the app."
        }
    }

    /// Per-field messages, keyed like the web forms (entryTime, email, ...).
    var fieldErrors: [String: String] {
        if case .validation(_, let fields) = self { return fields }
        return [:]
    }

    /// Only the form-level message; field messages are shown next to their fields.
    var formMessage: String? {
        if case .validation(let message, let fields) = self {
            return message ?? (fields.isEmpty ? errorDescription : nil)
        }
        return errorDescription
    }
}

/// Talks to the web app's /api/mobile routes with the signed-in user's bearer token.
@MainActor
final class APIClient {
    let baseURL: URL
    var token: String?
    /// Called when the server rejects the token (expired, or signed out on every device).
    var onUnauthorized: (@MainActor () -> Void)?

    init(baseURL: URL) {
        self.baseURL = baseURL
    }

    /// The server from the APIBaseURL Info.plist key (the API_BASE_URL build setting).
    static func configuredBaseURL() -> URL {
        let value = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String
        if let value, let url = URL(string: value), url.host != nil { return url }
        return URL(string: "https://officetimetracker.vercel.app")!
    }

    /// The website itself, for things the app links out to (password reset, Google sign-in).
    func webURL(_ path: String) -> URL {
        baseURL.appendingPathComponent(path)
    }

    func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        try await request("GET", path, query: query, body: nil)
    }

    func send<T: Decodable>(
        _ method: String,
        _ path: String,
        query: [String: String] = [:],
        body: [String: Any]? = nil
    ) async throws -> T {
        try await request(method, path, query: query, body: body)
    }

    private func request<T: Decodable>(
        _ method: String,
        _ path: String,
        query: [String: String],
        body: [String: Any]?
    ) async throws -> T {
        var components = URLComponents(
            url: baseURL.appendingPathComponent("api/mobile/\(path)"),
            resolvingAgainstBaseURL: false
        )!
        if !query.isEmpty {
            components.queryItems = query.sorted { $0.key < $1.key }.map {
                URLQueryItem(name: $0.key, value: $0.value)
            }
        }

        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let result: (Data, URLResponse)
        do {
            result = try await URLSession.shared.data(for: request)
        } catch {
            if (error as? URLError)?.code == .cancelled || error is CancellationError {
                throw CancellationError()
            }
            throw APIError.transport
        }
        let (data, response) = result
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let errorBody = try? JSONDecoder().decode(APIErrorBody.self, from: data)

        switch status {
        case 200..<300:
            do {
                return try JSONDecoder().decode(T.self, from: data)
            } catch {
                throw APIError.decoding
            }
        case 401:
            onUnauthorized?()
            throw APIError.unauthorized(errorBody?.error ?? "Please log in again.")
        case 400, 422:
            throw APIError.validation(errorBody?.error, errorBody?.fieldErrors ?? [:])
        default:
            throw APIError.server(status)
        }
    }
}
