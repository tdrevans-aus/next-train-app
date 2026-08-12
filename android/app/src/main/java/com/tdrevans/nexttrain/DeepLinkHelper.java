package com.tdrevans.nexttrain;

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
}
