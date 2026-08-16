package com.tdrevans.nexttrain

import android.content.Context
import android.content.Intent

/** Delegates to {@link NextTrainWidgetProvider} — Glance path paused until stable on launchers. */
class WidgetGlanceHelper private constructor() {

  companion object {
    @JvmStatic
    fun updateAllWidgets(context: Context) {
      NextTrainWidgetProvider.updateAllWidgets(context)
    }

    @JvmStatic
    fun updateWidgetId(context: Context, appWidgetId: Int) {
      NextTrainWidgetProvider.updateWidgetId(context, appWidgetId)
    }

    @JvmStatic
    fun requestRefresh(context: Context) {
      NextTrainWidgetProvider.requestRefresh(context)
    }

    @JvmStatic
    fun widgetInstanceCount(context: Context): Int {
      return NextTrainWidgetProvider.widgetInstanceCount(context)
    }
  }
}
