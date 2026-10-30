package app.vercel.officetimetracker

import android.app.Application
import app.vercel.officetimetracker.data.AppContainer

class OfficeTimeTrackerApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
