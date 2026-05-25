package com.bootdesk.chatexample

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import com.bootdesk.chatwidget.BridgeConfig
import com.bootdesk.chatwidget.ChatWidgetView
import com.bootdesk.chatwidget.PushSubscriptionStatus

private const val DEFAULT_CHAT_URL = "https://example.com/chat-iframe"

class MainActivity : AppCompatActivity() {
    private lateinit var root: FrameLayout
    private lateinit var bubble: View
    private lateinit var chat: ChatWidgetView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)

        val chatUrl = intent.getStringExtra("CHAT_URL") ?: DEFAULT_CHAT_URL
        val density = resources.displayMetrics.density

        bubble = TextView(this).apply {
            text = "\uD83D\uDCAC"
            textSize = 28f
            gravity = Gravity.CENTER
            val d = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#6366f1"))
            }
            background = d
            elevation = density * 6
            setTextColor(Color.WHITE)
            setOnClickListener { toggleChat() }
        }

        chat = ChatWidgetView(this).apply {
            onReady = {
                sendPushState(PushSubscriptionStatus.UNSUPPORTED)
            }
            onMessage = { }
            onClose = { toggleChat() }
            onPushSubscribe = {
                sendPushState(PushSubscriptionStatus.UNSUPPORTED)
            }
            onPushUnsubscribe = {
                sendPushState(PushSubscriptionStatus.UNSUPPORTED)
            }
            visibility = View.GONE
        }
        chat.load(chatUrl, BridgeConfig(title = "Chat", locale = "en"))

        root = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
        }

        root.addView(bubble, FrameLayout.LayoutParams(
            (density * 56).toInt(),
            (density * 56).toInt(),
            Gravity.BOTTOM or Gravity.END,
        ).apply {
            setMargins(0, 0, (density * 24).toInt(), (density * 48).toInt())
        })

        root.addView(chat, ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
        ))

        setContentView(root)

        WebView.setWebContentsDebuggingEnabled(true)
    }

    private fun toggleChat() {
        if (chat.visibility == View.VISIBLE) {
            chat.visibility = View.GONE
            bubble.visibility = View.VISIBLE
        } else {
            chat.visibility = View.VISIBLE
            bubble.visibility = View.GONE
        }
    }
}
