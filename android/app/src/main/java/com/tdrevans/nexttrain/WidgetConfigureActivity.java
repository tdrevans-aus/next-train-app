package com.tdrevans.nexttrain;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.os.Bundle;

/** Launcher configure step before a new home-screen widget is placed (FB-37). */
public class WidgetConfigureActivity extends Activity {

  private int appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    appWidgetId =
      getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
    if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
      finishConfigure(false);
      return;
    }

    WidgetConfigureBridge.bind(this, appWidgetId);

    Intent main = new Intent(this, MainActivity.class);
    main.putExtra(MainActivity.EXTRA_WIDGET_CONFIGURE, true);
    main.putExtra(MainActivity.EXTRA_WIDGET_CONFIGURE_ID, appWidgetId);
    main.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
    startActivity(main);
  }

  public void finishConfigure(boolean ok) {
    if (ok) {
      Intent result = new Intent();
      result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
      setResult(RESULT_OK, result);
    } else {
      setResult(RESULT_CANCELED);
    }
    finish();
  }

  @Override
  protected void onDestroy() {
    if (!isFinishing()) {
      setResult(RESULT_CANCELED);
      WidgetConfigureBridge.clear();
    }
    super.onDestroy();
  }
}
