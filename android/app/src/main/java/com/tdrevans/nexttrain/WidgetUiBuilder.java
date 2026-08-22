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

  public static final String EMPTY_SETUP_PRIMARY = "Set up widget";
  public static final String EMPTY_SETUP_SUB = "In the app";
  public static final String UNSET_PIN_PRIMARY = "Pin a train";
  public static final String UNSET_PIN_SUB = "Press to start";

  /** Outside-hours idle — sized for default 2×1; same on larger cells (no upscale). */
  private static final float IDLE_LABEL_SP = 8f;
  private static final float IDLE_PRIMARY_SP = 24f;
  private static final float IDLE_PRIMARY_WITH_DAY_SP = 22f;
  private static final float IDLE_DAY_WORD_SP = 9f;
  private static final float IDLE_ROUTE_FLOOR_SP = 9f;

  /** Cell dimensions used when painting RemoteViews (dp from AppWidgetManager options). */
  public static final class WidgetSize {
    public final int widthDp;
    public final int heightDp;
    public final int layoutId;

    public WidgetSize(int widthDp, int heightDp, int layoutId) {
      this.widthDp = widthDp;
      this.heightDp = heightDp;
      this.layoutId = layoutId;
    }

    public boolean isMedium() {
      return WidgetUiBuilder.isMedium(layoutId);
    }

    public boolean isTallCell() {
      return heightDp >= 100;
    }

    public boolean isShortCell() {
      return heightDp < 55;
    }

    /** Bump type on tall medium cells (≈2×2); 3×1 wide stays at 1.0. */
    public float typeScale() {
      if (!isMedium()) {
        return 1f;
      }
      if (heightDp >= 140) {
        return 1.45f;
      }
      if (heightDp >= 120) {
        return 1.35f;
      }
      if (heightDp >= 100) {
        return 1.28f;
      }
      if (heightDp >= 80) {
        return 1.08f;
      }
      return 1f;
    }

    public boolean useTallIdleLayout() {
      return false;
    }
  }

  private WidgetUiBuilder() {}

  private static float scaleSp(float baseSp, float scale) {
    if (scale <= 1f) {
      return baseSp;
    }
    return baseSp * scale;
  }

  /**
   * Outside-hours idle twin (preferred clock / next window). Live "Target Train" must not
   * match here — same label, different face ({@code outsideHoursIdle} flag is required).
   */
  static boolean isOutsideHoursIdleFace(JSONObject snapshot) {
    if (snapshot == null) {
      return false;
    }
    if (snapshot.optBoolean("outsideHoursIdle", false)) {
      return true;
    }
    // Legacy idle without the flag — "Next Journey" is idle-only; "Target Train" is not.
    return "Next Journey".equalsIgnoreCase(snapshot.optString("label", ""));
  }

  /** FB-40: palette from appearance mode (blend → theme id; brand → default; wallpaper → Monet). */
  public static WidgetThemePalette resolveAppearancePalette(Context context) {
    String mode = WidgetAppearanceMode.read(context);
    if (WidgetAppearanceMode.MODE_WALLPAPER.equals(mode)) {
      return WidgetThemePalette.resolve(context, WidgetThemePalette.ID_SYSTEM);
    }
    if (WidgetAppearanceMode.MODE_BRAND.equals(mode)) {
      return WidgetThemePalette.brandPalette();
    }
    return WidgetThemePalette.resolve(context, WidgetThemePalette.readBlendWidgetThemeId(context));
  }

  public static RemoteViews build(Context context, JSONObject snapshot, WidgetSize size) {
    WidgetThemePalette palette = resolveAppearancePalette(context);
    WidgetAppearanceSettings appearance = WidgetAppearanceSettings.read(context);
    RemoteViews views = new RemoteViews(context.getPackageName(), size.layoutId);
    if (snapshot != null && snapshot.optBoolean("widgetLocked", false)) {
      bindWidgetLocked(views, context, size, snapshot, palette);
      applyWidgetBackground(views, context, palette, appearance, size);
      return views;
    }
    if (snapshot == null || snapshot.optBoolean("empty", false)) {
      bindEmpty(views, context, size, palette);
      applyWidgetBackground(views, context, palette, appearance, size);
      return views;
    }

    if (snapshot.optBoolean("nearbyFallback", false)) {
      bindNearbyFallback(views, context, size, palette);
      applyWidgetBackground(views, context, palette, appearance, size);
      return views;
    }
    if (isUnsetPinCtaFace(snapshot)) {
      bindUnsetPinCta(views, context, size, snapshot, palette);
      applyWidgetBackground(views, context, palette, appearance, size);
      return views;
    }

    int layoutId = size.layoutId;
    boolean medium = size.isMedium();
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

    restoreLiveLayoutChrome(views, size);
    views.setTextViewText(R.id.widget_label, label);

    if (!trainClock.isEmpty()) {
      views.setViewVisibility(R.id.widget_train_clock, android.view.View.VISIBLE);
      views.setTextViewText(R.id.widget_train_clock, trainClock);
    } else {
      views.setViewVisibility(R.id.widget_train_clock, android.view.View.GONE);
    }

    views.setTextColor(R.id.widget_label, palette.muted);
    views.setTextColor(R.id.widget_primary_value, palette.accent);
    views.setTextColor(R.id.widget_primary_unit, palette.accent);
    views.setTextColor(R.id.widget_train_clock, palette.text);

    int leaveColor = palette.muted;
    if (late) {
      leaveColor = context.getColor(R.color.widget_late);
    } else if (urgent) {
      leaveColor = context.getColor(R.color.widget_leave);
    }

    // Idle outside-hours face only — do NOT key off "Target Train" label: that label is also
    // used on the live face when the shown trip is at/after preferred (would hide train clock).
    boolean outsideHoursIdle = isOutsideHoursIdleFace(snapshot);
    if (outsideHoursIdle) {
      hideLeaveTwin(views);
      views.setViewVisibility(R.id.widget_secondary, android.view.View.GONE);
      bindOutsideHoursIdleFace(views, snapshot, size);
      bindPreferredHint(views, "", layoutId);
      bindUpdatedFooter(views, "", layoutId, size);
    } else {
      views.setViewVisibility(R.id.widget_secondary, android.view.View.GONE);
      bindLiveFace(
        views,
        secondary,
        routeLine,
        trainClock,
        false,
        leaveColor,
        status,
        size
      );
      bindPreferredHint(views, snapshot.optString("preferredHint", ""), layoutId);
      bindUpdatedFooter(views, updated, layoutId, size);
    }

    views.setOnClickPendingIntent(R.id.widget_root, buildTapPendingIntent(context, snapshot));
    applyMutedChrome(views, palette);
    applyWidgetBackground(views, context, palette, appearance, size);
    return views;
  }

  private static void applyWidgetBackground(
    RemoteViews views,
    Context context,
    WidgetThemePalette palette,
    WidgetAppearanceSettings appearance,
    WidgetSize size
  ) {
    WidgetBackgroundPainter.apply(views, context, palette, appearance, size);
  }

  /** Muted labels / crumbs that keep XML defaults unless explicitly themed elsewhere. */
  private static void applyMutedChrome(RemoteViews views, WidgetThemePalette palette) {
    views.setTextColor(R.id.widget_leave_label, palette.muted);
    views.setTextColor(R.id.widget_route, palette.muted);
    views.setTextColor(R.id.widget_updated, palette.muted);
    views.setTextColor(R.id.widget_status, palette.muted);
    views.setTextColor(R.id.widget_preferred_hint, palette.muted);
  }

  /** Idle: preferred time + day word; full-width route; no Updated. */
  private static void bindOutsideHoursIdleFace(
    RemoteViews views,
    JSONObject snapshot,
    WidgetSize size
  ) {
    String route = snapshot.optString("route", "");
    if (route.isEmpty()) {
      route = snapshot.optString("stationLabel", "");
    }
    String dayWord = snapshot.optString("trainClock", "");
    hideLeaveTwin(views);
    views.setViewVisibility(R.id.widget_right_column, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_secondary, android.view.View.GONE);
    hideStatusIfPresent(views, size.layoutId);
    String primary = snapshot.optString("primary", "");
    boolean hasDayWord = !dayWord.isEmpty() && dayWord.indexOf(':') < 0;
    applyIdleType(views, primary, hasDayWord);
    if (hasDayWord) {
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
        idleRouteLineTextSizeSp(route, size.layoutId)
      );
    } else {
      views.setViewVisibility(R.id.widget_route, android.view.View.GONE);
      views.setTextViewText(R.id.widget_route, "");
    }
    bindOutsideHoursIdleLayoutChrome(views);
  }

  /** Idle: compact centered stack — no spacer, no resize upscale. */
  private static void bindOutsideHoursIdleLayoutChrome(RemoteViews views) {
    views.setViewVisibility(R.id.widget_bottom_spacer, android.view.View.GONE);
    views.setInt(R.id.widget_content, "setGravity", android.view.Gravity.CENTER);
  }

  /**
   * Live face: NEXT TRAIN | LEAVE IN twins; Station → Direction on the bottom.
   * Medium also shows Updated footer (bound separately).
   */
  private static void bindLiveFace(
    RemoteViews views,
    String leaveSecondary,
    String routeLine,
    String trainClock,
    boolean empty,
    int leaveColor,
    String status,
    WidgetSize size
  ) {
    int layoutId = size.layoutId;
    views.setViewVisibility(R.id.widget_updated_left, android.view.View.GONE);
    applyLiveTwinType(views, size);
    setTrainStackCentered(views, true);
    bindStatusCrumb(views, status, layoutId, size);

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
      views.setTextViewTextSize(
        R.id.widget_leave_value,
        TypedValue.COMPLEX_UNIT_SP,
        liveLeaveValueTextSizeSp(leave.value, size)
      );
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
    boolean showRouteAtBottom = !empty && routeLine != null && !routeLine.isEmpty();
    if (showRouteAtBottom) {
      views.setViewVisibility(R.id.widget_route, android.view.View.VISIBLE);
      String routeDisplay = isCompactLiveFace(size)
        ? routeLine.trim()
        : formatWidgetRouteLine(routeLine, size);
      views.setTextViewText(R.id.widget_route, routeDisplay);
      views.setTextViewTextSize(
        R.id.widget_route,
        TypedValue.COMPLEX_UNIT_SP,
        isCompactLiveFace(size)
          ? idleRouteLineTextSizeSp(routeDisplay, size.layoutId)
          : liveRouteLineTextSizeSp(routeLine, size)
      );
      setRouteTopMargin(views, isCompactLiveFace(size) ? 0 : 1);
    } else {
      views.setViewVisibility(R.id.widget_route, android.view.View.GONE);
      views.setTextViewText(R.id.widget_route, "");
    }
  }

  private static void bindUpdatedFooter(RemoteViews views, String updated, int layoutId, WidgetSize size) {
    if (!shouldShowUpdatedLine(layoutId) || updated == null || updated.isEmpty()) {
      views.setViewVisibility(R.id.widget_updated, android.view.View.GONE);
      views.setTextViewText(R.id.widget_updated, "");
      return;
    }
    views.setViewVisibility(R.id.widget_updated, android.view.View.VISIBLE);
    views.setTextViewText(R.id.widget_updated, updated);
    if (size.typeScale() > 1f) {
      views.setTextViewTextSize(
        R.id.widget_updated,
        TypedValue.COMPLEX_UNIT_SP,
        scaleSp(11f, size.typeScale())
      );
    }
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

  private static void bindStatusCrumb(RemoteViews views, String status, int layoutId, WidgetSize size) {
    if (!isMedium(layoutId)) {
      return;
    }
    // No delay crumb on widget — not enough room next to leave twin on 2×1 / medium.
    views.setViewVisibility(R.id.widget_status, android.view.View.GONE);
    views.setTextViewText(R.id.widget_status, "");
  }

  private static void hideStatusIfPresent(RemoteViews views, int layoutId) {
    if (isMedium(layoutId)) {
      views.setViewVisibility(R.id.widget_status, android.view.View.GONE);
      views.setTextViewText(R.id.widget_status, "");
    }
  }

  private static void applyIdleType(RemoteViews views, String primary, boolean hasDayWord) {
    views.setTextViewTextSize(
      R.id.widget_label,
      TypedValue.COMPLEX_UNIT_SP,
      IDLE_LABEL_SP
    );
    views.setTextViewTextSize(
      R.id.widget_primary_value,
      TypedValue.COMPLEX_UNIT_SP,
      idlePrimaryTextSizeSp(primary, hasDayWord)
    );
    views.setTextViewTextSize(
      R.id.widget_train_clock,
      TypedValue.COMPLEX_UNIT_SP,
      IDLE_DAY_WORD_SP
    );
    setTrainClockTopMargin(views, 0);
  }

  /** Window ranges (6:00–9:00) need a smaller primary than a short preferred clock (7:30). */
  static float idlePrimaryTextSizeSp(String primary, int layoutId) {
    return idlePrimaryTextSizeSp(primary, false);
  }

  static float idlePrimaryTextSizeSp(String primary, boolean hasDayWord) {
    if (primary == null || primary.isEmpty()) {
      return capIdlePrimaryForDayWord(IDLE_PRIMARY_SP, hasDayWord);
    }
    if (primary.indexOf('–') < 0 && primary.indexOf('-') < 0) {
      return capIdlePrimaryForDayWord(IDLE_PRIMARY_SP, hasDayWord);
    }
    int length = primary.length();
    if (length <= 9) {
      return capIdlePrimaryForDayWord(17f, hasDayWord);
    }
    if (length <= 11) {
      return capIdlePrimaryForDayWord(15f, hasDayWord);
    }
    return capIdlePrimaryForDayWord(14f, hasDayWord);
  }

  private static float capIdlePrimaryForDayWord(float sp, boolean hasDayWord) {
    if (!hasDayWord) {
      return sp;
    }
    return Math.min(sp, IDLE_PRIMARY_WITH_DAY_SP);
  }

  private static void applyLiveTwinType(RemoteViews views, WidgetSize size) {
    if (isCompactLiveFace(size)) {
      views.setTextViewTextSize(R.id.widget_label, TypedValue.COMPLEX_UNIT_SP, 10f);
      views.setTextViewTextSize(R.id.widget_leave_label, TypedValue.COMPLEX_UNIT_SP, 10f);
      views.setTextViewTextSize(R.id.widget_primary_value, TypedValue.COMPLEX_UNIT_SP, 28f);
      views.setTextViewTextSize(R.id.widget_primary_unit, TypedValue.COMPLEX_UNIT_SP, 11f);
      views.setTextViewTextSize(R.id.widget_leave_unit, TypedValue.COMPLEX_UNIT_SP, 11f);
      views.setTextViewTextSize(R.id.widget_train_clock, TypedValue.COMPLEX_UNIT_SP, 13f);
      setTrainClockTopMargin(views, 0);
      return;
    }
    boolean medium = size.isMedium();
    float scale = size.typeScale();
    float labelSp = scaleSp(medium ? 12f : 11f, scale);
    float valueSp = scaleSp(medium ? 34f : 28f, scale);
    float unitSp = scaleSp(medium ? 12f : 10f, scale);
    float clockSp = scaleSp(medium ? 14f : 12f, scale);
    views.setTextViewTextSize(R.id.widget_label, TypedValue.COMPLEX_UNIT_SP, labelSp);
    views.setTextViewTextSize(R.id.widget_leave_label, TypedValue.COMPLEX_UNIT_SP, labelSp);
    views.setTextViewTextSize(R.id.widget_primary_value, TypedValue.COMPLEX_UNIT_SP, valueSp);
    views.setTextViewTextSize(R.id.widget_primary_unit, TypedValue.COMPLEX_UNIT_SP, unitSp);
    views.setTextViewTextSize(R.id.widget_leave_unit, TypedValue.COMPLEX_UNIT_SP, unitSp);
    views.setTextViewTextSize(R.id.widget_train_clock, TypedValue.COMPLEX_UNIT_SP, clockSp);
    setTrainClockTopMargin(views, medium ? 2 : 1);
  }

  /** Small layout (default 2×1). Do not require width ≤120 — Samsung reports ~150–170dp. */
  static boolean isCompactLiveFace(WidgetSize size) {
    return size != null && !size.isMedium();
  }

  /** Small 2×1 twin columns — "NOW" needs a tighter size so the W is not clipped. */
  static float liveLeaveValueTextSizeSp(String leaveValue, WidgetSize size) {
    if (isCompactLiveFace(size)) {
      return "NOW".equals(leaveValue) ? 20f : 28f;
    }
    return liveLeaveValueTextSizeSp(leaveValue, size.isMedium(), size.typeScale());
  }

  static float liveLeaveValueTextSizeSp(String leaveValue, boolean medium, float scale) {
    float base = medium ? 34f : 28f;
    if (!medium && "NOW".equals(leaveValue)) {
      base = 24f;
    }
    return scaleSp(base, scale);
  }

  static float idleRouteLineTextSizeSp(String route) {
    return idleRouteLineTextSizeSp(route, R.layout.widget_small);
  }

  static float idleRouteLineTextSizeSp(String route, int layoutId) {
    return Math.max(IDLE_ROUTE_FLOOR_SP, routeLineTextSizeSp(route, layoutId) * 0.85f);
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

  private static void setRouteTopMargin(RemoteViews views, int marginDp) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      views.setViewLayoutMargin(
        R.id.widget_route,
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

  /** Two launcher columns (~110dp) — route must fit like default 2×1. */
  static boolean isNarrowCell(WidgetSize size) {
    return size != null && size.widthDp <= 120;
  }

  /** Route as painted on widget — destination-only when only two cells wide. */
  static String formatWidgetRouteLine(String routeLine, WidgetSize size) {
    if (routeLine == null || routeLine.isEmpty()) {
      return "";
    }
    if (isNarrowCell(size)) {
      return abbreviateRouteLine(routeLine);
    }
    return routeLine.trim();
  }

  /** Live route size — never upscaled for tall cells; narrow width uses small sizing. */
  static float liveRouteLineTextSizeSp(String routeLine, WidgetSize size) {
    String display = formatWidgetRouteLine(routeLine, size);
    int layoutId = isNarrowCell(size) ? R.layout.widget_small : size.layoutId;
    float base = routeLineTextSizeSp(display, layoutId);
    if (isCompactLiveFace(size)) {
      return Math.min(base, 10f);
    }
    return base;
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

  /** Destination-only crumb for short cells (e.g. "Warwick → Perth" → "Perth"). */
  static String abbreviateRouteLine(String routeLine) {
    if (routeLine == null || routeLine.isEmpty()) {
      return "";
    }
    int arrow = routeLine.indexOf('→');
    if (arrow < 0) {
      arrow = routeLine.indexOf("->");
    }
    if (arrow >= 0) {
      return routeLine.substring(arrow + (routeLine.charAt(arrow) == '→' ? 1 : 2)).trim();
    }
    return routeLine.trim();
  }

  /** Compact full route for 2×1 live face (e.g. "Edgewater → Perth" → "Edgewater→Perth"). */
  static String compactRouteLine(String routeLine) {
    if (routeLine == null || routeLine.isEmpty()) {
      return "";
    }
    return routeLine.trim().replace(" → ", "→").replace(" -> ", "→");
  }

  static String foldRouteIntoTrainClock(String clockLine, String route) {
    if (route == null || route.isEmpty()) {
      return clockLine == null ? "" : clockLine;
    }
    if (clockLine == null || clockLine.isEmpty()) {
      return route;
    }
    return clockLine + " · " + route;
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

  private static void bindEmpty(
    RemoteViews views,
    Context context,
    WidgetSize size,
    WidgetThemePalette palette
  ) {
    int layoutId = size.layoutId;
    boolean medium = size.isMedium();
    float scale = size.typeScale();
    views.setTextViewText(R.id.widget_label, "NEXT TRAIN");
    views.setTextViewTextSize(
      R.id.widget_label,
      TypedValue.COMPLEX_UNIT_SP,
      scaleSp(medium ? 12f : 11f, scale)
    );
    bindCompactPrimary(views, EMPTY_SETUP_PRIMARY);
    views.setTextViewTextSize(
      R.id.widget_primary_value,
      TypedValue.COMPLEX_UNIT_SP,
      scaleSp(medium ? 20f : 16f, scale)
    );
    views.setTextColor(R.id.widget_label, palette.muted);
    views.setTextColor(R.id.widget_primary_value, palette.accent);
    views.setTextViewText(R.id.widget_train_clock, EMPTY_SETUP_SUB);
    views.setViewVisibility(R.id.widget_train_clock, android.view.View.VISIBLE);
    views.setTextViewTextSize(
      R.id.widget_train_clock,
      TypedValue.COMPLEX_UNIT_SP,
      scaleSp(medium ? 14f : 12f, scale)
    );
    views.setTextColor(R.id.widget_train_clock, palette.muted);
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
    views.setInt(R.id.widget_content, "setGravity", android.view.Gravity.CENTER);
    views.setOnClickPendingIntent(R.id.widget_root, buildTapIntent(context, "new"));
  }

  static boolean isUnsetPinCtaFace(JSONObject snapshot) {
    return snapshot != null && UNSET_PIN_PRIMARY.equals(snapshot.optString("primary", ""));
  }

  /** Saved route/journey with no pin or upcoming trip — CTA, not a dead board. */
  private static void bindUnsetPinCta(
    RemoteViews views,
    Context context,
    WidgetSize size,
    JSONObject snapshot,
    WidgetThemePalette palette
  ) {
    int layoutId = size.layoutId;
    boolean medium = size.isMedium();
    float scale = size.typeScale();
    views.setTextViewText(R.id.widget_label, snapshot.optString("label", "NEXT TRAIN"));
    views.setTextViewTextSize(
      R.id.widget_label,
      TypedValue.COMPLEX_UNIT_SP,
      scaleSp(medium ? 12f : 11f, scale)
    );
    bindCompactPrimary(views, UNSET_PIN_PRIMARY);
    views.setTextViewTextSize(
      R.id.widget_primary_value,
      TypedValue.COMPLEX_UNIT_SP,
      scaleSp(medium ? 23f : 19f, scale)
    );
    views.setTextColor(R.id.widget_label, palette.muted);
    views.setTextColor(R.id.widget_primary_value, palette.accent);
    views.setTextViewText(R.id.widget_train_clock, UNSET_PIN_SUB);
    views.setViewVisibility(R.id.widget_train_clock, android.view.View.VISIBLE);
    views.setTextViewTextSize(
      R.id.widget_train_clock,
      TypedValue.COMPLEX_UNIT_SP,
      scaleSp(medium ? 14f : 12f, scale)
    );
    views.setTextColor(R.id.widget_train_clock, palette.muted);
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
    views.setInt(R.id.widget_content, "setGravity", android.view.Gravity.CENTER);
    views.setOnClickPendingIntent(R.id.widget_root, buildTapPendingIntent(context, snapshot));
  }

  private static void restoreLiveLayoutChrome(RemoteViews views, WidgetSize size) {
    // 2×1: pack like idle so route sits under the clock, not on the far bottom of a fat One UI cell.
    if (isCompactLiveFace(size)) {
      bindOutsideHoursIdleLayoutChrome(views);
      return;
    }
    if (size.isShortCell()) {
      views.setViewVisibility(R.id.widget_bottom_spacer, android.view.View.GONE);
      views.setInt(R.id.widget_content, "setGravity", android.view.Gravity.TOP);
      return;
    }
    views.setViewVisibility(R.id.widget_bottom_spacer, android.view.View.INVISIBLE);
    views.setInt(R.id.widget_content, "setGravity", android.view.Gravity.TOP);
  }

  /** Pro trial expired — calm locked face, not stale/error. */
  private static void bindWidgetLocked(
    RemoteViews views,
    Context context,
    WidgetSize size,
    JSONObject snapshot,
    WidgetThemePalette palette
  ) {
    int layoutId = size.layoutId;
    boolean medium = size.isMedium();
    float scale = size.typeScale();
    restoreLiveLayoutChrome(views, size);
    views.setTextViewText(R.id.widget_label, "NEXT TRAIN");
    views.setTextViewTextSize(
      R.id.widget_label,
      TypedValue.COMPLEX_UNIT_SP,
      scaleSp(medium ? 12f : 11f, scale)
    );
    views.setViewVisibility(R.id.widget_primary_unit, android.view.View.GONE);
    String primary =
      snapshot != null ? snapshot.optString("primary", "").trim() : "";
    if (primary.isEmpty()) {
      primary = "Widget paused";
    }
    views.setTextViewText(R.id.widget_primary_value, primary);
    views.setTextViewTextSize(
      R.id.widget_primary_value,
      TypedValue.COMPLEX_UNIT_SP,
      scaleSp(medium ? 18f : 16f, scale)
    );
    views.setTextColor(R.id.widget_label, palette.muted);
    views.setTextColor(R.id.widget_primary_value, palette.text);
    hideLeaveTwin(views);
    hideStatusIfPresent(views, layoutId);
    bindPreferredHint(views, "", layoutId);
    views.setViewVisibility(R.id.widget_right_column, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_secondary, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_updated, android.view.View.GONE);
    views.setViewVisibility(R.id.widget_updated_left, android.view.View.GONE);
    String body =
      snapshot != null ? snapshot.optString("trainClock", "").trim() : "";
    if (body.isEmpty()) {
      body = "Your Pro trial ended. Unlock once to keep leave-by on your home screen.";
    }
    views.setTextViewText(R.id.widget_train_clock, body);
    views.setViewVisibility(R.id.widget_train_clock, android.view.View.VISIBLE);
    views.setTextViewTextSize(
      R.id.widget_train_clock,
      TypedValue.COMPLEX_UNIT_SP,
      scaleSp(medium ? 13f : 12f, scale)
    );
    views.setTextColor(R.id.widget_train_clock, palette.muted);
    views.setInt(R.id.widget_train_clock, "setMaxLines", 3);
    views.setViewVisibility(R.id.widget_route, android.view.View.VISIBLE);
    String route =
      snapshot != null ? snapshot.optString("route", "").trim() : "";
    if (route.isEmpty()) {
      route = "Unlock Pro";
    }
    views.setTextViewText(R.id.widget_route, route);
    views.setTextColor(R.id.widget_route, palette.accent);
    views.setTextViewTextSize(
      R.id.widget_route,
      TypedValue.COMPLEX_UNIT_SP,
      scaleSp(medium ? 13f : 12f, scale)
    );
    setBottomRouteGravity(views, true);
    setTrainStackCentered(views, true);
    views.setOnClickPendingIntent(R.id.widget_root, buildPaywallTapIntent(context));
  }

  private static void bindNearbyFallback(
    RemoteViews views,
    Context context,
    WidgetSize size,
    WidgetThemePalette palette
  ) {
    int layoutId = size.layoutId;
    boolean medium = size.isMedium();
    float scale = size.typeScale();
    views.setTextViewText(R.id.widget_label, "NEAR ME");
    bindCompactPrimary(views, "Near me");
    views.setTextViewTextSize(
      R.id.widget_primary_value,
      TypedValue.COMPLEX_UNIT_SP,
      scaleSp(medium ? 28f : 22f, scale)
    );
    views.setTextViewTextSize(
      R.id.widget_label,
      TypedValue.COMPLEX_UNIT_SP,
      scaleSp(medium ? 12f : 11f, scale)
    );
    views.setTextColor(R.id.widget_label, palette.muted);
    views.setTextColor(R.id.widget_primary_value, palette.accent);
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
    views.setTextColor(R.id.widget_train_clock, palette.text);
    views.setViewVisibility(R.id.widget_train_clock, android.view.View.VISIBLE);
    views.setTextViewTextSize(
      R.id.widget_train_clock,
      TypedValue.COMPLEX_UNIT_SP,
      scaleSp(medium ? 14f : 12f, scale)
    );
    setTrainStackCentered(views, true);
    views.setInt(R.id.widget_content, "setGravity", android.view.Gravity.CENTER);
    views.setOnClickPendingIntent(R.id.widget_root, buildNearbyTapIntent(context));
  }

  public static Intent resolveTapIntent(Context context, JSONObject snapshot) {
    if (snapshot == null || snapshot.optBoolean("empty", false)) {
      return journeyTapIntent(context, "new");
    }
    if (snapshot.optBoolean("widgetLocked", false)) {
      return paywallTapIntent(context);
    }
    if (snapshot.optBoolean("nearbyFallback", false)) {
      return nearbyTapIntent(context);
    }
    String journeyId = snapshot.optString("journeyId", "").trim();
    if ("nearby".equals(journeyId) || NearbyPinHelper.JOURNEY_ID.equals(journeyId)) {
      return nearbyTapIntent(context, snapshot.optString("departureIso", ""));
    }
    if ("pro".equals(journeyId)) {
      return paywallTapIntent(context);
    }
    if (!journeyId.isEmpty() && !"new".equals(journeyId)) {
      return journeyTapIntent(context, journeyId);
    }
    if (snapshot.optBoolean("openNearbyOnTap", false)) {
      return nearbyTapIntent(context);
    }
    return homeTapIntent(context);
  }

  public static PendingIntent buildTapPendingIntent(Context context, JSONObject snapshot) {
    Intent intent = resolveTapIntent(context, snapshot);
    String requestKey =
      intent.getData() != null ? intent.getData().toString() : intent.getAction();
    return PendingIntent.getActivity(
      context,
      requestKey != null ? requestKey.hashCode() : 0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }

  public static PendingIntent buildHomeTapIntent(Context context) {
    return PendingIntent.getActivity(
      context,
      "home".hashCode(),
      homeTapIntent(context),
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }

  public static Intent homeTapIntent(Context context) {
    Intent intent = new Intent(context, MainActivity.class);
    intent.setAction(Intent.ACTION_VIEW);
    intent.setData(Uri.parse("nexttrain://home"));
    intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    return intent;
  }

  public static PendingIntent buildTapIntent(Context context, String journeyId) {
    return PendingIntent.getActivity(
      context,
      journeyId.hashCode(),
      journeyTapIntent(context, journeyId),
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }

  public static Intent journeyTapIntent(Context context, String journeyId) {
    String path = "new".equals(journeyId) ? "/new" : "/" + journeyId;
    Intent intent = new Intent(context, MainActivity.class);
    intent.setAction(Intent.ACTION_VIEW);
    intent.setData(Uri.parse("nexttrain://journey" + path));
    intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    return intent;
  }

  public static PendingIntent buildNearbyTapIntent(Context context) {
    return PendingIntent.getActivity(
      context,
      "nearby".hashCode(),
      nearbyTapIntent(context),
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }

  public static Intent nearbyTapIntent(Context context) {
    return nearbyTapIntent(context, "");
  }

  public static Intent nearbyTapIntent(Context context, String departureIso) {
    android.net.Uri.Builder builder = Uri.parse("nexttrain://nearby").buildUpon();
    if (departureIso != null && !departureIso.isEmpty()) {
      builder.appendQueryParameter("departure", departureIso);
    }
    Intent intent = new Intent(context, MainActivity.class);
    intent.setAction(Intent.ACTION_VIEW);
    intent.setData(builder.build());
    intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    return intent;
  }

  public static PendingIntent buildPaywallTapIntent(Context context) {
    return PendingIntent.getActivity(
      context,
      "paywall".hashCode(),
      paywallTapIntent(context),
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }

  public static Intent paywallTapIntent(Context context) {
    Intent intent = new Intent(context, MainActivity.class);
    intent.setAction(Intent.ACTION_VIEW);
    intent.setData(Uri.parse("nexttrain://paywall"));
    intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    return intent;
  }

  public static WidgetSize widgetSizeFor(Context context, AppWidgetManager manager, int widgetId) {
    int widthDp = 110;
    int heightDp = 40;
    int columnSpan = 0;
    try {
      android.os.Bundle options = manager.getAppWidgetOptions(widgetId);
      if (options != null) {
        widthDp = Math.max(
          options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, widthDp),
          options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, widthDp)
        );
        heightDp = Math.max(
          options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, heightDp),
          options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, heightDp)
        );
        columnSpan = options.getInt("semAppWidgetColumnSpan", 0);
      }
    } catch (Exception ignored) {
      // Use compact layout.
    }
    int layoutId = layoutForSizeDp(widthDp, heightDp);
    // One UI 2-column span is still a 2×1 even when dp looks like AOSP 3×1.
    if (columnSpan == 2 && heightDp < 110) {
      layoutId = R.layout.widget_small;
    }
    return new WidgetSize(widthDp, heightDp, layoutId);
  }

  public static int layoutForWidget(Context context, AppWidgetManager manager, int widgetId) {
    return widgetSizeFor(context, manager, widgetId).layoutId;
  }

  /** @deprecated Use {@link #widgetSizeFor} — kept for tests that only need layout id. */
  static WidgetSize defaultSizeForLayout(int layoutId) {
    if (isMedium(layoutId)) {
      return new WidgetSize(180, 110, layoutId);
    }
    return new WidgetSize(110, 40, layoutId);
  }

  /**
   * Size → layout. Default 2×1 is small. ≈2×2 (110dp+ tall) → medium with Updated line.
   * AOSP 3×1 is ~180×55. Samsung One UI 2×1 is ~187×95 and must stay small — that cell is
   * fatter than a short 3×1 but still one row.
   */
  static int layoutForSizeDp(int minWidthDp, int minHeightDp) {
    if (minHeightDp >= 110) {
      return R.layout.widget_medium;
    }
    if (minHeightDp >= 85 && minWidthDp < 240) {
      return R.layout.widget_small;
    }
    if (minWidthDp >= 180 && minHeightDp >= 55) {
      return R.layout.widget_medium;
    }
    return R.layout.widget_small;
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
