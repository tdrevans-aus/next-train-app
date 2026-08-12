package com.tdrevans.nexttrain;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Clears an expired reminder pause and re-arms leave reminders without opening the app. */
public class PauseResumeReceiver extends BroadcastReceiver {

  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null || !LeaveReminderScheduler.ACTION_PAUSE_RESUME.equals(intent.getAction())) {
      return;
    }

    Context appContext = context.getApplicationContext();
    LeaveReminderSettingsStore.clearExpiredPauseIfNeeded(appContext);
    CommuteRefreshService.refreshAll(appContext);
  }
}
