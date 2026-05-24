package com.bootdesk.chatwidget

import android.webkit.JavascriptInterface
import org.json.JSONObject

class BridgeInterface(
    private val onMessage: (JSONObject) -> Unit,
) {
    @JavascriptInterface
    fun postMessage(json: String) {
        onMessage(JSONObject(json))
    }
}
