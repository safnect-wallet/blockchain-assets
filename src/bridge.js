function setupWKWebViewJavascriptBridge(callback) {
  if (window.WKWebViewJavascriptBridge) {
    return callback(WKWebViewJavascriptBridge)
  }
  if (window.WKWVJBCallbacks) {
    return window.WKWVJBCallbacks.push(callback)
  }
  window.WKWVJBCallbacks = [callback]
  window.webkit.messageHandlers.iOS_Native_InjectJavascript.postMessage(null)
}

export function connectWebViewJavascriptBridge(callback) {
  if (window.WebViewJavascriptBridge && WebViewJavascriptBridge.inited) {
      callback(WebViewJavascriptBridge)
  } else if (window.webkit) { 
    setupWKWebViewJavascriptBridge(callback)
  } else {
    document.addEventListener(
          'WebViewJavascriptBridgeReady',
          function() {
            callback(WebViewJavascriptBridge)
          },
          false
      );
  }
}

let _hasBridgeMessageHandlerInit = false
export function initBridgeMessageHandler () {
  if (_hasBridgeMessageHandlerInit) return;
  connectWebViewJavascriptBridge(function(bridge) {
    bridge.init(function(message, responseCb) {
      _hasBridgeMessageHandlerInit = true
    })
  })
}
