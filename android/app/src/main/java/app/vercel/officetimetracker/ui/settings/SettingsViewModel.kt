package app.vercel.officetimetracker.ui.settings

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.vercel.officetimetracker.data.ApiException
import app.vercel.officetimetracker.data.AppContainer
import app.vercel.officetimetracker.data.SettingsResponse
import app.vercel.officetimetracker.ui.components.Loadable
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject

/** Errors from the last save, for the section that sent it. */
data class SectionErrors(
    val section: String,
    val message: String? = null,
    val fields: Map<String, String> = emptyMap(),
)

class SettingsViewModel(private val app: AppContainer) : ViewModel() {
    var state by mutableStateOf(Loadable<SettingsResponse>())
        private set

    /** The section whose save is running. */
    var saving by mutableStateOf<String?>(null)
        private set

    var errors by mutableStateOf<SectionErrors?>(null)
        private set

    private var job: Job? = null

    fun refresh() {
        if (saving != null) return
        job?.cancel()
        job = viewModelScope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val data = app.api.settings()
                app.setUser(data.user)
                app.schedule.value = data.schedule
                state = Loadable(data)
            } catch (e: ApiException) {
                state = state.copy(loading = false, error = e.message)
            }
        }
    }

    fun errorsFor(section: String): SectionErrors? = errors?.takeIf { it.section == section }

    /** Saves one section; [body] holds that section's key (see PATCH /api/mobile/settings). */
    fun save(section: String, body: JsonObject, successMessage: String, onMessage: (String) -> Unit) {
        if (saving != null) return
        job?.cancel()
        saving = section
        errors = null
        viewModelScope.launch {
            try {
                val data = app.api.updateSettings(body)
                state = Loadable(data)
                app.setUser(data.user)
                app.schedule.value = data.schedule
                app.changed()
                onMessage(successMessage)
            } catch (e: ApiException) {
                errors = SectionErrors(section, e.message.takeIf { e.fieldErrors.isEmpty() }, e.fieldErrors)
            } finally {
                saving = null
            }
        }
    }

    fun showError(section: String, fields: Map<String, String>) {
        errors = SectionErrors(section, fields = fields)
    }

    fun logOutEverywhere(onMessage: (String) -> Unit) {
        viewModelScope.launch {
            try {
                app.api.logOutEverywhere()
                app.signOut()
            } catch (e: ApiException) {
                onMessage(e.message.orEmpty())
            }
        }
    }

    fun deleteAccount(confirmation: String, password: String, onError: (SectionErrors) -> Unit) {
        viewModelScope.launch {
            try {
                app.api.deleteAccount(confirmation, password)
                app.signOut()
            } catch (e: ApiException) {
                onError(SectionErrors("delete", e.message.takeIf { e.fieldErrors.isEmpty() }, e.fieldErrors))
            }
        }
    }

    fun logOut() = app.signOut()
}
