package app.vercel.officetimetracker.ui.auth

import android.content.ActivityNotFoundException
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.vercel.officetimetracker.R
import app.vercel.officetimetracker.data.ApiException
import app.vercel.officetimetracker.data.AppContainer
import app.vercel.officetimetracker.data.GoogleSignIn
import app.vercel.officetimetracker.ui.components.InlineError
import kotlinx.coroutines.launch
import java.time.ZoneId

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthScreen(app: AppContainer) {
    val uri = LocalUriHandler.current
    val scope = rememberCoroutineScope()
    var signup by rememberSaveable { mutableStateOf(false) }
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var fieldErrors by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    val context = LocalContext.current
    val google by app.googleSignIn.collectAsStateWithLifecycle()
    val googleWorking = google is GoogleSignIn.Working
    val shownError = error ?: (google as? GoogleSignIn.Failed)?.message

    fun continueWithGoogle() {
        error = null
        fieldErrors = emptyMap()
        app.clearGoogleSignInError()
        try {
            CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(context, Uri.parse(app.googleSignInUrl()))
        } catch (e: ActivityNotFoundException) {
            error = "Install a web browser to sign in with Google."
        }
    }

    fun submit() {
        if (busy || googleWorking) return
        busy = true
        error = null
        fieldErrors = emptyMap()
        app.clearGoogleSignInError()
        scope.launch {
            try {
                val response = if (signup) {
                    app.api.signup(name.trim(), email.trim(), password, confirmPassword, ZoneId.systemDefault().id)
                } else {
                    app.api.login(email.trim(), password)
                }
                app.signedIn(response)
            } catch (e: ApiException) {
                fieldErrors = e.fieldErrors
                error = e.message.takeIf { e.fieldErrors.isEmpty() }
                busy = false
            }
        }
    }

    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            Modifier
                .fillMaxSize()
                .systemBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(24.dp))
            Image(
                painterResource(R.mipmap.ic_maskable),
                contentDescription = null,
                Modifier
                    .size(72.dp)
                    .clip(RoundedCornerShape(20.dp)),
            )
            Spacer(Modifier.height(16.dp))
            Text("Office Time Tracker", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
            Text(
                if (signup) "Create your account to start tracking." else "Welcome back. Log in to continue.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(24.dp))

            Column(Modifier.widthIn(max = 420.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    listOf(false to "Log in", true to "Sign up").forEachIndexed { index, (isSignup, label) ->
                        SegmentedButton(
                            selected = signup == isSignup,
                            onClick = {
                                signup = isSignup
                                error = null
                                fieldErrors = emptyMap()
                                app.clearGoogleSignInError()
                            },
                            shape = SegmentedButtonDefaults.itemShape(index, 2),
                        ) { Text(label) }
                    }
                }
                shownError?.let { InlineError(it) }
                if (signup) {
                    AuthField(name, { name = it }, "Full name", fieldErrors["name"])
                }
                AuthField(email, { email = it }, "Email", fieldErrors["email"], KeyboardType.Email)
                AuthField(
                    password, { password = it }, "Password", fieldErrors["password"], KeyboardType.Password,
                    imeAction = if (signup) ImeAction.Next else ImeAction.Done,
                    onDone = ::submit,
                )
                if (signup) {
                    AuthField(
                        confirmPassword, { confirmPassword = it }, "Confirm password", fieldErrors["confirmPassword"], KeyboardType.Password,
                        imeAction = ImeAction.Done,
                        onDone = ::submit,
                    )
                }
                Button(
                    onClick = ::submit,
                    enabled = !busy && !googleWorking,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                ) {
                    if (busy) {
                        CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Text(if (signup) "Create account" else "Log in")
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    HorizontalDivider(Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant)
                    Text(
                        "or",
                        Modifier.padding(horizontal = 12.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    HorizontalDivider(Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant)
                }
                OutlinedButton(
                    onClick = ::continueWithGoogle,
                    enabled = !busy && !googleWorking,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                ) {
                    if (googleWorking) {
                        CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Continue with Google")
                    }
                }
                if (!signup) {
                    TextButton(onClick = { uri.openUri("${app.websiteUrl}/forgot-password") }, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                        Text("Forgot password?")
                    }
                }
            }
        }
    }
}

@Composable
private fun AuthField(
    value: String,
    onChange: (String) -> Unit,
    label: String,
    error: String?,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    onDone: () -> Unit = {},
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        singleLine = true,
        isError = error != null,
        supportingText = errorText(error),
        visualTransformation = if (keyboardType == KeyboardType.Password) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        keyboardActions = KeyboardActions(onDone = { onDone() }),
        modifier = Modifier.fillMaxWidth(),
    )
}

private fun errorText(error: String?): (@Composable () -> Unit)? = error?.let { { Text(it) } }
