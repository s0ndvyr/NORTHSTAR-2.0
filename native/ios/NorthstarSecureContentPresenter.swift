import UIKit
import WebKit

/// Installs the JavaScript-to-native bridge used by NORTHSTAR's authenticated Canvas/LTI views.
///
/// Retain this presenter as a property of the host view controller. The handler accepts messages
/// only from the main frame of the trusted NORTHSTAR HTTPS origin.
@MainActor
public final class NorthstarSecureContentPresenter: NSObject, WKScriptMessageHandler {
    public static let handlerName = "northstarSecureContent"

    private weak var hostViewController: UIViewController?
    private weak var dashboardWebView: WKWebView?
    private let trustedDashboardHost: String

    public init(trustedDashboardHost: String = "s0ndvyr.github.io") {
        self.trustedDashboardHost = trustedDashboardHost
        super.init()
    }

    public func install(into dashboardWebView: WKWebView, from hostViewController: UIViewController) {
        self.dashboardWebView = dashboardWebView
        self.hostViewController = hostViewController

        let controller = dashboardWebView.configuration.userContentController
        controller.removeScriptMessageHandler(forName: Self.handlerName)
        controller.add(self, name: Self.handlerName)
    }

    public func uninstall() {
        dashboardWebView?.configuration.userContentController.removeScriptMessageHandler(forName: Self.handlerName)
        dashboardWebView = nil
        hostViewController = nil
    }

    public func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == Self.handlerName,
              message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.protocol == "https",
              message.frameInfo.securityOrigin.host == trustedDashboardHost,
              message.frameInfo.securityOrigin.port == 443,
              let payload = message.body as? [String: Any],
              (payload["action"] as? String) == "open",
              let rawURL = payload["url"] as? String,
              rawURL.count <= 12_000,
              let url = URL(string: rawURL),
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              components.scheme == "https",
              components.host != nil,
              components.user == nil,
              components.password == nil,
              let hostViewController,
              hostViewController.presentedViewController == nil
        else {
            return
        }

        let title = (payload["title"] as? String).map { String($0.prefix(160)) } ?? "Canvas experience"
        let contentController = NorthstarSecureContentViewController(url: url, title: title)
        contentController.modalPresentationStyle = .fullScreen
        hostViewController.present(contentController, animated: true)
    }
}

/// A top-level, persistent WKWebView for Canvas session-token URLs and Canvas-generated LTI launches.
///
/// This is deliberately not an iframe. Top-level navigation gives Canvas and the provider a
/// first-party web context inside the app, while preserving NORTHSTAR's own close/back controls.
@MainActor
private final class NorthstarSecureContentViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private let initialURL: URL
    private let pageTitle: String

    private lazy var contentWebView: WKWebView = {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = WKWebsiteDataStore.default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        return webView
    }()

    private let titleLabel = UILabel()
    private let backButton = UIButton(type: .system)
    private let forwardButton = UIButton(type: .system)
    private let reloadButton = UIButton(type: .system)

    init(url: URL, title: String) {
        self.initialURL = url
        self.pageTitle = title
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        buildToolbar()
        view.addSubview(contentWebView)

        NSLayoutConstraint.activate([
            contentWebView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            contentWebView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            contentWebView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 54),
            contentWebView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        contentWebView.load(URLRequest(url: initialURL, cachePolicy: .reloadIgnoringLocalCacheData))
    }

    private func buildToolbar() {
        let toolbar = UIView()
        toolbar.translatesAutoresizingMaskIntoConstraints = false
        toolbar.backgroundColor = .secondarySystemBackground
        view.addSubview(toolbar)

        titleLabel.text = pageTitle
        titleLabel.font = .systemFont(ofSize: 14, weight: .semibold)
        titleLabel.textColor = .label
        titleLabel.numberOfLines = 1
        titleLabel.lineBreakMode = .byTruncatingTail
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        configure(backButton, title: "‹", accessibility: "Go back", action: #selector(goBack))
        configure(forwardButton, title: "›", accessibility: "Go forward", action: #selector(goForward))
        configure(reloadButton, title: "↻", accessibility: "Reload page", action: #selector(reloadPage))

        let closeButton = UIButton(type: .system)
        configure(closeButton, title: "Done", accessibility: "Close Canvas experience", action: #selector(closePage))
        closeButton.titleLabel?.font = .systemFont(ofSize: 14, weight: .semibold)

        let navigation = UIStackView(arrangedSubviews: [backButton, forwardButton, reloadButton])
        navigation.axis = .horizontal
        navigation.spacing = 10
        navigation.alignment = .center
        navigation.translatesAutoresizingMaskIntoConstraints = false

        toolbar.addSubview(navigation)
        toolbar.addSubview(titleLabel)
        toolbar.addSubview(closeButton)
        closeButton.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            toolbar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            toolbar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            toolbar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            toolbar.heightAnchor.constraint(equalToConstant: 54),

            navigation.leadingAnchor.constraint(equalTo: toolbar.leadingAnchor, constant: 14),
            navigation.centerYAnchor.constraint(equalTo: toolbar.centerYAnchor),

            titleLabel.leadingAnchor.constraint(equalTo: navigation.trailingAnchor, constant: 12),
            titleLabel.centerYAnchor.constraint(equalTo: toolbar.centerYAnchor),
            titleLabel.trailingAnchor.constraint(lessThanOrEqualTo: closeButton.leadingAnchor, constant: -12),

            closeButton.trailingAnchor.constraint(equalTo: toolbar.trailingAnchor, constant: -16),
            closeButton.centerYAnchor.constraint(equalTo: toolbar.centerYAnchor)
        ])
    }

    private func configure(_ button: UIButton, title: String, accessibility: String, action: Selector) {
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 19, weight: .medium)
        button.accessibilityLabel = accessibility
        button.addTarget(self, action: action, for: .touchUpInside)
    }

    @objc private func goBack() {
        if contentWebView.canGoBack { contentWebView.goBack() }
    }

    @objc private func goForward() {
        if contentWebView.canGoForward { contentWebView.goForward() }
    }

    @objc private func reloadPage() {
        contentWebView.reload()
    }

    @objc private func closePage() {
        dismiss(animated: true)
    }

    private func refreshNavigationControls() {
        backButton.isEnabled = contentWebView.canGoBack
        forwardButton.isEnabled = contentWebView.canGoForward
        backButton.alpha = contentWebView.canGoBack ? 1 : 0.35
        forwardButton.alpha = contentWebView.canGoForward ? 1 : 0.35
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        refreshNavigationControls()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        refreshNavigationControls()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        refreshNavigationControls()
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        if url.scheme?.lowercased() == "https", url.user == nil, url.password == nil {
            decisionHandler(.allow)
            return
        }

        if let scheme = url.scheme?.lowercased(), ["mailto", "tel"].contains(scheme) {
            UIApplication.shared.open(url)
        }
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        // Canvas and LTI providers often use target="_blank" for help, authentication or resources.
        // Keep those navigations in this same top-level secure view.
        if navigationAction.targetFrame == nil, let url = navigationAction.request.url, url.scheme?.lowercased() == "https", url.user == nil, url.password == nil {
            webView.load(navigationAction.request)
        }
        return nil
    }
}
