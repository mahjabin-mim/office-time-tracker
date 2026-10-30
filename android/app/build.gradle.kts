import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

// Release builds are signed with the key that signed the Trusted Web Activity, so this app installs
// as an update over it. The values come from keystore.properties (gitignored) or the environment.
val signingProps = Properties().apply {
    rootProject.file("keystore.properties").takeIf { it.exists() }?.inputStream()?.use { load(it) }
}

fun signingValue(key: String, env: String): String? = signingProps.getProperty(key) ?: System.getenv(env)

android {
    namespace = "app.vercel.officetimetracker"
    compileSdk = 36

    defaultConfig {
        // Same ID as the Trusted Web Activity this app replaces.
        applicationId = "app.vercel.officetimetracker.twa"
        minSdk = 24
        targetSdk = 36
        versionCode = 4
        versionName = "2.0.0"

        // Point a build at another server with -PapiBaseUrl=http://10.0.2.2:3001 (the emulator's host).
        val apiBaseUrl = (findProperty("apiBaseUrl") as String?) ?: "https://officetimetracker.vercel.app"
        buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
    }

    signingConfigs {
        create("release") {
            signingValue("storeFile", "OTT_KEYSTORE")?.let { path ->
                storeFile = file(path)
                storePassword = signingValue("storePassword", "OTT_KEYSTORE_PASSWORD")
                keyAlias = signingValue("keyAlias", "OTT_KEY_ALIAS") ?: "android"
                keyPassword = signingValue("keyPassword", "OTT_KEY_PASSWORD") ?: storePassword
            }
        }
    }

    buildTypes {
        debug {
            // Installs next to the released app instead of replacing it.
            applicationIdSuffix = ".debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release").takeIf { it.storeFile != null }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // java.time on Android 7 (API 24-25).
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.06.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-core")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.browser:browser:1.10.0")
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")

    testImplementation("junit:junit:4.13.2")
}
