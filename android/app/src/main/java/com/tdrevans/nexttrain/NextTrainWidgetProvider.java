package com.tdrevans.nexttrain;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import org.json.JSONObject;

public class NextTrainWidgetProvider extends AppWidgetProvider {

  @Override
  public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
    CommuteRefreshService.refreshAll(context);
    JSONObject snapshot = WidgetSettingsStore.readSnapshot(context);
    if (snapshot != null) {
      updateWidgets(context, manager, appWidgetIds, snapshot);
    }
    WidgetRefreshScheduler.ensureScheduled(context);
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

  public static void updateAllWidgets(Context context, JSONObject snapshot) {
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    ComponentName component = new ComponentName(context, NextTrainWidgetProvider.class);
    int[] ids = manager.getAppWidgetIds(component);
    updateWidgets(context, manager, ids, snapshot);
  }

  private static void updateWidgets(
    Context context,
    AppWidgetManager manager,
    int[] appWidgetIds,
    JSONObject snapshot
  ) {
    for (int widgetId : appWidgetIds) {
      int layoutId = WidgetUiBuilder.layoutForWidget(context, manager, widgetId);
      manager.updateAppWidget(
        widgetId,
        WidgetUiBuilder.build(context, snapshot, layoutId)
      );
    }
  }

  public static void requestRefresh(Context context) {
    Intent intent = new Intent(context, NextTrainWidgetProvider.class);
    intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    ComponentName component = new ComponentName(context, NextTrainWidgetProvider.class);
    int[] ids = manager.getAppWidgetIds(component);
    intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
    context.sendBroadcast(intent);
    WidgetRefreshScheduler.refreshSoon(context);
  }
}
