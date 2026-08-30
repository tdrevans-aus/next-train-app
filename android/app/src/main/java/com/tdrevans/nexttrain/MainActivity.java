package com.tdrevans.nexttrain;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import io.sentry.capacitor.SentryCapacitor;

public class MainActivity extends BridgeActivity {

  public static final String EXTRA_WIDGET_CONFIGURE = "nexttrain_widget_configure";
  public static final String EXTRA_WIDGET_CONFIGURE_ID = "nexttrain_widget_configure_id";

  // CONFIGURATION_CHANGED / WALLPAPER_CHANGED are never delivered to manifest
  // receivers, so the wallpaper-mode repaint listens at runtime while the app
  // lives; unlock and alarm repaints cover theme flips that happen in between.
  private WidgetSystemThemeReceiver systemThemeReceiver;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(WidgetSyncPlugin.class);
    registerPlugin(LeaveReminderPlugin.class);
    // Ensure SentryCapacitor is on the bridge even if capacitor.plugins.json is stale.
    registerPlugin(SentryCapacitor.class);
    // Capture before the WebView boots so JS cannot consume a still-empty pending URI.
    DeepLinkHelper.capture(getIntent());
    super.onCreate(savedInstanceState);
    registerSystemThemeReceiver();
    boolean debugAction = DeepLinkHelper.applyDebugActions(this, getIntent());
    if (!debugAction) {
      // Sticky QA latch was skipping real leave-by and arming +60s instead.
      LeaveReminderSettingsStore.setFastTestEnabled(this, false);
    }

    getOnBackPressedDispatcher().addCallback(
      this,
      new OnBackPressedCallback(true) {
        @Override
        public void handleOnBackPressed() {
          if (WidgetConfigureBridge.isActive()) {
            WidgetConfigureBridge.finish(false);
            notifyWidgetConfigureFinished(false);
            return;
          }

          if (WidgetSyncPlugin.isWidgetSetupOverlayActive()) {
            notifyWidgetConfigureFinished(false);
            return;
          }

          WebView webView = getBridge().getWebView();
          if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
          }

          setEnabled(false);
          getOnBackPressedDispatcher().onBackPressed();
        }
      }
    );
  }

  @Override
  public void onDestroy() {
    if (systemThemeReceiver != null) {
      try {
        unregisterReceiver(systemThemeReceiver);
      } catch (Exception error) {
        // Already unregistered.
      }
      systemThemeReceiver = null;
    }
    super.onDestroy();
  }

  private void registerSystemThemeReceiver() {
    if (systemThemeReceiver != null) {
      return;
    }
    systemThemeReceiver = new WidgetSystemThemeReceiver();
    android.content.IntentFilter filter = new android.content.IntentFilter();
    filter.addAction(Intent.ACTION_WALLPAPER_CHANGED);
    filter.addAction(Intent.ACTION_CONFIGURATION_CHANGED);
    androidx.core.content.ContextCompat.registerReceiver(
      this,
      systemThemeReceiver,
      filter,
      androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED
    );
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    DeepLinkHelper.capture(intent);
    DeepLinkHelper.applyDebugActions(this, intent);
    CommuteRefreshService.repaintFromCache(this);
    CommuteRefreshService.refreshAll(this);
    notifyWidgetConfigurePending();
  }

  @Override
  public void onStart() {
    super.onStart();
    if (BuildConfig.DEBUG && getBridge() != null) {
      WebView webView = getBridge().getWebView();
      if (webView != null) {
        webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
      }
    }
  }

  @Override
  public void onResume() {
    super.onResume();
    CommuteRefreshService.repaintFromCache(this);
    CommuteRefreshService.refreshAll(this);
    notifyWidgetConfigurePending();
  }

  private void notifyWidgetConfigurePending() {
    if (!WidgetConfigureBridge.isActive()
      && !getIntent().getBooleanExtra(EXTRA_WIDGET_CONFIGURE, false)) {
      return;
    }
    if (getBridge() == null) {
      return;
    }
    getBridge().triggerJSEvent("widgetConfigurePending", "{}");
  }

  private void notifyWidgetConfigureFinished(boolean ok) {
    if (getBridge() == null) {
      return;
    }
    com.getcapacitor.JSObject payload = new com.getcapacitor.JSObject();
    payload.put("ok", ok);
    getBridge().triggerJSEvent("widgetConfigureFinished", payload.toString());
  }
}
