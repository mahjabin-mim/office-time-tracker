package app.vercel.officetimetracker.data

import android.content.Context
import app.vercel.officetimetracker.BuildConfig
import app.vercel.officetimetracker.reminders.Reminders
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

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

    init {
        api.onUnauthorized = ::signOut
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
