# NORTHSTAR iOS secure-content host

This folder contains the native host bridge for authenticated Canvas pages and external LTI assessments.

## Why a native host is needed

The GitHub Pages PWA can display a Canvas session URL in its in-dashboard iframe as a compatibility fallback. Safari may still block third-party cookies, and Canvas/provider pages can refuse iframe embedding. A native host can present the same Canvas-generated URL as a **top-level WKWebView page** inside NORTHSTAR, so the provider sees a normal first-party navigation context while the student remains in the NORTHSTAR app.

## Integrate the bridge

1. Add `NorthstarSecureContentPresenter.swift` to the iOS application's Xcode target.
2. Keep a strong reference to the presenter on the view controller that owns the main NORTHSTAR dashboard WKWebView:

```swift
private let secureContentPresenter = NorthstarSecureContentPresenter()

override func viewDidLoad() {
    super.viewDidLoad()
    secureContentPresenter.install(into: dashboardWebView, from: self)
}
```

3. Call `secureContentPresenter.uninstall()` when permanently tearing down the dashboard web view.
4. The dashboard must be loaded from `https://s0ndvyr.github.io`. For a different trusted production host, initialize the presenter with that exact host name.

The dashboard JavaScript calls `window.webkit.messageHandlers.northstarSecureContent.postMessage({ action: "open", url, title })`. The native presenter verifies the message originates from the main frame of the trusted HTTPS dashboard origin, accepts HTTPS destinations only, and presents a full-screen content controller with back, forward, reload and close controls.

## Session behavior

The secure content controller uses `WKWebsiteDataStore.default()` rather than a non-persistent data store. This lets Canvas and the LTI provider use normal persistent website data inside the app's WKWebView environment. The controller never receives or forwards the NORTHSTAR Canvas API bearer token. It only navigates to the short-lived session URL returned by Canvas or to the HTTPS sessionless launch URL returned by Canvas's external-tools API.

## Important boundaries

- Add this source to a real iOS host target before expecting the native bridge to be available. GitHub Pages alone cannot create a native WKWebView.
- The PWA iframe remains available as a best-effort fallback but cannot bypass provider frame restrictions or browser cookie privacy rules.
- The provider still owns its assessment, identity checks, editor, answer state, timer and final submission. NORTHSTAR owns the surrounding assignment context and return navigation.
- Use only Canvas-generated session URLs and launch URLs returned by the private Worker. Do not store them in localStorage, logs, analytics or assignment drafts.
- Canvas and provider authentication may still require the student to complete a normal school login/SSO step within the secure view.
