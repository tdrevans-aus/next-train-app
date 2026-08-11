package com.tdrevans.nexttrain;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class CommuteStripReceiver extends BroadcastReceiver {

  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null || intent.getAction() == null) {
      return;
    }

    Context appContext = context.getApplicationContext();
    String action = intent.getAction();

    if (CommuteStripScheduler.ACTION_DISMISS.equals(action)) {
      String journeyId = intent.getStringExtra(CommuteStripScheduler.EXTRA_JOURNEY_ID);
      String dayKey = intent.getStringExtra(CommuteStripScheduler.EXTRA_DAY_KEY);
      if (journeyId != null && dayKey != null) {
        LeaveReminderSettingsStore.markStripDismissedForDay(appContext, journeyId, dayKey);
      }
      CommuteStripNotifier.cancel(appContext);
      CommuteStripScheduler.cancelScheduledAlarms(appContext);
      return;
    }

    if (CommuteStripScheduler.ACTION_END.equals(action)) {
      CommuteStripNotifier.cancel(appContext);
      return;
    }

    if (!CommuteStripScheduler.ACTION_SHOW.equals(action)) {
      return;
    }

    if (!CommuteStripScheduler.hasNotificationPermission(appContext)) {
      return;
    }

    if (!LeaveReminderSettingsStore.isCommuteStripEnabled(appContext)) {
      CommuteStripNotifier.cancel(appContext);
      return;
    }

    String journeyId = intent.getStringExtra(CommuteStripScheduler.EXTRA_JOURNEY_ID);
    String dayKey = intent.getStringExtra(CommuteStripScheduler.EXTRA_DAY_KEY);
    if (
      journeyId != null &&
      dayKey != null &&
      LeaveReminderSettingsStore.hasStripDismissedForDay(appContext, journeyId, dayKey)
    ) {
      CommuteStripNotifier.cancel(appContext);
      return;
    }

    long endAtMs = intent.getLongExtra(CommuteStripScheduler.EXTRA_END_AT_MS, 0L);
    long now = System.currentTimeMillis();
    if (endAtMs > 0 && now >= endAtMs) {
      CommuteStripNotifier.cancel(appContext);
      return;
    }

    String route = intent.getStringExtra(CommuteStripScheduler.EXTRA_ROUTE);
    String trainTime = intent.getStringExtra(CommuteStripScheduler.EXTRA_TRAIN_TIME);
    long leaveByMs = intent.getLongExtra(CommuteStripScheduler.EXTRA_LEAVE_BY_MS, 0L);
    boolean stale = intent.getBooleanExtra(CommuteStripScheduler.EXTRA_STALE, false);

    if (journeyId == null || route == null || trainTime == null || leaveByMs <= 0) {
      return;
    }

    CommuteStripNotifier.show(appContext, journeyId, route, trainTime, leaveByMs, stale);
  }
}
