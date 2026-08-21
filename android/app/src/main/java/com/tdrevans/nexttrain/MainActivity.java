package com.tdrevans.nexttrain;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  public static final String EXTRA_WIDGET_CONFIGURE = "nexttrain_widget_configure";
  public static final String EXTRA_WIDGET_CONFIGURE_ID = "nexttrain_widget_configure_id";

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(WidgetSyncPlugin.class);
    registerPlugin(LeaveReminderPlugin.class);
    super.onCreate(savedInstanceState);
    DeepLinkHelper.capture(getIntent());
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
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    DeepLinkHelper.capture(intent);
    DeepLinkHelper.applyDebugActions(this, intent);
    CommuteRefreshService.repaintFromCache(this);
    CommuteRefreshService.refreshAll(this);
  }

  @Override
  public void onResume() {
    super.onResume();
    CommuteRefreshService.repaintFromCache(this);
    CommuteRefreshService.refreshAll(this);
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
