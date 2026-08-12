package com.tdrevans.nexttrain;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.TypedValue;
import android.widget.RemoteViews;
import org.json.JSONObject;

public final class WidgetUiBuilder {

  public static final String EMPTY_SETUP_PRIMARY = "Add a journey";
  public static final String EMPTY_SETUP_SUB = "Tap to set up";

  /** Outside-hours idle face — ~12% smaller than the live twin stack. */
  private static final float IDLE_LABEL_SP = 11f;
  private static final float IDLE_PRIMARY_SP = 31f;
  private static final float IDLE_DAY_WORD_SP = 13f;
  private static final float IDLE_ROUTE_SCALE = 0.88f;

  private static final float IDLE_LABEL_MEDIUM_SP = 12f;
  private static final float IDLE_PRIMARY_MEDIUM_SP = 36f;
  private static final float IDLE_DAY_WORD_MEDIUM_SP = 15f;

  private WidgetUiBuilder() {}

  public static RemoteViews build(Context context, JSONObject snapshot, int layoutId) {
    RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);
    if (snapshot != null && snapshot.optBoolean("widgetLocked", false)) {
      bindWidgetLocked(views, context, layoutId);
      return views;
    }
    if (snapshot == null || snapshot.optBoolean("empty", false)) {
      bindEmpty(views, context, layoutId);
      return views;
    }

    if (snapshot.optBoolean("nearbyFallback", false)) {
      bindNearbyFallback(views, context, layoutId);
      return views;
    }

    boolean medium = isMedium(layoutId);
    boolean stale = snapshot.optBoolean("stale", false);
    String label = snapshot.optString("label", "");
    String primary = snapshot.optString("primary", "—");
    String trainClock = snapshot.optString("trainClock", "");
    String secondary = snapshot.optString("secondary", "");
    String updatedRaw = snapshot.optString("updatedLine", "Updating…");
    String routeLine = resolveRouteLine(snapshot);
    String status = snapshot.optString("statusCrumb", "");
    boolean late = snapshot.optBoolean("late", false);
    boolean urgent = snapshot.optBoolean("urgent", false);

    // Small + medium share twin-face view IDs (primary_value / leave_* / route / updated).
    bindCompactPrimary(views, primary);
    String updated = medium
      ? resolveMediumUpdatedLine(updatedRaw, primary, secondary, stale)
      : "";

    restoreLiveLayoutChrome(views);
    views.setTextViewText(R.id.widget_label, label);

    if (!trainClock.isEmpty()) {
      views.setViewVisibility(R.id.widget_train_clock, android.view.View.VISIBLE);
      views.setTextViewText(R.id.widget_train_clock, trainClock);
    } else {
      views.setViewVisibility(R.id.widget_train_clock, android.view.View.GONE);
    }

    views.setTextColor(R.id.widget_primary_value, context.getColor(R.color.widget_accent));
    views.setTextColor(R.id.widget_primary_unit, context.getColor(R.color.widget_accent));

    int leaveColor = R.color.widget_text;
    if (late) {
      leaveColor = R.color.widget_late;
    } else if (urgent) {
      leaveColor = R.color.widget_urgent;
    }

    boolean outsideHoursIdle =
      snapshot.optBoolean("outsideHoursIdle", false) ||
      "Next Journey".equalsIgnoreCase(label) ||
      "Target Train".equalsIgnoreCase(label);
    if (outsideHoursIdle) {
      hideLeaveTwin(views);
      views.setViewVisibility(R.id.widget_secondary, android.view.View.GONE);
      bindOutsideHoursIdleFace(views, snapshot, layoutId);
      bindPreferredHint(views, "", layoutId);
      bindUpdatedFooter(views, "", layoutId);
    } else {
      views.setViewVisibility(R.id.widget_secondary, android.view.View.GONE);
      bindLiveFace(
        views,
        secondary,
        routeLine,
        false,
        context.getColor(leaveColor),
        status,
        layoutId
      );
      bindPreferredHint(views, snapshot.optString("preferredHint", ""), layoutId);
      bindUpdatedFooter(views, updated, layoutId);
    }

    views.setOnClickPendingIntent(R.id.widget_root, buildHomeTapIntent(context));
    return views;
  }

  /** Idle: preferred time + day word; full-width route; no Updated. */
  private static void bindOutsideHoursIdleFace(
    RemoteViews views,
    JSONObject snapshot,
    int layoutId
  ) {
    String route = snapshot.optString("route", "");
    if (route.isEmpty()) {
      route = snapshot.optString("stationLabel", "");
    }
    String dayWord = snapshot.optString("trainClock", "");
    hideLeaveTwin(views);
    views.setViewVisibility(R.id.widget_right_column, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_secondary, android.view.View.GONE);
    hideStatusIfPresent(views, layoutId);
    String primary = snapshot.optString("primary", "");
    applyIdleType(views, layoutId, primary);
    if (!dayWord.isEmpty() && dayWord.indexOf(':') < 0) {
      views.setViewVisibility(R.id.widget_train_clock, android.view.View.VISIBLE);
      views.setTextViewText(R.id.widget_train_clock, dayWord);
    } else {
      views.setViewVisibility(R.id.widget_train_clock, android.view.View.GONE);
      views.setTextViewText(R.id.widget_train_clock, "");
    }
    setTrainStackCentered(views, true);
    setBottomRouteGravity(views, true);
    if (!route.isEmpty()) {
      views.setViewVisibility(R.id.widget_route, android.view.View.VISIBLE);
      views.setTextViewText(R.id.widget_route, route);
      views.setTextViewTextSize(
        R.id.widget_route,
        TypedValue.COMPLEX_UNIT_SP,
        idleRouteLineTextSizeSp(route, layoutId)
      );
    } else {
      views.setViewVisibility(R.id.widget_route, android.view.View.GONE);
      views.setTextViewText(R.id.widget_route, "");
    }
  }

  /**
   * Live face: NEXT TRAIN | LEAVE IN twins; Station → Direction on the bottom.
   * Medium also shows delay status + Updated footer (bound separately).
   */
  private static void bindLiveFace(
    RemoteViews views,
    String leaveSecondary,
    String routeLine,
    boolean empty,
    int leaveColor,
    String status,
    int layoutId
  ) {
    views.setViewVisibility(R.id.widget_updated_left, android.view.View.GONE);
    applyLiveTwinType(views, layoutId);
    setTrainStackCentered(views, true);
    bindStatusCrumb(views, status, layoutId);

    LeaveParts leave = parseLeaveParts(empty ? "" : leaveSecondary);
    if (leave.visible) {
      views.setViewVisibility(R.id.widget_right_column, android.view.View.VISIBLE);
      views.setInt(
        R.id.widget_right_column,
        "setGravity",
        android.view.Gravity.CENTER_HORIZONTAL | android.view.Gravity.TOP
      );
      views.setViewVisibility(R.id.widget_leave_label, android.view.View.VISIBLE);
      views.setTextViewText(R.id.widget_leave_label, leave.label);
      views.setViewVisibility(R.id.widget_leave_row, android.view.View.VISIBLE);
      views.setTextViewText(R.id.widget_leave_value, leave.value);
      views.setTextColor(R.id.widget_leave_value, leaveColor);
      if (leave.unit.isEmpty()) {
        views.setViewVisibility(R.id.widget_leave_unit, android.view.View.GONE);
        views.setTextViewText(R.id.widget_leave_unit, "");
      } else {
        views.setViewVisibility(R.id.widget_leave_unit, android.view.View.VISIBLE);
        views.setTextViewText(R.id.widget_leave_unit, leave.unit);
        views.setTextColor(R.id.widget_leave_unit, leaveColor);
      }
    } else {
      hideLeaveTwin(views);
      views.setViewVisibility(R.id.widget_right_column, android.view.View.GONE);
    }

    setBottomRouteGravity(views, true);
    if (!empty && routeLine != null && !routeLine.isEmpty()) {
      views.setViewVisibility(R.id.widget_route, android.view.View.VISIBLE);
      views.setTextViewText(R.id.widget_route, routeLine);
      float floor = isMedium(layoutId) ? 14f : 13f;
      views.setTextViewTextSize(
        R.id.widget_route,
        TypedValue.COMPLEX_UNIT_SP,
        Math.max(floor, routeLineTextSizeSp(routeLine, layoutId))
      );
    } else {
      views.setViewVisibility(R.id.widget_route, android.view.View.GONE);
      views.setTextViewText(R.id.widget_route, "");
    }
  }

  private static void bindUpdatedFooter(RemoteViews views, String updated, int layoutId) {
    if (!shouldShowUpdatedLine(layoutId) || updated == null || updated.isEmpty()) {
      views.setViewVisibility(R.id.widget_updated, android.view.View.GONE);
      views.setTextViewText(R.id.widget_updated, "");
      return;
    }
    views.setViewVisibility(R.id.widget_updated, android.view.View.VISIBLE);
    views.setTextViewText(R.id.widget_updated, updated);
  }

  /** Medium only — quiet “Target 7:30” when Leave By is gated off for an earlier train. */
  private static void bindPreferredHint(RemoteViews views, String hint, int layoutId) {
    if (!isMedium(layoutId)) {
      return;
    }
    if (hint == null || hint.isEmpty()) {
      views.setViewVisibility(R.id.widget_preferred_hint, android.view.View.GONE);
      views.setTextViewText(R.id.widget_preferred_hint, "");
      return;
    }
    views.setViewVisibility(R.id.widget_preferred_hint, android.view.View.VISIBLE);
    views.setTextViewText(R.id.widget_preferred_hint, hint);
  }

  private static void bindStatusCrumb(RemoteViews views, String status, int layoutId) {
    if (!isMedium(layoutId)) {
      return;
    }
    if (status == null || status.isEmpty()) {
      views.setViewVisibility(R.id.widget_status, android.view.View.GONE);
      views.setTextViewText(R.id.widget_status, "");
    } else {
      views.setViewVisibility(R.id.widget_status, android.view.View.VISIBLE);
      views.setTextViewText(R.id.widget_status, status);
    }
  }

  private static void hideStatusIfPresent(RemoteViews views, int layoutId) {
    if (isMedium(layoutId)) {
      views.setViewVisibility(R.id.widget_status, android.view.View.GONE);
      views.setTextViewText(R.id.widget_status, "");
    }
  }

  private static void applyIdleType(RemoteViews views, int layoutId, String primary) {
    boolean medium = isMedium(layoutId);
    views.setTextViewTextSize(
      R.id.widget_label,
      TypedValue.COMPLEX_UNIT_SP,
      medium ? IDLE_LABEL_MEDIUM_SP : IDLE_LABEL_SP
    );
    views.setTextViewTextSize(
      R.id.widget_primary_value,
      TypedValue.COMPLEX_UNIT_SP,
      idlePrimaryTextSizeSp(primary, layoutId)
    );
    views.setTextViewTextSize(
      R.id.widget_train_clock,
      TypedValue.COMPLEX_UNIT_SP,
      medium ? IDLE_DAY_WORD_MEDIUM_SP : IDLE_DAY_WORD_SP
    );
    setTrainClockTopMargin(views, 0);
  }

  /** Window ranges (6:00–9:00) need a smaller primary than a short preferred clock (7:30). */
  static float idlePrimaryTextSizeSp(String primary, int layoutId) {
    boolean medium = isMedium(layoutId);
    float defaultSp = medium ? IDLE_PRIMARY_MEDIUM_SP : IDLE_PRIMARY_SP;
    if (primary == null || primary.isEmpty()) {
      return defaultSp;
    }
    if (primary.indexOf('–') < 0 && primary.indexOf('-') < 0) {
      return defaultSp;
    }
    int length = primary.length();
    if (medium) {
      if (length <= 9) {
        return 28f;
      }
      if (length <= 11) {
        return 24f;
      }
      return 22f;
    }
    if (length <= 9) {
      return 24f;
    }
    if (length <= 11) {
      return 20f;
    }
    return 18f;
  }

  private static void applyLiveTwinType(RemoteViews views, int layoutId) {
    boolean medium = isMedium(layoutId);
    float labelSp = medium ? 12f : 11f;
    float valueSp = medium ? 34f : 28f;
    float unitSp = medium ? 12f : 10f;
    float clockSp = medium ? 14f : 12f;
    views.setTextViewTextSize(R.id.widget_label, TypedValue.COMPLEX_UNIT_SP, labelSp);
    views.setTextViewTextSize(R.id.widget_leave_label, TypedValue.COMPLEX_UNIT_SP, labelSp);
    views.setTextViewTextSize(R.id.widget_primary_value, TypedValue.COMPLEX_UNIT_SP, valueSp);
    views.setTextViewTextSize(R.id.widget_leave_value, TypedValue.COMPLEX_UNIT_SP, valueSp);
    views.setTextViewTextSize(R.id.widget_primary_unit, TypedValue.COMPLEX_UNIT_SP, unitSp);
    views.setTextViewTextSize(R.id.widget_leave_unit, TypedValue.COMPLEX_UNIT_SP, unitSp);
    views.setTextViewTextSize(R.id.widget_train_clock, TypedValue.COMPLEX_UNIT_SP, clockSp);
    setTrainClockTopMargin(views, medium ? 2 : 1);
  }

  static float idleRouteLineTextSizeSp(String route) {
    return idleRouteLineTextSizeSp(route, R.layout.widget_small);
  }

  static float idleRouteLineTextSizeSp(String route, int layoutId) {
    float scale = isMedium(layoutId) ? 1f : IDLE_ROUTE_SCALE;
    float floor = isMedium(layoutId) ? 12f : 11f;
    return Math.max(floor, routeLineTextSizeSp(route, layoutId) * scale);
  }

  private static void setTrainClockTopMargin(RemoteViews views, int marginDp) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      views.setViewLayoutMargin(
        R.id.widget_train_clock,
        RemoteViews.MARGIN_TOP,
        marginDp,
        TypedValue.COMPLEX_UNIT_DIP
      );
    }
  }

  private static void hideLeaveTwin(RemoteViews views) {
    views.setViewVisibility(R.id.widget_leave_label, android.view.View.GONE);
    views.setTextViewText(R.id.widget_leave_label, "");
    views.setViewVisibility(R.id.widget_leave_row, android.view.View.GONE);
    views.setTextViewText(R.id.widget_leave_value, "");
    views.setViewVisibility(R.id.widget_leave_unit, android.view.View.GONE);
    views.setTextViewText(R.id.widget_leave_unit, "");
  }

  private static void setTrainStackCentered(RemoteViews views, boolean centered) {
    int gravity = centered
      ? android.view.Gravity.CENTER_HORIZONTAL
      : android.view.Gravity.START;
    views.setInt(R.id.widget_left_column, "setGravity", gravity);
  }

  private static void setBottomRouteGravity(RemoteViews views, boolean centered) {
    views.setInt(
      R.id.widget_route,
      "setGravity",
      centered ? android.view.Gravity.CENTER_HORIZONTAL : android.view.Gravity.START
    );
  }

  static final class LeaveParts {
    final boolean visible;
    final String label;
    final String value;
    final String unit;

    LeaveParts(boolean visible, String label, String value, String unit) {
      this.visible = visible;
      this.label = label;
      this.value = value;
      this.unit = unit;
    }
  }

  static LeaveParts parseLeaveParts(String secondary) {
    if (secondary == null || secondary.isEmpty()) {
      return new LeaveParts(false, "", "", "");
    }
    if ("Leave now".equals(secondary)) {
      return new LeaveParts(true, "LEAVE", "NOW", "");
    }
    if (secondary.startsWith("Leave in ") && secondary.endsWith(" min")) {
      String minutes =
        secondary.substring("Leave in ".length(), secondary.length() - " min".length()).trim();
      return new LeaveParts(true, "LEAVE IN", minutes, "min");
    }
    if ("Open app".equals(secondary)) {
      return new LeaveParts(true, "OPEN", "APP", "");
    }
    if ("Fetching next train…".equals(secondary) || "Fetching…".equals(secondary)) {
      return new LeaveParts(true, "UPDATING", "…", "");
    }
    return new LeaveParts(true, secondary.toUpperCase(java.util.Locale.US), "", "");
  }

  static float routeLineTextSizeSp(String route) {
    return routeLineTextSizeSp(route, R.layout.widget_small);
  }

  static float routeLineTextSizeSp(String route, int layoutId) {
    int length = route == null ? 0 : route.trim().length();
    boolean medium = isMedium(layoutId);
    if (length <= 20) {
      return medium ? 14f : 13f;
    }
    if (length <= 28) {
      return medium ? 13f : 12f;
    }
    return medium ? 12f : 11f;
  }

  static String visibleUpdatedLine(String updated, int layoutId) {
    if (!shouldShowUpdatedLine(layoutId)) {
      return "";
    }
    return updated == null ? "" : updated;
  }

  static WidgetSmallColumnPlan planSmallWidgetColumns(
    String secondary,
    String stationLabel,
    boolean empty
  ) {
    boolean hasLeave = parseLeaveParts(empty ? "" : secondary).visible;
    boolean hasStation = stationLabel != null && !stationLabel.isEmpty() && !empty;
    return new WidgetSmallColumnPlan(hasLeave, hasStation, hasLeave);
  }

  static final class WidgetSmallColumnPlan {
    final boolean showLeave;
    final boolean showStation;
    final boolean showRightColumn;

    WidgetSmallColumnPlan(boolean showLeave, boolean showStation, boolean showRightColumn) {
      this.showLeave = showLeave;
      this.showStation = showStation;
      this.showRightColumn = showRightColumn;
    }
  }

  static String resolveRouteLine(JSONObject snapshot) {
    if (snapshot == null) {
      return "";
    }
    String route = snapshot.optString("route", "").trim();
    if (!route.isEmpty()) {
      return route;
    }
    return snapshot.optString("stationLabel", "").trim();
  }

  static String compactLeaveSecondary(String secondary) {
    if (secondary == null || secondary.isEmpty()) {
      return secondary;
    }
    if ("Fetching next train…".equals(secondary)) {
      return "Fetching…";
    }
    if ("Open app".equals(secondary)) {
      return "Open";
    }
    if (secondary.startsWith("Leave in ") && secondary.endsWith(" min")) {
      String minutes = secondary.substring("Leave in ".length(), secondary.length() - " min".length());
      return "Leave in " + minutes + "m";
    }
    if (secondary.startsWith("Leave ") && secondary.endsWith(" min ago")) {
      String minutes = secondary.substring("Leave ".length(), secondary.length() - " min ago".length());
      return minutes + "m ago";
    }
    return secondary;
  }

  static boolean shouldShowUpdatedLine(int layoutId) {
    return isMedium(layoutId);
  }

  static boolean isMedium(int layoutId) {
    return layoutId == R.layout.widget_medium;
  }

  static final class PrimaryParts {
    final String value;
    final String unit;

    PrimaryParts(String value, String unit) {
      this.value = value;
      this.unit = unit;
    }
  }

  static PrimaryParts splitMinutesPrimary(String primary) {
    if (primary == null || primary.isEmpty()) {
      return new PrimaryParts("—", "");
    }
    if ("NOW".equals(primary)) {
      return new PrimaryParts("NOW", "");
    }
    if (primary.endsWith(" min")) {
      String digits = primary.substring(0, primary.length() - " min".length()).trim();
      if (!digits.isEmpty()) {
        return new PrimaryParts(digits, "min");
      }
    }
    return new PrimaryParts(compactPrimary(primary), "");
  }

  private static void bindCompactPrimary(RemoteViews views, String primary) {
    PrimaryParts parts = splitMinutesPrimary(primary);
    views.setTextViewText(R.id.widget_primary_value, parts.value);
    if (parts.unit.isEmpty()) {
      views.setViewVisibility(R.id.widget_primary_unit, android.view.View.GONE);
      views.setTextViewText(R.id.widget_primary_unit, "");
    } else {
      views.setViewVisibility(R.id.widget_primary_unit, android.view.View.VISIBLE);
      views.setTextViewText(R.id.widget_primary_unit, parts.unit);
    }
  }

  private static void bindEmpty(RemoteViews views, Context context, int layoutId) {
    boolean medium = isMedium(layoutId);
    views.setTextViewText(R.id.widget_label, "NEXT TRAIN");
    views.setTextViewTextSize(R.id.widget_label, TypedValue.COMPLEX_UNIT_SP, medium ? 12f : 11f);
    bindCompactPrimary(views, EMPTY_SETUP_PRIMARY);
    views.setTextViewTextSize(
      R.id.widget_primary_value,
      TypedValue.COMPLEX_UNIT_SP,
      medium ? 20f : 16f
    );
    views.setTextColor(R.id.widget_primary_value, context.getColor(R.color.widget_accent));
    views.setTextViewText(R.id.widget_train_clock, EMPTY_SETUP_SUB);
    views.setViewVisibility(R.id.widget_train_clock, android.view.View.VISIBLE);
    views.setTextViewTextSize(R.id.widget_train_clock, TypedValue.COMPLEX_UNIT_SP, medium ? 14f : 12f);
    views.setTextColor(R.id.widget_train_clock, context.getColor(R.color.widget_muted));
    hideLeaveTwin(views);
    hideStatusIfPresent(views, layoutId);
    bindPreferredHint(views, "", layoutId);
    views.setViewVisibility(R.id.widget_right_column, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_secondary, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_updated, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_updated_left, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_route, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_bottom_spacer, android.view.View.GONE);
    setTrainStackCentered(views, true);
    views.setInt(R.id.widget_root, "setGravity", android.view.Gravity.CENTER);
    views.setOnClickPendingIntent(R.id.widget_root, buildTapIntent(context, "new"));
  }

  private static void restoreLiveLayoutChrome(RemoteViews views) {
    views.setViewVisibility(R.id.widget_bottom_spacer, android.view.View.INVISIBLE);
    views.setInt(R.id.widget_root, "setGravity", android.view.Gravity.TOP);
  }

  /** Pro trial expired — calm locked face, not stale/error. */
  private static void bindWidgetLocked(RemoteViews views, Context context, int layoutId) {
    boolean medium = isMedium(layoutId);
    restoreLiveLayoutChrome(views);
    views.setTextViewText(R.id.widget_label, "NEXT TRAIN");
    views.setTextViewTextSize(R.id.widget_label, TypedValue.COMPLEX_UNIT_SP, medium ? 12f : 11f);
    views.setViewVisibility(R.id.widget_primary_unit, android.view.View.GONE);
    views.setTextViewText(R.id.widget_primary_value, "Widget paused");
    views.setTextViewTextSize(
      R.id.widget_primary_value,
      TypedValue.COMPLEX_UNIT_SP,
      medium ? 18f : 16f
    );
    views.setTextColor(R.id.widget_primary_value, context.getColor(R.color.widget_text));
    hideLeaveTwin(views);
    hideStatusIfPresent(views, layoutId);
    bindPreferredHint(views, "", layoutId);
    views.setViewVisibility(R.id.widget_right_column, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_secondary, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_updated, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_updated_left, android.view.View.GONE);
    views.setTextViewText(
      R.id.widget_train_clock,
      "Your Pro trial ended. Unlock once to keep leave-by on your home screen."
    );
    views.setViewVisibility(R.id.widget_train_clock, android.view.View.VISIBLE);
    views.setTextViewTextSize(R.id.widget_train_clock, TypedValue.COMPLEX_UNIT_SP, medium ? 13f : 12f);
    views.setTextColor(R.id.widget_train_clock, context.getColor(R.color.widget_muted));
    views.setInt(R.id.widget_train_clock, "setMaxLines", 3);
    views.setViewVisibility(R.id.widget_route, android.view.View.VISIBLE);
    views.setTextViewText(R.id.widget_route, "Unlock Pro");
    views.setTextColor(R.id.widget_route, context.getColor(R.color.widget_accent));
    views.setTextViewTextSize(R.id.widget_route, TypedValue.COMPLEX_UNIT_SP, medium ? 13f : 12f);
    setBottomRouteGravity(views, true);
    setTrainStackCentered(views, true);
    views.setOnClickPendingIntent(R.id.widget_root, buildPaywallTapIntent(context));
  }

  private static void bindNearbyFallback(RemoteViews views, Context context, int layoutId) {
    boolean medium = isMedium(layoutId);
    views.setTextViewText(R.id.widget_label, "NEAR ME");
    bindCompactPrimary(views, "Near me");
    views.setTextViewTextSize(R.id.widget_primary_value, TypedValue.COMPLEX_UNIT_SP, medium ? 28f : 22f);
    views.setTextViewTextSize(R.id.widget_label, TypedValue.COMPLEX_UNIT_SP, medium ? 12f : 11f);
    views.setTextColor(R.id.widget_primary_value, context.getColor(R.color.widget_accent));
    hideLeaveTwin(views);
    hideStatusIfPresent(views, layoutId);
    bindPreferredHint(views, "", layoutId);
    views.setViewVisibility(R.id.widget_right_column, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_bottom_spacer, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_route, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_updated, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_updated_left, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_secondary, android.view.View.GONE);
    views.setTextViewText(R.id.widget_train_clock, "See trains near you");
    views.setViewVisibility(R.id.widget_train_clock, android.view.View.VISIBLE);
    views.setTextViewTextSize(R.id.widget_train_clock, TypedValue.COMPLEX_UNIT_SP, medium ? 14f : 12f);
    setTrainStackCentered(views, true);
    views.setInt(R.id.widget_root, "setGravity", android.view.Gravity.CENTER);
    views.setOnClickPendingIntent(R.id.widget_root, buildHomeTapIntent(context));
  }

  public static PendingIntent buildPaywallTapIntent(Context context) {
    Intent intent = new Intent(context, MainActivity.class);
    intent.setAction(Intent.ACTION_VIEW);
    intent.setData(Uri.parse("nexttrain://paywall"));
    intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    return PendingIntent.getActivity(
      context,
      "paywall".hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }

  public static PendingIntent buildHomeTapIntent(Context context) {
    Intent intent = new Intent(context, MainActivity.class);
    intent.setAction(Intent.ACTION_VIEW);
    intent.setData(Uri.parse("nexttrain://home"));
    intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    return PendingIntent.getActivity(
      context,
      "home".hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
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

  public static PendingIntent buildNearbyTapIntent(Context context) {
    Intent intent = new Intent(context, MainActivity.class);
    intent.setAction(Intent.ACTION_VIEW);
    intent.setData(Uri.parse("nexttrain://nearby"));
    intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    return PendingIntent.getActivity(
      context,
      "nearby".hashCode(),
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
    return layoutForSizeDp(minWidth, minHeight);
  }

  /**
   * Size → layout. Default 2×1 is small. ≈3×1 (wide) or ≈2×2 (tall) → medium
   * with Updated line and larger type.
   */
  static int layoutForSizeDp(int minWidthDp, int minHeightDp) {
    return minWidthDp >= 250 || minHeightDp >= 110
      ? R.layout.widget_medium
      : R.layout.widget_small;
  }

  static String resolveMediumUpdatedLine(
    String updated,
    String primary,
    String secondary,
    boolean stale
  ) {
    if ("Updating…".equals(primary) || "Fetching next train…".equals(secondary)) {
      return "";
    }
    if ("Refreshing…".equals(updated)) {
      return updated;
    }
    if (CommuteSchedule.DEGRADED_SECONDARY.equals(secondary) || stale) {
      return "Times may be out of date";
    }
    if (updated == null || updated.isEmpty() || updated.startsWith("Updating")) {
      return "";
    }
    return updated;
  }

  static String compactPrimary(String primary) {
    if ("Updating…".equals(primary)) {
      return "…";
    }
    return primary;
  }
}
