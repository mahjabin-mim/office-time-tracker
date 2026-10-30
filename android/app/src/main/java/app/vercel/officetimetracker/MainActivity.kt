package app.vercel.officetimetracker

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.vercel.officetimetracker.ui.MainScreen
import app.vercel.officetimetracker.ui.auth.AuthScreen
import app.vercel.officetimetracker.ui.theme.OfficeTheme

class MainActivity : ComponentActivity() {
    private val app get() = (application as OfficeTimeTrackerApp).container

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // Only a fresh launch; a recreated activity would replay the same one-time code.
        if (savedInstanceState == null) handleGoogleRedirect(intent)
        setContent {
            OfficeTheme {
                val session by app.session.collectAsStateWithLifecycle()
                when (val current = session) {
                    null -> AuthScreen(app)
                    else -> key(current) { MainScreen(app, current) }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleGoogleRedirect(intent)
    }

    private fun handleGoogleRedirect(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme != "officetimetracker" || uri.host != "google-auth") return
        app.finishGoogleSignIn(code = uri.getQueryParameter("code"), error = uri.getQueryParameter("error"))
    }
}
