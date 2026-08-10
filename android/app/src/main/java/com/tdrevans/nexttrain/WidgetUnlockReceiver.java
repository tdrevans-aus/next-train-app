package com.tdrevans.nexttrain;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Network refresh when the device is unlocked (widget §8). */
public class WidgetUnlockReceiver extends BroadcastReceiver {

  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null) {
      return;
    }

    String action = intent.getAction();
    if (
      Intent.ACTION_USER_PRESENT.equals(action) ||
      Intent.ACTION_BOOT_COMPLETED.equals(action)
    ) {
      CommuteRefreshService.refreshAll(context);
      WidgetRefreshScheduler.ensureScheduled(context);
    }
  }
}
