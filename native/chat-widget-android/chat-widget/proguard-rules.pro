# Keep the bridge interface methods accessible from JavaScript
-keepclassmembers class com.bootdesk.chatwidget.BridgeInterface {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep the Shim object accessible for WEBVIEW_SHIM injection
-keep class com.bootdesk.chatwidget.Shim { *; }
