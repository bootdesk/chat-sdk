package com.bootdesk.chatwidget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class BridgeConfigTest {
    @Test
    fun `default BridgeConfig has all null fields`() {
        val config = BridgeConfig()
        assertNull(config.title)
        assertNull(config.locale)
        assertNull(config.placeholder)
        assertNull(config.theme)
    }

    @Test
    fun `BridgeConfig with title stores it`() {
        val config = BridgeConfig(title = "Support")
        assertEquals("Support", config.title)
    }

    @Test
    fun `BridgeConfig with locale stores it`() {
        val config = BridgeConfig(locale = "pt-BR")
        assertEquals("pt-BR", config.locale)
    }

    @Test
    fun `BridgeConfig with placeholder stores it`() {
        val config = BridgeConfig(placeholder = "Type a message")
        assertEquals("Type a message", config.placeholder)
    }

    @Test
    fun `BridgeConfig with theme stores theme with mode`() {
        val theme = ThemeConfig(mode = ThemeMode.DARK)
        val config = BridgeConfig(theme = theme)
        assertEquals(ThemeMode.DARK, config.theme?.mode)
    }

    @Test
    fun `ThemeConfig defaults to null mode`() {
        val theme = ThemeConfig()
        assertNull(theme.mode)
    }

    @Test
    fun `ThemeConfig with mode stores it`() {
        assertEquals(ThemeMode.AUTO, ThemeConfig(mode = ThemeMode.AUTO).mode)
        assertEquals(ThemeMode.LIGHT, ThemeConfig(mode = ThemeMode.LIGHT).mode)
        assertEquals(ThemeMode.DARK, ThemeConfig(mode = ThemeMode.DARK).mode)
    }
}
