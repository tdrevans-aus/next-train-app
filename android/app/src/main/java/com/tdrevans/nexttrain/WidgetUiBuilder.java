package com.tdrevans.nexttrain;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;
import org.json.JSONObject;

public final class WidgetUiBuilder {

  private WidgetUiBuilder() {}

  public static RemoteViews build(Context context, JSONObject snapshot, int layoutId) {
    RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);
    if (snapshot == null) {
      bindEmpty(views, context);
      return views;
    }

    boolean empty = snapshot.optBoolean("empty", false);
    String label = snapshot.optString("label", "");
    String primary = snapshot.optString("primary", "—");
    String trainClock = snapshot.optString("trainClock", "");
    String secondary = snapshot.optString("secondary", "");
    String stationLabel = snapshot.optString("stationLabel", "");
    if (stationLabel.isEmpty()) {
      // Older cached snapshots may only have full route — prefer station side if "→" present.
      String route = snapshot.optString("route", "");
      int arrow = route.indexOf('→');
      stationLabel = arrow >= 0 ? route.substring(0, arrow).trim() : route;
    }
    String updated = snapshot.optString("updatedLine", "Updating…");
    String status = snapshot.optString("statusCrumb", "");
    boolean late = snapshot.optBoolean("late", false);
    boolean urgent = snapshot.optBoolean("urgent", false);

    views.setTextViewText(R.id.widget_label, label);
    views.setTextViewText(R.id.widget_primary, primary);
    views.setTextViewText(R.id.widget_train_clock, trainClock);
    views.setTextViewText(R.id.widget_secondary, secondary);
    views.setTextViewText(R.id.widget_updated, updated);

    // Train number stays brand accent; leave line carries urgency (matches main screen).
    views.setTextColor(R.id.widget_primary, context.getColor(R.color.widget_accent));
    int leaveColor = R.color.widget_text;
    if (late) {
      leaveColor = R.color.widget_late;
    } else if (urgent) {
      leaveColor = R.color.widget_urgent;
    }
    views.setTextColor(R.id.widget_secondary, context.getColor(leaveColor));

    if (trainClock.isEmpty() || empty) {
      views.setViewVisibility(R.id.widget_train_clock, android.view.View.GONE);
    } else {
      views.setViewVisibility(R.id.widget_train_clock, android.view.View.VISIBLE);
    }

    if (secondary.isEmpty()) {
      views.setViewVisibility(R.id.widget_secondary, android.view.View.GONE);
    } else {
      views.setViewVisibility(R.id.widget_secondary, android.view.View.VISIBLE);
    }

    // Station only (not full route) — fits 2×1; no swipe between trains.
    if (!stationLabel.isEmpty() && !empty) {
      views.setViewVisibility(R.id.widget_route, android.view.View.VISIBLE);
      views.setTextViewText(R.id.widget_route, stationLabel);
    } else if (layoutId == R.layout.widget_medium && !empty) {
      String fallback = snapshot.optString("journeyName", "");
      if (!fallback.isEmpty()) {
        views.setViewVisibility(R.id.widget_route, android.view.View.VISIBLE);
        views.setTextViewText(R.id.widget_route, fallback);
      } else {
        views.setViewVisibility(R.id.widget_route, android.view.View.GONE);
      }
    } else {
      views.setViewVisibility(R.id.widget_route, android.view.View.GONE);
    }

    if (layoutId == R.layout.widget_medium) {
      if (status.isEmpty()) {
        views.setViewVisibility(R.id.widget_status, android.view.View.GONE);
      } else {
        views.setViewVisibility(R.id.widget_status, android.view.View.VISIBLE);
        views.setTextViewText(R.id.widget_status, status);
      }
    }

    String journeyId = snapshot.optString("journeyId", "new");
    views.setOnClickPendingIntent(R.id.widget_root, buildTapIntent(context, journeyId));
    return views;
  }

  private static void bindEmpty(RemoteViews views, Context context) {
    views.setTextViewText(R.id.widget_label, "NEXT TRAIN");
    views.setTextViewText(R.id.widget_primary, "Add journey");
    views.setTextViewText(R.id.widget_train_clock, "");
    views.setViewVisibility(R.id.widget_train_clock, android.view.View.GONE);
    views.setTextViewText(R.id.widget_secondary, "Save your journey");
    views.setTextViewText(R.id.widget_updated, "");
    views.setOnClickPendingIntent(R.id.widget_root, buildTapIntent(context, "new"));
  }

  public static PendingIntent buildTapIntent(Context context, String journeyId) {
    String path = "new".equals(journeyId) ? "/new" : "/" + journeyId;
    Intent intent = new Intent(context, MainActivity.class);
    intent.setAction(Intent.ACTION_VIEW);
    intent.setData(Uri.parse("nexttrain://journey" + path));
    intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    return PendingIntent.getActivity(
      context,
      journeyId.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }

  public static int layoutForWidget(Context context, AppWidgetManager manager, int widgetId) {
    int minWidth = 110;
    int minHeight = 40;
    try {
      android.os.Bundle options = manager.getAppWidgetOptions(widgetId);
      if (options != null) {
        minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, minWidth);
        minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, minHeight);
      }
    } catch (Exception ignored) {
      // Use compact layout.
    }
    // Wide or tall enough → medium; default 2×1 strip stays small.
    return minWidth >= 250 || minHeight >= 110 ? R.layout.widget_medium : R.layout.widget_small;
  }
}
