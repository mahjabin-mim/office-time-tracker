package app.vercel.officetimetracker.data

import okio.ByteString.Companion.encodeUtf8
import okio.ByteString.Companion.toByteString
import java.security.SecureRandom

/**
 * PKCE for Google sign-in. The website hands the app a short-lived code through the
 * officetimetracker:// redirect, and only redeems it with the verifier behind the challenge it was
 * started with (sha256Base64Url in src/lib/google.ts), so another app catching the redirect can't.
 */
object Pkce {
    fun newVerifier(): String = ByteArray(32).also { SecureRandom().nextBytes(it) }.toByteString().base64Url().trimEnd('=')

    /** base64url(SHA-256(verifier)) without padding: 43 characters. */
    fun challenge(verifier: String): String = verifier.encodeUtf8().sha256().base64Url().trimEnd('=')
}
