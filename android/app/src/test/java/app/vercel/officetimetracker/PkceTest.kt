package app.vercel.officetimetracker

import app.vercel.officetimetracker.data.Pkce
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PkceTest {
    /** The server only accepts this shape (APP_CHALLENGE_PATTERN in src/lib/mobile-api.ts). */
    private val serverPattern = Regex("^[A-Za-z0-9_-]{43}$")

    @Test
    fun challengeMatchesTheServersHash() {
        // Expected value from: printf %s <verifier> | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '='
        assertEquals(
            "qJh-JGD6ApGVeBqDgCF49FbGtHE6oin84yFQnUFjPeY",
            Pkce.challenge("dBjftJeZ4CVP-mJ92K9GBBhtHPwCH6tc4WchK7RaT8bfi"),
        )
    }

    @Test
    fun verifiersAreRandomAndChallengesHaveTheServersShape() {
        val first = Pkce.newVerifier()
        val second = Pkce.newVerifier()
        assertNotEquals(first, second)
        assertTrue(serverPattern.matches(first))
        assertTrue(serverPattern.matches(Pkce.challenge(first)))
    }
}
