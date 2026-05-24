package com.bootdesk.chatwidget

import android.webkit.ValueCallback
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class ChatWidgetViewTest {
    /** Load a minimal HTML page, wait for shim injection, return the latch. */
    private fun loadPage(chatView: ChatWidgetView): CountDownLatch {
        val latch = CountDownLatch(1)
        val original = chatView.webView.webViewClient
        chatView.webView.webViewClient =
            object : WebViewClient() {
                override fun onPageFinished(
                    view: WebView,
                    url: String,
                ) {
                    original.onPageFinished(view, url)
                    latch.countDown()
                }
            }
        chatView.load("data:text/html,<html><body>test</body></html>")
        return latch
    }

    @Test
    fun shimInjectsOnPageLoad() {
        val scenario = ActivityScenario.launch(TestActivity::class.java)

        scenario.onActivity { activity ->
            val chatView = ChatWidgetView(activity)
            activity.setContentView(chatView)

            val pageLatch = loadPage(chatView)
            assertTrue(pageLatch.await(15, TimeUnit.SECONDS))

            val checkLatch = CountDownLatch(1)
            chatView.webView.evaluateJavascript(
                "JSON.stringify(!!window.__chatBridge)",
                ValueCallback { result ->
                    assertEquals("true", result)
                    checkLatch.countDown()
                },
            )
            assertTrue(checkLatch.await(5, TimeUnit.SECONDS))
        }

        scenario.close()
    }

    @Test
    fun chatReadyTriggersCallback() {
        val scenario = ActivityScenario.launch(TestActivity::class.java)
        val readyLatch = CountDownLatch(1)

        scenario.onActivity { activity ->
            val chatView =
                ChatWidgetView(activity).also { cv ->
                    cv.onReady = { readyLatch.countDown() }
                }
            activity.setContentView(chatView)

            val pageLatch = loadPage(chatView)
            assertTrue(pageLatch.await(15, TimeUnit.SECONDS))

            chatView.webView.evaluateJavascript(
                "window.AndroidBridge.postMessage('{\"type\":\"chat-ready\"}');",
                null,
            )
        }

        assertTrue(readyLatch.await(5, TimeUnit.SECONDS))
        scenario.close()
    }

    @Test
    fun sendConfigStoresOnWindow() {
        val scenario = ActivityScenario.launch(TestActivity::class.java)

        scenario.onActivity { activity ->
            val chatView = ChatWidgetView(activity)
            activity.setContentView(chatView)

            val pageLatch = loadPage(chatView)
            assertTrue(pageLatch.await(15, TimeUnit.SECONDS))

            chatView.sendConfig(BridgeConfig(title = "Support", locale = "en"))

            val verifyLatch = CountDownLatch(1)
            chatView.webView.evaluateJavascript(
                "JSON.stringify(window.__chatBridge._config)",
                ValueCallback { result ->
                    assertNotNull(result)
                    assertTrue(result?.contains("Support") == true)
                    assertTrue(result?.contains("en") == true)
                    verifyLatch.countDown()
                },
            )
            assertTrue(verifyLatch.await(5, TimeUnit.SECONDS))
        }

        scenario.close()
    }

    @Test
    fun sendPushStateUpdatesWindow() {
        val scenario = ActivityScenario.launch(TestActivity::class.java)

        scenario.onActivity { activity ->
            val chatView = ChatWidgetView(activity)
            activity.setContentView(chatView)

            val pageLatch = loadPage(chatView)
            assertTrue(pageLatch.await(15, TimeUnit.SECONDS))

            chatView.sendPushState(PushSubscriptionStatus.SUBSCRIBED)

            val verifyLatch = CountDownLatch(1)
            chatView.webView.evaluateJavascript(
                "JSON.stringify({ status: window.__chatBridge._pushState })",
                ValueCallback { result ->
                    assertNotNull(result)
                    assertTrue(result?.contains("subscribed") == true)
                    verifyLatch.countDown()
                },
            )
            assertTrue(verifyLatch.await(5, TimeUnit.SECONDS))
        }

        scenario.close()
    }

    @Test
    fun notifyNotificationClickedDispatchesEvent() {
        val scenario = ActivityScenario.launch(TestActivity::class.java)

        scenario.onActivity { activity ->
            val chatView = ChatWidgetView(activity)
            activity.setContentView(chatView)

            val pageLatch = loadPage(chatView)
            assertTrue(pageLatch.await(15, TimeUnit.SECONDS))

            chatView.notifyNotificationClicked()

            val verifyLatch = CountDownLatch(1)
            chatView.webView.evaluateJavascript(
                "JSON.stringify(window.__chatBridge._cached)",
                ValueCallback { result ->
                    assertNotNull(result)
                    assertTrue(result?.contains("chat-notification-clicked") == true)
                    verifyLatch.countDown()
                },
            )
            assertTrue(verifyLatch.await(5, TimeUnit.SECONDS))
        }

        scenario.close()
    }

    @Test
    fun chatMessageCallbackReceivesMessages() {
        val scenario = ActivityScenario.launch(TestActivity::class.java)
        val messageLatch = CountDownLatch(1)
        var receivedText = ""

        scenario.onActivity { activity ->
            val chatView =
                ChatWidgetView(activity).also { cv ->
                    cv.onMessage = { text ->
                        receivedText = text
                        messageLatch.countDown()
                    }
                }
            activity.setContentView(chatView)

            val pageLatch = loadPage(chatView)
            assertTrue(pageLatch.await(15, TimeUnit.SECONDS))

            chatView.webView.evaluateJavascript(
                "window.AndroidBridge.postMessage('{\"type\":\"chat-message\",\"text\":\"Hello from JS\"}');",
                null,
            )
        }

        assertTrue(messageLatch.await(5, TimeUnit.SECONDS))
        assertEquals("Hello from JS", receivedText)
        scenario.close()
    }

    @Test
    fun pushSubscribeCallbackIsInvoked() {
        val scenario = ActivityScenario.launch(TestActivity::class.java)
        val latch = CountDownLatch(1)

        scenario.onActivity { activity ->
            val chatView =
                ChatWidgetView(activity).also { cv ->
                    cv.onPushSubscribe = { latch.countDown() }
                }
            activity.setContentView(chatView)

            val pageLatch = loadPage(chatView)
            assertTrue(pageLatch.await(15, TimeUnit.SECONDS))

            chatView.webView.evaluateJavascript(
                "window.AndroidBridge.postMessage('{\"type\":\"chat-push-subscribe\"}');",
                null,
            )
        }

        assertTrue(latch.await(5, TimeUnit.SECONDS))
        scenario.close()
    }
}
