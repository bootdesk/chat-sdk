package com.bootdesk.chatwidget

import org.junit.Assert.assertEquals
import org.junit.Test

class PushSubscriptionStatusTest {
    @Test
    fun `all enum values have lowercase names`() {
        for (status in PushSubscriptionStatus.entries) {
            val lower = status.name.lowercase()
            assertEquals(
                "Expected ${status.name}.lowercase() to be $lower",
                lower,
                status.name.lowercase(),
            )
        }
    }

    @Test
    fun `enum values match expected raw string values`() {
        assertEquals("unsupported", PushSubscriptionStatus.UNSUPPORTED.name.lowercase())
        assertEquals("default", PushSubscriptionStatus.DEFAULT.name.lowercase())
        assertEquals("subscribed", PushSubscriptionStatus.SUBSCRIBED.name.lowercase())
        assertEquals("denied", PushSubscriptionStatus.DENIED.name.lowercase())
        assertEquals("subscribing", PushSubscriptionStatus.SUBSCRIBING.name.lowercase())
        assertEquals("error", PushSubscriptionStatus.ERROR.name.lowercase())
    }

    @Test
    fun `all 6 enum values are present`() {
        assertEquals(6, PushSubscriptionStatus.entries.size)
    }
}
