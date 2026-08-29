package com.tdrevans.nexttrain;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import org.json.JSONObject;

/** Home-screen widget — RemoteViews paint path (stable on all launchers). */
public class NextTrainWidgetProvider extends AppWidgetProvider {

  @Override
  public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
    CommuteRefreshService.paintFromCache(context);
    WidgetRefreshScheduler.ensureScheduled(context);
    CommuteRefreshService.refreshAll(context);
  }

  @Override
  public void onAppWidgetOptionsChanged(
    Context context,
    AppWidgetManager manager,
    int appWidgetId,
    Bundle newOptions
  ) {
    CommuteRefreshService.paintFromCache(context);
  }

  @Override
  public void onEnabled(Context context) {
    WidgetRefreshScheduler.ensureScheduled(context);
    WidgetRefreshScheduler.refreshSoon(context);
  }

  @Override
  public void onDisabled(Context context) {
    WidgetRefreshScheduler.cancel(context);
    WidgetLocalPaintScheduler.cancel(context);
    WidgetDepartureAdvanceScheduler.cancel(context);
  }

  public static void updateAllWidgets(Context context) {
    updateAllWidgets(context, WidgetSettingsStore.readSnapshot(context));
  }

  public static void updateAllWidgets(Context context, JSONObject snapshot) {
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    ComponentName component = new ComponentName(context, NextTrainWidgetProvider.class);
    int[] ids = manager.getAppWidgetIds(component);
    updateWidgets(context, manager, ids, snapshot);
  }

  public static void updateWidgetId(Context context, int widgetId) {
    if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
      return;
    }
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    JSONObject snapshot = WidgetSettingsStore.readSnapshot(context);
    updateWidgets(context, manager, new int[] { widgetId }, snapshot);
  }

  public static int widgetInstanceCount(Context context) {
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    ComponentName component = new ComponentName(context, NextTrainWidgetProvider.class);
    return manager.getAppWidgetIds(component).length;
  }

  private static void updateWidgets(
    Context context,
    AppWidgetManager manager,
    int[] appWidgetIds,
    JSONObject snapshot
  ) {
    for (int widgetId : appWidgetIds) {
      WidgetUiBuilder.WidgetSize size = WidgetUiBuilder.widgetSizeFor(context, manager, widgetId);
      manager.updateAppWidget(widgetId, WidgetUiBuilder.build(context, snapshot, size));
    }
  }

  public static void requestRefresh(Context context) {
    // onUpdate already repaints and queues a network refresh — no second
    // refreshSoon() here, which used to double-fetch per request.
    Intent intent = new Intent(context, NextTrainWidgetProvider.class);
    intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    ComponentName component = new ComponentName(context, NextTrainWidgetProvider.class);
    int[] ids = manager.getAppWidgetIds(component);
    intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
    context.sendBroadcast(intent);
  }
}
