package app.vercel.officetimetracker.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle

// The website's palette (tailwind.config.ts and the CSS variables in src/app/globals.css).

private val Light = lightColorScheme(
    primary = Color(0xFF6A2FF5),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFEBE6FF),
    onPrimaryContainer = Color(0xFF3D1A8C),
    secondary = Color(0xFF5A20D6),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFEBE6FF),
    onSecondaryContainer = Color(0xFF3D1A8C),
    background = Color(0xFFFAF9FD),
    onBackground = Color(0xFF181726),
    surface = Color(0xFFFAF9FD),
    onSurface = Color(0xFF181726),
    surfaceVariant = Color(0xFFEDECF4),
    onSurfaceVariant = Color(0xFF6A687D),
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color.White,
    surfaceContainer = Color(0xFFF3F2F9),
    surfaceContainerHigh = Color(0xFFEDECF4),
    surfaceContainerHighest = Color(0xFFE6E4F0),
    outline = Color(0xFFCFCCDD),
    outlineVariant = Color(0xFFE2E0EB),
    error = Color(0xFFE63754),
    onError = Color.White,
)

private val Dark = darkColorScheme(
    primary = Color(0xFF987AFF),
    onPrimary = Color(0xFF1C0B52),
    primaryContainer = Color(0xFF3D1A8C),
    onPrimaryContainer = Color(0xFFD8CFFF),
    secondary = Color(0xFFBAA9FF),
    onSecondary = Color(0xFF1C0B52),
    secondaryContainer = Color(0xFF2C1A66),
    onSecondaryContainer = Color(0xFFD8CFFF),
    background = Color(0xFF0B0C19),
    onBackground = Color(0xFFF2F2F8),
    surface = Color(0xFF0B0C19),
    onSurface = Color(0xFFF2F2F8),
    surfaceVariant = Color(0xFF1F2033),
    onSurfaceVariant = Color(0xFF9C9CB4),
    surfaceContainerLowest = Color(0xFF090A14),
    surfaceContainerLow = Color(0xFF121323),
    surfaceContainer = Color(0xFF17182A),
    surfaceContainerHigh = Color(0xFF1F2033),
    surfaceContainerHighest = Color(0xFF26273B),
    outline = Color(0xFF3A3B52),
    outlineVariant = Color(0xFF26273B),
    error = Color(0xFFF5667E),
    onError = Color(0xFF2B0710),
)

/** Colors for day statuses, beyond what the Material scheme covers. */
@Immutable
data class StatusColors(
    val extra: Color,
    val less: Color,
    val warning: Color,
    val leave: Color,
    val halfDay: Color,
)

private val LightStatus = StatusColors(
    extra = Color(0xFF239F71),
    less = Color(0xFFE63754),
    warning = Color(0xFFD97706),
    leave = Color(0xFF7C3AED),
    halfDay = Color(0xFF0284C7),
)

private val DarkStatus = StatusColors(
    extra = Color(0xFF3ECC97),
    less = Color(0xFFF5667E),
    warning = Color(0xFFFBBF24),
    leave = Color(0xFFC4B5FD),
    halfDay = Color(0xFF7DD3FC),
)

private val LocalStatusColors = staticCompositionLocalOf { LightStatus }

object AppTheme {
    val status: StatusColors
        @Composable get() = LocalStatusColors.current
}

/** Lines numbers up in columns, like the website's tabular-nums. */
val TabularNumbers = TextStyle(fontFeatureSettings = "tnum")

@Composable
fun OfficeTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    CompositionLocalProvider(LocalStatusColors provides if (dark) DarkStatus else LightStatus) {
        MaterialTheme(
            colorScheme = if (dark) Dark else Light,
            typography = Typography(),
            content = content,
        )
    }
}
