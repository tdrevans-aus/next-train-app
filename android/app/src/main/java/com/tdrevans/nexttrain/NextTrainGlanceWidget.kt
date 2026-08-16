package com.tdrevans.nexttrain

import android.content.Context
import android.content.Intent
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import org.json.JSONObject

class NextTrainGlanceWidget : GlanceAppWidget() {

  override suspend fun provideGlance(context: Context, id: androidx.glance.GlanceId) {
    provideContent {
      NextTrainGlanceContent(context, id)
    }
  }
}

class NextTrainGlanceReceiver : GlanceAppWidgetReceiver() {

  override val glanceAppWidget: GlanceAppWidget = NextTrainGlanceWidget()

  override fun onEnabled(context: Context) {
    super.onEnabled(context)
    WidgetRefreshScheduler.ensureScheduled(context)
    WidgetRefreshScheduler.refreshSoon(context)
  }

  override fun onDisabled(context: Context) {
    super.onDisabled(context)
    WidgetRefreshScheduler.cancel(context)
    WidgetLocalPaintScheduler.cancel(context)
    WidgetDepartureAdvanceScheduler.cancel(context)
  }

  override fun onUpdate(
    context: Context,
    appWidgetManager: android.appwidget.AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    CommuteRefreshService.paintFromCache(context)
    WidgetRefreshScheduler.ensureScheduled(context)
    CommuteRefreshService.refreshAll(context)
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: android.appwidget.AppWidgetManager,
    appWidgetId: Int,
    newOptions: android.os.Bundle,
  ) {
    CommuteRefreshService.paintFromCache(context)
  }
}

@androidx.compose.runtime.Composable
private fun NextTrainGlanceContent(context: Context, glanceId: androidx.glance.GlanceId) {
  val appWidgetId = androidx.glance.appwidget.GlanceAppWidgetManager(context).getAppWidgetId(glanceId)
  val manager = android.appwidget.AppWidgetManager.getInstance(context)
  val size = WidgetUiBuilder.widgetSizeFor(context, manager, appWidgetId)
  val snapshot = WidgetSettingsStore.readSnapshot(context)
  val colors = WidgetGlanceTheme.resolve(context)
  val tapIntent = resolveTapIntent(context, snapshot)

  Box(
    modifier = GlanceModifier
      .fillMaxSize()
      .cornerRadius(16.dp)
      .clickable(actionStartActivity(tapIntent))
  ) {
    if (colors.surfaceAlpha > 0f) {
      Box(
        modifier = GlanceModifier
          .fillMaxSize()
          .background(ColorProvider(day = colors.surfaceColor(), night = colors.surfaceColor()))
      ) {}
    }
    if (colors.showBorder && colors.surfaceAlpha > 0f) {
      Box(
        modifier = GlanceModifier
          .fillMaxSize()
          .cornerRadius(16.dp)
          .background(ColorProvider(day = colors.borderColor(), night = colors.borderColor()))
      ) {}
      Box(
        modifier = GlanceModifier
          .fillMaxSize()
          .padding(1.dp)
          .cornerRadius(15.dp)
          .background(
            ColorProvider(
              day =
                if (colors.surfaceAlpha > 0f) {
                  colors.surfaceColor()
                } else {
                  Color.Transparent
                },
              night =
                if (colors.surfaceAlpha > 0f) {
                  colors.surfaceColor()
                } else {
                  Color.Transparent
                },
            )
          )
      ) {}
    }
    if (colors.needsScrim) {
      Box(
        modifier = GlanceModifier
          .fillMaxSize()
          .background(ColorProvider(day = Color.Black.copy(alpha = 0.35f), night = Color.Black.copy(alpha = 0.35f)))
      ) {}
    }

    Column(
      modifier = GlanceModifier
        .fillMaxSize()
        .padding(horizontal = 8.dp, vertical = 6.dp),
      verticalAlignment = Alignment.Top,
    ) {
      when {
        snapshot != null && snapshot.optBoolean("widgetLocked", false) ->
          LockedFace(context, snapshot, size, colors)
        snapshot == null || snapshot.optBoolean("empty", false) ->
          EmptyFace(context, size, colors)
        snapshot.optBoolean("nearbyFallback", false) ->
          NearbyFace(context, size, colors)
        WidgetUiBuilder.isOutsideHoursIdleFace(snapshot) ->
          IdleFace(context, snapshot, size, colors)
        else ->
          LiveFace(context, snapshot, size, colors)
      }
    }
  }
}

@androidx.compose.runtime.Composable
private fun LiveFace(
  context: Context,
  snapshot: JSONObject,
  size: WidgetUiBuilder.WidgetSize,
  colors: WidgetGlanceColors,
) {
  val medium = size.isMedium()
  val scale = size.typeScale()
  val labelSp = scaleSp(medium, 12f, 11f, scale)
  val valueSp = scaleSp(medium, 34f, 28f, scale)
  val unitSp = scaleSp(medium, 12f, 10f, scale)
  val clockSp = scaleSp(medium, 14f, 12f, scale)
  val routeSp = scaleSp(medium, 14f, 13f, scale)

  val label = snapshot.optString("label", "")
  val primary = snapshot.optString("primary", "—")
  val trainClock = snapshot.optString("trainClock", "")
  val secondary = snapshot.optString("secondary", "")
  val routeLine = WidgetUiBuilder.resolveRouteLine(snapshot)
  val status = snapshot.optString("statusCrumb", "")
  val stale = snapshot.optBoolean("stale", false)
  val updatedRaw = snapshot.optString("updatedLine", "Updating…")
  val updated =
    if (medium) {
      WidgetUiBuilder.resolveMediumUpdatedLine(updatedRaw, primary, secondary, stale)
    } else {
      ""
    }
  val preferredHint = snapshot.optString("preferredHint", "")
  val late = snapshot.optBoolean("late", false)
  val urgent = snapshot.optBoolean("urgent", false)

  val primaryParts = WidgetUiBuilder.splitMinutesPrimary(primary)
  val leaveParts = WidgetUiBuilder.parseLeaveParts(secondary)
  val leaveColor =
    when {
      late -> context.getColor(R.color.widget_late)
      urgent -> context.getColor(R.color.widget_leave)
      else -> colors.mutedArgb
    }

  if (medium && status.isNotEmpty()) {
    GlanceText(
      text = status,
      sizeSp = scaleSp(true, 11f, 11f, scale),
      colorArgb = colors.mutedArgb,
      align = TextAlign.End,
    )
  }

  Row(modifier = GlanceModifier.fillMaxWidth()) {
    Column(
      modifier = GlanceModifier.defaultWeight(),
      horizontalAlignment = Alignment.CenterHorizontally,
    ) {
      GlanceText(label, labelSp, colors.mutedArgb, FontWeight.Medium)
      Row(verticalAlignment = Alignment.CenterVertically) {
        GlanceText(primaryParts.value, valueSp, colors.accentArgb, FontWeight.Bold)
        if (primaryParts.unit.isNotEmpty()) {
          GlanceText(" ${primaryParts.unit}", unitSp, colors.accentArgb, FontWeight.Medium)
        }
      }
      val foldedClock =
        if (size.isShortCell() && routeLine.isNotEmpty() && trainClock.isNotEmpty()) {
          WidgetUiBuilder.foldRouteIntoTrainClock(
            trainClock,
            WidgetUiBuilder.abbreviateRouteLine(routeLine),
          )
        } else {
          trainClock
        }
      if (foldedClock.isNotEmpty()) {
        GlanceText(foldedClock, clockSp, colors.onSurfaceArgb)
      }
    }

    if (leaveParts.visible) {
      Column(
        modifier = GlanceModifier.defaultWeight(),
        horizontalAlignment = Alignment.CenterHorizontally,
      ) {
        GlanceText(leaveParts.label, labelSp, colors.mutedArgb, FontWeight.Medium)
        Row(verticalAlignment = Alignment.CenterVertically) {
          GlanceText(leaveParts.value, valueSp, leaveColor, FontWeight.Bold)
          if (leaveParts.unit.isNotEmpty()) {
            GlanceText(" ${leaveParts.unit}", unitSp, leaveColor, FontWeight.Medium)
          }
        }
      }
    }
  }

  if (!size.isShortCell() && routeLine.isNotEmpty()) {
    GlanceText(
      routeLine,
      WidgetUiBuilder.routeLineTextSizeSp(routeLine, size.layoutId).coerceAtLeast(routeSp),
      colors.mutedArgb,
      align = TextAlign.Center,
    )
  }

  if (medium && preferredHint.isNotEmpty()) {
    GlanceText(preferredHint, 11f, colors.mutedArgb, align = TextAlign.End)
  }

  if (medium && updated.isNotEmpty()) {
    GlanceText(updated, scaleSp(true, 11f, 11f, scale), colors.mutedArgb, align = TextAlign.Center)
  }
}

@androidx.compose.runtime.Composable
private fun IdleFace(
  context: Context,
  snapshot: JSONObject,
  size: WidgetUiBuilder.WidgetSize,
  colors: WidgetGlanceColors,
) {
  val label = snapshot.optString("label", "")
  val primary = snapshot.optString("primary", "")
  val dayWord = snapshot.optString("trainClock", "")
  val route =
    snapshot.optString("route", "").ifEmpty { snapshot.optString("stationLabel", "") }
  val hasDayWord = dayWord.isNotEmpty() && !dayWord.contains(':')

  Column(
    modifier = GlanceModifier.fillMaxWidth(),
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    GlanceText(label, 8f, colors.mutedArgb, FontWeight.Medium)
    GlanceText(
      primary,
      WidgetUiBuilder.idlePrimaryTextSizeSp(primary, hasDayWord),
      colors.accentArgb,
      FontWeight.Bold,
    )
    if (hasDayWord) {
      GlanceText(dayWord, 9f, colors.onSurfaceArgb)
    }
    if (route.isNotEmpty()) {
      GlanceText(
        route,
        WidgetUiBuilder.idleRouteLineTextSizeSp(route, size.layoutId),
        colors.mutedArgb,
        align = TextAlign.Center,
      )
    }
  }
}

@androidx.compose.runtime.Composable
private fun EmptyFace(
  context: Context,
  size: WidgetUiBuilder.WidgetSize,
  colors: WidgetGlanceColors,
) {
  val medium = size.isMedium()
  val scale = size.typeScale()
  Column(
    modifier = GlanceModifier.fillMaxWidth(),
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    GlanceText("NEXT TRAIN", scaleSp(medium, 12f, 11f, scale), colors.mutedArgb, FontWeight.Medium)
    GlanceText(
      WidgetUiBuilder.EMPTY_SETUP_PRIMARY,
      scaleSp(medium, 20f, 16f, scale),
      colors.accentArgb,
      FontWeight.Bold,
    )
    GlanceText(
      WidgetUiBuilder.EMPTY_SETUP_SUB,
      scaleSp(medium, 14f, 12f, scale),
      colors.mutedArgb,
    )
  }
}

@androidx.compose.runtime.Composable
private fun LockedFace(
  context: Context,
  snapshot: JSONObject,
  size: WidgetUiBuilder.WidgetSize,
  colors: WidgetGlanceColors,
) {
  val medium = size.isMedium()
  val scale = size.typeScale()
  val primary = snapshot.optString("primary", "").ifEmpty { "Widget paused" }
  Column(
    modifier = GlanceModifier.fillMaxWidth(),
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    GlanceText("NEXT TRAIN", scaleSp(medium, 12f, 11f, scale), colors.mutedArgb, FontWeight.Medium)
    GlanceText(primary, scaleSp(medium, 20f, 16f, scale), colors.accentArgb, FontWeight.Bold)
    val sub = snapshot.optString("secondary", "")
    if (sub.isNotEmpty()) {
      GlanceText(sub, scaleSp(medium, 14f, 12f, scale), colors.mutedArgb)
    }
  }
}

@androidx.compose.runtime.Composable
private fun NearbyFace(
  context: Context,
  size: WidgetUiBuilder.WidgetSize,
  colors: WidgetGlanceColors,
) {
  val medium = size.isMedium()
  val scale = size.typeScale()
  Column(
    modifier = GlanceModifier.fillMaxWidth(),
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    GlanceText("NEAR ME", scaleSp(medium, 12f, 11f, scale), colors.mutedArgb, FontWeight.Medium)
    GlanceText("Near me", scaleSp(medium, 28f, 24f, scale), colors.accentArgb, FontWeight.Bold)
    GlanceText(
      "See trains near you",
      scaleSp(medium, 14f, 12f, scale),
      colors.onSurfaceArgb,
    )
  }
}

@androidx.compose.runtime.Composable
private fun GlanceText(
  text: String,
  sizeSp: Float,
  colorArgb: Int,
  weight: FontWeight = FontWeight.Normal,
  align: TextAlign = TextAlign.Start,
) {
  if (text.isEmpty()) {
    return
  }
  Text(
    text = text,
    modifier = GlanceModifier.fillMaxWidth(),
    style = TextStyle(
      color = ColorProvider(day = Color(colorArgb), night = Color(colorArgb)),
      fontSize = sizeSp.sp,
      fontWeight = weight,
      textAlign = align,
    ),
  )
}

private fun scaleSp(medium: Boolean, mediumSp: Float, smallSp: Float, scale: Float): Float {
  val base = if (medium) mediumSp else smallSp
  return if (scale <= 1f) base else base * scale
}

private fun resolveTapIntent(context: Context, snapshot: org.json.JSONObject?): Intent {
  if (snapshot == null || snapshot.optBoolean("empty", false)) {
    return WidgetUiBuilder.journeyTapIntent(context, "new")
  }
  if (snapshot.optBoolean("widgetLocked", false)) {
    return WidgetUiBuilder.paywallTapIntent(context)
  }
  if (snapshot.optBoolean("nearbyFallback", false)) {
    return WidgetUiBuilder.homeTapIntent(context)
  }
  if (snapshot.optBoolean("openNearbyOnTap", false)) {
    return WidgetUiBuilder.nearbyTapIntent(context)
  }
  val journeyId = snapshot.optString("journeyId", "").trim()
  if (journeyId == "nearby") {
    return WidgetUiBuilder.nearbyTapIntent(context)
  }
  if (journeyId == "pro") {
    return WidgetUiBuilder.paywallTapIntent(context)
  }
  if (journeyId.isNotEmpty() && journeyId != "new") {
    return WidgetUiBuilder.journeyTapIntent(context, journeyId)
  }
  return WidgetUiBuilder.homeTapIntent(context)
}
