package com.tdrevans.nexttrain;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class WidgetRefreshReceiver extends BroadcastReceiver {

  @Override
  public void onReceive(Context context, Intent intent) {
    CommuteRefreshService.refreshAll(context);
    WidgetRefreshScheduler.ensureScheduled(context);
  }
}
