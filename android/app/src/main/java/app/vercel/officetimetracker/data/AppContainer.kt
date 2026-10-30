package app.vercel.officetimetracker.data

import android.content.Context
import app.vercel.officetimetracker.BuildConfig
import app.vercel.officetimetracker.reminders.Reminders
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** App-wide objects and the signed-in state every screen shares. */
class AppContainer(context: Context) {
    val websiteUrl: String = BuildConfig.API_BASE_URL.trimEnd('/')

    private val tokens = TokenStore(context)
    val api = Api(websiteUrl, tokens)
    val reminders = Reminders(context)

    private val _session = MutableStateFlow(tokens.session.takeIf { tokens.token != null })

    /** Null when signed out; otherwise the session number, which keys each screen's state. */
    val session: StateFlow<Int?> = _session.asStateFlow()

    private val _user = MutableStateFlow(tokens.cachedUser)
    val user: StateFlow<User?> = _user.asStateFlow()

    /** The latest working schedule from any screen; the day editor needs the half-day length. */
    val schedule = MutableStateFlow<Schedule?>(null)

    private val _dataVersion = MutableStateFlow(0)

    /** Bumped after every change, so screens reload what they show. */
    val dataVersion: StateFlow<Int> = _dataVersion.asStateFlow()

    private val _googleSignIn = MutableStateFlow<GoogleSignIn>(GoogleSignIn.Idle)

    /** A Google sign-in finishing after the browser handed back, for the sign-in screen to show. */
    val googleSignIn: StateFlow<GoogleSignIn> = _googleSignIn.asStateFlow()

    /** Outlives any one screen or activity, so a sign-in that's finishing survives a rotation. */
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    init {
        api.onUnauthorized = ::signOut
    }

    /** Starts Google sign-in: keeps a fresh PKCE verifier and returns the website page to open. */
    fun googleSignInUrl(): String {
        val verifier = Pkce.newVerifier()
        tokens.pendingVerifier = verifier
        _googleSignIn.value = GoogleSignIn.Idle
        return "$websiteUrl/api/auth/google?app_challenge=${Pkce.challenge(verifier)}"
    }

    /** Finishes Google sign-in from the officetimetracker://google-auth?code=… (or ?error=…) redirect. */
    fun finishGoogleSignIn(code: String?, error: String?) {
        val verifier = tokens.pendingVerifier
        tokens.pendingVerifier = null
        if (_session.value != null) return
        if (error != null || code == null || verifier == null) {
            _googleSignIn.value = GoogleSignIn.Failed(googleErrorMessage(error))
            return
        }
        _googleSignIn.value = GoogleSignIn.Working
        scope.launch {
            _googleSignIn.value = try {
                signedIn(api.googleSignIn(code, verifier))
                GoogleSignIn.Idle
            } catch (e: ApiException) {
                GoogleSignIn.Failed(e.message.orEmpty())
            }
        }
    }

    fun clearGoogleSignInError() {
        if (_googleSignIn.value is GoogleSignIn.Failed) _googleSignIn.value = GoogleSignIn.Idle
    }

    fun signedIn(response: AuthResponse) {
        val session = tokens.start(response.token)
        setUser(response.user)
        _session.value = session
    }

    fun setUser(user: User) {
        _user.value = user
        tokens.cachedUser = user
    }

    fun changed() {
        _dataVersion.update { it + 1 }
    }

    fun signOut() {
        tokens.clear()
        reminders.cancelAll()
        _user.value = null
        schedule.value = null
        _session.value = null
    }
}

sealed interface GoogleSignIn {
    data object Idle : GoogleSignIn
    data object Working : GoogleSignIn
    data class Failed(val message: String) : GoogleSignIn
}

/** The website's wording for each ?error= (GOOGLE_ERROR_MESSAGES in src/lib/google.ts). */
private fun googleErrorMessage(error: String?): String = when (error) {
    "google_cancelled" -> "Google sign-in was cancelled."
    "google_unavailable" -> "Google sign-in isn't set up on the server yet."
    "google_in_use" -> "That Google account is already linked to another Office Time Tracker account."
    "google_conflict" -> "This email is already linked to a different Google account."
    null -> "Google sign-in expired. Please try again."
    else -> "Couldn't sign in with Google. Please try again."
}
