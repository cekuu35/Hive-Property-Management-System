# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep line numbers for debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ================================
# Capacitor Core Rules
# ================================
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorMethod *;
}

# ================================
# WebView & JavaScript Interface
# ================================
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keepattributes JavascriptInterface
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
}
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String);
}

# ================================
# AndroidX & Support Libraries
# ================================
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# ================================
# Gson (for JSON serialization)
# ================================
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# ================================
# Cordova Plugins
# ================================
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin

# ================================
# Capacitor Plugins
# ================================
-keep class io.ionic.** { *; }
-dontwarn io.ionic.**

# Keep all native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# ================================
# Optimization Settings
# ================================
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

# Remove logging for release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# ================================
# Keep Model/DTO Classes
# ================================
# Add your model classes here if you have any that use reflection
# -keep class your.package.models.** { *; }
