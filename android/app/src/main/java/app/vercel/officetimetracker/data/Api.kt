package app.vercel.officetimetracker.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.DeserializationStrategy
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/** A failed request, with a message to show and any per-field errors from the server. */
class ApiException(
    message: String,
    val fieldErrors: Map<String, String> = emptyMap(),
) : Exception(message)

/** Client for the website's /api/mobile endpoints, authenticated with a bearer token. */
class Api(baseUrl: String, private val tokens: TokenStore) {
    private val root = baseUrl.trimEnd('/').toHttpUrl()
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    /** Called on the main thread when the server rejects the token (expired, or signed out everywhere). */
    var onUnauthorized: () -> Unit = {}

    suspend fun login(email: String, password: String): AuthResponse =
        send(
            "POST", "auth/login", AuthResponse.serializer(),
            body = buildJsonObject {
                put("email", email)
                put("password", password)
            },
            authenticated = false,
        )

    suspend fun signup(
        name: String,
        email: String,
        password: String,
        confirmPassword: String,
        timezone: String,
    ): AuthResponse =
        send(
            "POST", "auth/signup", AuthResponse.serializer(),
            body = buildJsonObject {
                put("name", name)
                put("email", email)
                put("password", password)
                put("confirmPassword", confirmPassword)
                put("timezone", timezone)
            },
            authenticated = false,
        )

    suspend fun dashboard(): DashboardResponse = send("GET", "dashboard", DashboardResponse.serializer())

    /** [month] is 0-indexed, like everywhere else in the API. */
    suspend fun month(year: Int, month: Int): MonthResponse =
        send("GET", "month", MonthResponse.serializer(), query = mapOf("year" to "$year", "month" to "$month"))

    suspend fun year(year: Int): YearResponse =
        send("GET", "year", YearResponse.serializer(), query = mapOf("year" to "$year"))

    suspend fun settings(): SettingsResponse = send("GET", "settings", SettingsResponse.serializer())

    /** Sends any of: profile, preferences, schedule, lateAfterMinutes, reminders, timezone. */
    suspend fun updateSettings(body: JsonObject): SettingsResponse =
        send("PATCH", "settings", SettingsResponse.serializer(), body = body)

    /** Clocks in, or out once the day has an entry time. */
    suspend fun clock() {
        send("POST", "clock", SuccessBody.serializer())
    }

    /** Starts today's extra-hours session, or ends it once it's running. */
    suspend fun clockExtra() {
        send("POST", "extra/clock", SuccessBody.serializer())
    }

    /** [dayType] is "work", "leave" or "holiday"; times are "HH:mm" or empty. */
    suspend fun saveDay(date: String, dayType: String, entryTime: String, outTime: String, isHalfDay: Boolean) {
        send(
            "POST", "attendance", SuccessBody.serializer(),
            body = buildJsonObject {
                put("date", date)
                put("dayType", dayType)
                put("entryTime", entryTime)
                put("outTime", outTime)
                put("isHalfDay", isHalfDay)
            },
        )
    }

    /** Clears a day's times or leave; its extra hours are kept. */
    suspend fun clearDay(date: String) {
        send("DELETE", "attendance", SuccessBody.serializer(), query = mapOf("date" to date))
    }

    suspend fun saveExtra(date: String, extraEntryTime: String, extraOutTime: String) {
        send(
            "POST", "extra", SuccessBody.serializer(),
            body = buildJsonObject {
                put("date", date)
                put("extraEntryTime", extraEntryTime)
                put("extraOutTime", extraOutTime)
            },
        )
    }

    suspend fun clearExtra(date: String) {
        send("DELETE", "extra", SuccessBody.serializer(), query = mapOf("date" to date))
    }

    /** Revokes every session and token for the account, this one included. */
    suspend fun logOutEverywhere() {
        send("POST", "account", SuccessBody.serializer(), body = buildJsonObject { put("action", "logout-all") })
    }

    suspend fun deleteAccount(confirmation: String, password: String) {
        send(
            "DELETE", "account", SuccessBody.serializer(),
            body = buildJsonObject {
                put("confirmation", confirmation)
                put("password", password)
            },
        )
    }

    private suspend fun <T> send(
        method: String,
        path: String,
        deserializer: DeserializationStrategy<T>,
        query: Map<String, String> = emptyMap(),
        body: JsonObject? = null,
        authenticated: Boolean = true,
    ): T {
        val url = root.newBuilder()
            .addPathSegments("api/mobile/$path")
            .apply { query.forEach { (key, value) -> addQueryParameter(key, value) } }
            .build()
        // OkHttp requires a body on POST and PATCH.
        val payload = (body?.toString() ?: if (method == "POST" || method == "PATCH") "{}" else null)
            ?.toRequestBody(JSON)
        val request = Request.Builder()
            .url(url)
            .header("Accept", "application/json")
            .apply { if (authenticated) tokens.token?.let { header("Authorization", "Bearer $it") } }
            .method(method, payload)
            .build()

        val (code, text) = withContext(Dispatchers.IO) {
            try {
                client.newCall(request).execute().use { it.code to it.body?.string().orEmpty() }
            } catch (e: IOException) {
                throw ApiException("Can't reach the server. Check your connection and try again.")
            }
        }

        if (code in 200..299) {
            return try {
                ApiJson.decodeFromString(deserializer, text)
            } catch (e: IllegalArgumentException) {
                throw ApiException("The server sent a response the app doesn't understand.")
            }
        }

        if (code == 401 && authenticated) onUnauthorized()
        val error = runCatching { ApiJson.decodeFromString(ErrorBody.serializer(), text) }.getOrNull()
        val fieldErrors = error?.fieldErrors.orEmpty()
        val message = error?.error
            ?: fieldErrors.values.firstOrNull()
            ?: when (code) {
                404 -> "This server doesn't support the app yet."
                429 -> "Too many attempts. Wait a few minutes and try again."
                in 500..599 -> "The server had a problem. Try again in a moment."
                else -> "Something went wrong (error $code)."
            }
        throw ApiException(message, fieldErrors)
    }

    private companion object {
        val JSON = "application/json; charset=utf-8".toMediaType()
    }
}
