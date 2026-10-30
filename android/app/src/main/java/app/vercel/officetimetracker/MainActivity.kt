package app.vercel.officetimetracker

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
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = (application as OfficeTimeTrackerApp).container
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
}
