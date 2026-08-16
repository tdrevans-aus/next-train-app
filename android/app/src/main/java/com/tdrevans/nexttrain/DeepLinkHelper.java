package com.tdrevans.nexttrain;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;

public final class DeepLinkHelper {

  private DeepLinkHelper() {}

  public static void capture(Intent intent) {
    if (intent == null) {
      return;
    }

    Uri data = intent.getData();
    if (data == null) {
      return;
    }

    if (!"nexttrain".equals(data.getScheme())) {
      return;
    }

    String host = data.getHost();
    if (BuildConfig.DEBUG && "test".equals(host) && "/seed".equals(data.getPath())) {
      WidgetSyncPlugin.setPendingDeepLink(data.toString());
      return;
    }

    if (!"journey".equals(host) && !"nearby".equals(host) && !"home".equals(host) && !"paywall".equals(host)) {
      return;
    }

    WidgetSyncPlugin.setPendingDeepLink(data.toString());
  }

  /**
   * Debug-only deep links that mutate native state (not forwarded to the WebView).
   * Returns true when a debug action was applied.
   */
  public static boolean applyDebugActions(Context context, Intent intent) {
    if (!BuildConfig.DEBUG || intent == null) {
      return false;
    }

    Uri data = intent.getData();
    if (data == null || !"nexttrain".equals(data.getScheme()) || !"test".equals(data.getHost())) {
      return false;
    }

    String path = data.getPath();
    if ("/reminder-fast".equals(path)) {
      boolean enabled = !"1".equals(data.getQueryParameter("off"));
      LeaveReminderSettingsStore.setFastTestEnabled(context, enabled);
      CommuteRefreshService.refreshAll(context);
      return true;
    }

    return false;
  }
}
