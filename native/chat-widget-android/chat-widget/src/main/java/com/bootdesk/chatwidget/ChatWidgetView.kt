package com.bootdesk.chatwidget

import android.annotation.SuppressLint
import android.content.Context
import android.net.Uri
import android.util.AttributeSet
import android.view.Gravity
import android.view.ViewGroup
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import androidx.annotation.VisibleForTesting
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import org.json.JSONObject

private const val BRIDGE_NAME = "AndroidBridge"

@SuppressLint("SetJavaScriptEnabled")
class ChatWidgetView
    @JvmOverloads
    constructor(
        context: Context,
        attrs: AttributeSet? = null,
        defStyleAttr: Int = 0,
    ) : FrameLayout(context, attrs, defStyleAttr) {
        var onMessage: ((String) -> Unit)? = null
        var onClose: (() -> Unit)? = null
        var onReady: (() -> Unit)? = null
        var onPushSubscribe: (() -> Unit)? = null
        var onPushUnsubscribe: (() -> Unit)? = null

        @VisibleForTesting
        internal val webView: WebView

        private val spinner: ProgressBar

        private val bridgeInterface =
            BridgeInterface { json ->
                handleBridgeMessage(json)
            }

        init {
            webView =
                WebView(context).apply {
                    layoutParams =
                        LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT,
                        )
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.allowFileAccess = false

                    addJavascriptInterface(bridgeInterface, BRIDGE_NAME)

                    webViewClient =
                        object : WebViewClient() {
                            override fun onPageFinished(
                                view: WebView,
                                url: String,
                            ) {
                                super.onPageFinished(view, url)
                                injectShim()
                            }
                        }

                    webChromeClient =
                        object : WebChromeClient() {
                            override fun onShowFileChooser(
                                view: WebView,
                                filePathCallback: ValueCallback<Array<Uri>>,
                                fileChooserParams: FileChooserParams,
                            ): Boolean {
                                return false // let host override
                            }
                        }
                }

            addView(webView)

            spinner =
                ProgressBar(context, null, android.R.attr.progressBarStyleLarge).apply {
                    layoutParams =
                        LayoutParams(
                            ViewGroup.LayoutParams.WRAP_CONTENT,
                            ViewGroup.LayoutParams.WRAP_CONTENT,
                            Gravity.CENTER,
                        )
                }
            addView(spinner)

            ViewCompat.setOnApplyWindowInsetsListener(this) { _, insets ->
                val imeInsets = insets.getInsets(WindowInsetsCompat.Type.ime())
                val bars =
                    insets.getInsets(
                        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout(),
                    )
                setPadding(bars.left, bars.top, bars.right, bars.bottom + imeInsets.bottom)
                insets
            }
        }

        fun load(
            url: String,
            config: BridgeConfig? = null,
        ) {
            webView.loadUrl(url)
            pendingConfig = config
        }

        fun sendConfig(config: BridgeConfig) {
            val json =
                JSONObject().apply {
                    put("type", "chat-config")
                    config.title?.let { put("title", it) }
                    config.locale?.let { put("locale", it) }
                    config.placeholder?.let { put("placeholder", it) }
                    config.theme?.let { theme ->
                        put(
                            "theme",
                            JSONObject().apply {
                                theme.mode?.let { put("mode", it.name.lowercase()) }
                            },
                        )
                    }
                }
            evaluateBridgeEvent(json.toString())
        }

        fun notifyNotificationClicked() {
            val json = """{"type":"chat-notification-clicked"}"""
            evaluateBridgeEvent(json)
        }

        fun sendPushState(status: PushSubscriptionStatus) {
            val json =
                JSONObject().apply {
                    put("type", "chat-push-state")
                    put("status", status.name.lowercase())
                }
            evaluateBridgeEvent(json.toString())
        }

        private var pendingConfig: BridgeConfig? = null
        private var shimInjected = false

        private fun injectShim() {
            if (shimInjected) return
            shimInjected = true

            val viewportJs =
                context.resources
                    .openRawResource(R.raw.viewport_shim)
                    .bufferedReader()
                    .readText()
            val webviewJs =
                context.resources
                    .openRawResource(R.raw.webview_shim)
                    .bufferedReader()
                    .readText()
            webView.evaluateJavascript(viewportJs, null)
            webView.evaluateJavascript(webviewJs, null)

            pendingConfig?.let { config ->
                sendConfig(config)
                pendingConfig = null
            }
        }

        private fun evaluateBridgeEvent(json: String) {
            val js = "window.dispatchEvent(new CustomEvent('chat-bridge', { detail: $json }));"
            webView.evaluateJavascript(js, null)
        }

        private fun handleBridgeMessage(json: JSONObject) {
            val type = json.optString("type")

            when (type) {
                "chat-ready" -> {
                    spinner.visibility = GONE
                    onReady?.invoke()
                }

                "chat-message" -> {
                    val text = json.optString("text")
                    if (text.isNotEmpty()) onMessage?.invoke(text)
                }

                "chat-close" -> {
                    post { onClose?.invoke() }
                }

                "chat-push-subscribe" -> {
                    onPushSubscribe?.invoke()
                }

                "chat-push-unsubscribe" -> {
                    onPushUnsubscribe?.invoke()
                }
            }
        }
    }
