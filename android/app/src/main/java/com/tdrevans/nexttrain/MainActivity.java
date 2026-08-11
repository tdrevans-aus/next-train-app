package com.tdrevans.nexttrain;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(CommuteModePlugin.class);
    registerPlugin(WidgetSyncPlugin.class);
    registerPlugin(LeaveReminderPlugin.class);
    super.onCreate(savedInstanceState);
    DeepLinkHelper.capture(getIntent());

    getOnBackPressedDispatcher().addCallback(
      this,
      new OnBackPressedCallback(true) {
        @Override
        public void handleOnBackPressed() {
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
    CommuteRefreshService.repaintFromCache(this);
    CommuteRefreshService.refreshAll(this);
  }

  @Override
  public void onResume() {
    super.onResume();
    CommuteRefreshService.repaintFromCache(this);
    CommuteRefreshService.refreshAll(this);
  }
}
