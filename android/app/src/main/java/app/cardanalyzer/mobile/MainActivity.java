package app.cardanalyzer.mobile;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/**
 * Local bundled user interface, never a remote website wrapper. No broad storage
 * permissions, no cleartext, and no remote pages inside the privileged WebView.
 */
public final class MainActivity extends Activity {
    private static final String ASSET_ORIGIN = "https://appassets.androidplatform.net";
    private static final String HOME = ASSET_ORIGIN + "/assets/web/index.html";
    private static final int IMPORT_FILE = 4201;
    private static final int EXPORT_FILE = 4202;
    private static final int MAX_REQUEST = 24 * 1024 * 1024;
    private static final int MAX_RESPONSE = 32 * 1024 * 1024;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newFixedThreadPool(4);
    private final Map<String, HttpURLConnection> connections = new ConcurrentHashMap<>();
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] exportBytes;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        webView = new WebView(this);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.addJavascriptInterface(new HttpBridge(), "AndroidHttp");
        webView.addJavascriptInterface(new ExportBridge(), "AndroidExport");
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                if (ASSET_ORIGIN.equals(uri.getScheme() + "://" + uri.getAuthority())) {
                    WebResourceResponse local = loader.shouldInterceptRequest(uri);
                    if (local != null) return local;
                }
                // Other content cannot become a privileged iframe/script under our origin.
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked",
                    java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (request.isForMainFrame() && isLocal(uri)) return false;
                if (request.isForMainFrame() && ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
                    catch (Exception ignored) { }
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try { startActivityForResult(params.createIntent(), IMPORT_FILE); return true; }
                catch (Exception e) { fileCallback = null; callback.onReceiveValue(null); return false; }
            }
        });
        setContentView(webView);
        if (Build.VERSION.SDK_INT >= 30) {
            webView.setOnApplyWindowInsetsListener((view, insets) -> {
                Insets area = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(area.left, area.top, area.right, area.bottom);
                return insets;
            });
        } else {
            webView.setFitsSystemWindows(true);
        }
        webView.loadUrl(HOME);
    }

    private boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme())
            && "appassets.androidplatform.net".equals(uri.getHost())
            && uri.getPath() != null && uri.getPath().startsWith("/assets/web/");
    }

    @Override protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code == IMPORT_FILE) {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
                fileCallback = null;
            }
        } else if (code == EXPORT_FILE) {
            byte[] bytes = exportBytes;
            exportBytes = null;
            if (result == RESULT_OK && data != null && data.getData() != null && bytes != null) {
                Uri output = data.getData();
                io.execute(() -> {
                    try (OutputStream stream = getContentResolver().openOutputStream(output, "w")) {
                        if (stream == null) throw new IllegalStateException("No export stream");
                        stream.write(bytes);
                    } catch (Exception e) { ui.post(() -> android.widget.Toast.makeText(this, "Export failed.", android.widget.Toast.LENGTH_LONG).show()); }
                });
            }
        }
    }

    private void sendResult(String id, int status, String body, String error) {
        ui.post(() -> {
            if (webView == null) return;
            String js = "window.__playNativeResponse(" + JSONObject.quote(id)
                + "," + status + "," + JSONObject.quote(body) + "," + JSONObject.quote(error) + ")";
            webView.evaluateJavascript(js, null);
        });
    }

    private final class HttpBridge {
        @JavascriptInterface public void request(String id, String method, String url,
                                                 String headersJson, String body) {
            io.execute(() -> {
                HttpURLConnection connection = null;
                try {
                    URI target = URI.create(url);
                    if (!"https".equalsIgnoreCase(target.getScheme()) ||
                        target.getHost() == null || target.getUserInfo() != null)
                        throw new SecurityException("Only verified HTTPS provider URLs are allowed.");
                    if (!"GET".equals(method) && !"POST".equals(method))
                        throw new SecurityException("Unsupported request method.");
                    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                    if (bytes.length > MAX_REQUEST) throw new IllegalArgumentException("Request too large.");
                    connection = (HttpURLConnection) new URL(url).openConnection();
                    connections.put(id, connection);
                    connection.setConnectTimeout(30000);
                    connection.setReadTimeout(300000);
                    connection.setInstanceFollowRedirects(false);
                    connection.setRequestMethod(method);
                    JSONObject headers = new JSONObject(headersJson);
                    for (String key : headers.keySet()) {
                        if (!key.matches("(?i)Content-Type|Authorization|HTTP-Referer|X-Title|Accept"))
                            continue;
                        connection.setRequestProperty(key, headers.optString(key));
                    }
                    if ("POST".equals(method)) {
                        connection.setDoOutput(true);
                        try (OutputStream out = connection.getOutputStream()) { out.write(bytes); }
                    }
                    int status = connection.getResponseCode();
                    // Redirects are deliberately not followed, avoiding credentials leaking to another host.
                    try (InputStream in = status >= 400 ? connection.getErrorStream() : connection.getInputStream()) {
                        String text = "";
                        if (in != null) {
                            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                            byte[] chunk = new byte[8192]; int n;
                            while ((n = in.read(chunk)) != -1) {
                                if (buffer.size() + n > MAX_RESPONSE) throw new IllegalStateException("Response too large.");
                                buffer.write(chunk, 0, n);
                            }
                            text = buffer.toString("UTF-8");
                        }
                        sendResult(id, status, text, "");
                    }
                } catch (Exception e) {
                    sendResult(id, 0, "", e.getClass().getSimpleName() + ": " + e.getMessage());
                } finally {
                    connections.remove(id);
                    if (connection != null) connection.disconnect();
                }
            });
        }

        @JavascriptInterface public void cancel(String id) {
            HttpURLConnection connection = connections.remove(id);
            if (connection != null) connection.disconnect();
        }
    }

    private final class ExportBridge {
        @JavascriptInterface public void saveText(String filename, String content, String mime) {
            if (content == null) return;
            byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
            if (bytes.length > MAX_RESPONSE) {
                ui.post(() -> android.widget.Toast.makeText(MainActivity.this, "Export too large.", android.widget.Toast.LENGTH_LONG).show());
                return;
            }
            String safeName = filename == null ? "card-analyzer-report.txt" : filename.replaceAll("[^a-zA-Z0-9._-]", "_");
            if (safeName.trim().isEmpty()) safeName = "card-analyzer-report.txt";
            final String name = safeName;
            final String type = "application/json".equals(mime) ? "application/json"
                : "text/markdown".equals(mime) ? "text/markdown" : "text/plain";
            ui.post(() -> {
                exportBytes = bytes;
                Intent choose = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                choose.addCategory(Intent.CATEGORY_OPENABLE);
                choose.setType(type);
                choose.putExtra(Intent.EXTRA_TITLE, name);
                try { startActivityForResult(choose, EXPORT_FILE); }
                catch (Exception ignored) { exportBytes = null; }
            });
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        for (HttpURLConnection connection : connections.values()) connection.disconnect();
        io.shutdownNow();
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidHttp");
            webView.removeJavascriptInterface("AndroidExport");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
