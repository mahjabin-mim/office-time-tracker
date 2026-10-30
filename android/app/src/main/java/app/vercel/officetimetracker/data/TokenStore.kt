package app.vercel.officetimetracker.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.core.content.edit
import java.security.GeneralSecurityException
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * The signed-in session. The bearer token is encrypted with a key held in the Android Keystore,
 * so it can't be read off the device; the cached profile is plain app-private storage.
 */
class TokenStore(context: Context) {
    private val prefs = context.getSharedPreferences("session", Context.MODE_PRIVATE)

    @Volatile
    private var cachedToken: String? = prefs.getString(KEY_TOKEN, null)?.let(::decrypt)

    val token: String? get() = cachedToken

    /** Increases with every sign-in, so state from a previous account is never reused. */
    val session: Int get() = prefs.getInt(KEY_SESSION, 0)

    var cachedUser: User?
        get() = prefs.getString(KEY_USER, null)?.let {
            runCatching { ApiJson.decodeFromString(User.serializer(), it) }.getOrNull()
        }
        set(value) = prefs.edit {
            if (value == null) remove(KEY_USER) else putString(KEY_USER, ApiJson.encodeToString(User.serializer(), value))
        }

    /** The PKCE verifier of a Google sign-in in progress; kept on disk in case the app is stopped while the browser is open. */
    var pendingVerifier: String?
        get() = prefs.getString(KEY_VERIFIER, null)
        set(value) = prefs.edit { if (value == null) remove(KEY_VERIFIER) else putString(KEY_VERIFIER, value) }

    /** Stores a new token and returns the new session number. */
    fun start(token: String): Int {
        cachedToken = token
        val next = session + 1
        prefs.edit {
            putString(KEY_TOKEN, encrypt(token))
            putInt(KEY_SESSION, next)
        }
        return next
    }

    fun clear() {
        cachedToken = null
        prefs.edit {
            remove(KEY_TOKEN)
            remove(KEY_USER)
        }
    }

    private fun secretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build()
        )
        return generator.generateKey()
    }

    private fun encrypt(plain: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        return Base64.encodeToString(cipher.iv + cipher.doFinal(plain.toByteArray()), Base64.NO_WRAP)
    }

    /** Null when the stored value can't be decrypted, e.g. after the Keystore key was wiped. */
    private fun decrypt(stored: String): String? = try {
        val bytes = Base64.decode(stored, Base64.NO_WRAP)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(128, bytes, 0, IV_LENGTH))
        String(cipher.doFinal(bytes, IV_LENGTH, bytes.size - IV_LENGTH))
    } catch (e: GeneralSecurityException) {
        null
    } catch (e: IllegalArgumentException) {
        null
    }

    private companion object {
        const val KEYSTORE = "AndroidKeyStore"
        const val KEY_ALIAS = "session-token"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val IV_LENGTH = 12
        const val KEY_TOKEN = "token"
        const val KEY_SESSION = "session"
        const val KEY_USER = "user"
        const val KEY_VERIFIER = "google-verifier"
    }
}
