# kotlinx.serialization ships its own keep rules; nothing extra is needed for the API models.
# OkHttp references optional TLS providers that aren't on Android.
-dontwarn org.bouncycastle.jsse.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**
