package com.tdrevans.nexttrain;

import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.os.SystemClock;

/** Repaint widgets when wallpaper or night mode changes while Match system is active (FB-38). */
public final class WidgetSystemThemeReceiver extends android.content.BroadcastReceiver {

  private static final long CONFIG_DEBOUNCE_MS = 2000L;
  private static long lastConfigRefreshMs = 0L;
  private static int lastNightMode = -1;

  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null || intent.getAction() == null) {
      return;
    }
    if (!WidgetThemePalette.isSystemThemeActive(context)) {
      return;
    }

    String action = intent.getAction();
    if (Intent.ACTION_WALLPAPER_CHANGED.equals(action)) {
      CommuteRefreshService.refreshAll(context);
      return;
    }

    if (Intent.ACTION_CONFIGURATION_CHANGED.equals(action)) {
      int nightMode =
        context.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
      if (lastNightMode == -1) {
        lastNightMode = nightMode;
        return;
      }
      if (nightMode == lastNightMode) {
        return;
      }
      long now = SystemClock.elapsedRealtime();
      if (now - lastConfigRefreshMs < CONFIG_DEBOUNCE_MS) {
        return;
      }
      lastConfigRefreshMs = now;
      lastNightMode = nightMode;
      CommuteRefreshService.refreshAll(context);
    }
  }
}
