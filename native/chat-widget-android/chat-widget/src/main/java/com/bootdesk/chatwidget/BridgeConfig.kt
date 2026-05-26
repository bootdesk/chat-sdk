package com.bootdesk.chatwidget

enum class ThemeMode {
    AUTO,
    LIGHT,
    DARK,
}

data class ThemeConfig(
    val mode: ThemeMode? = null,
)

data class BridgeConfig(
    val title: String? = null,
    val locale: String? = null,
    val placeholder: String? = null,
    val theme: ThemeConfig? = null,
)
