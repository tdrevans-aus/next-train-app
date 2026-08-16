package com.tdrevans.nexttrain;

import android.appwidget.AppWidgetManager;

/** Pending launcher widget configure session (FB-37). */
public final class WidgetConfigureBridge {

  private static WidgetConfigureActivity activity;
  private static int appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

  private WidgetConfigureBridge() {}

  public static void bind(WidgetConfigureActivity configureActivity, int widgetId) {
    activity = configureActivity;
    appWidgetId = widgetId;
  }

  public static boolean isActive() {
    return activity != null && appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID;
  }

  public static int getAppWidgetId() {
    return appWidgetId;
  }

  public static void finish(boolean ok) {
    if (activity == null) {
      return;
    }
    activity.finishConfigure(ok);
    clear();
  }

  public static void clear() {
    activity = null;
    appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;
  }
}
