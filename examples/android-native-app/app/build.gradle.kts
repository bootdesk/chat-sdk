plugins {
    id("com.android.application")
    kotlin("android")
}

android {
    namespace = "com.bootdesk.chatexample"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.bootdesk.chatexample"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(project(":chat-widget"))
    implementation("androidx.appcompat:appcompat:1.7.0")
}
