package com.tdrevans.nexttrain;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class LeaveReminderReceiver extends BroadcastReceiver {

  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null || !LeaveReminderScheduler.ACTION_LEAVE_REMINDER.equals(intent.getAction())) {
      return;
    }

    if (!LeaveReminderSettingsStore.isEnabled(context) || LeaveReminderSettingsStore.isPaused(context)) {
      return;
    }

    String type = intent.getStringExtra(LeaveReminderScheduler.EXTRA_TYPE);
    String journeyId = intent.getStringExtra(LeaveReminderScheduler.EXTRA_JOURNEY_ID);
    String route = intent.getStringExtra(LeaveReminderScheduler.EXTRA_ROUTE);
    String trainTime = intent.getStringExtra(LeaveReminderScheduler.EXTRA_TRAIN_TIME);
    String departureKey = intent.getStringExtra(LeaveReminderScheduler.EXTRA_DEPARTURE_KEY);
    String dayKey = intent.getStringExtra(LeaveReminderScheduler.EXTRA_DAY_KEY);
    boolean stale = intent.getBooleanExtra(LeaveReminderScheduler.EXTRA_STALE, false);
    int getReadyMinutes = intent.getIntExtra(LeaveReminderScheduler.EXTRA_GET_READY_MINUTES, 5);

    if (journeyId == null || departureKey == null) {
      return;
    }

    if (LeaveReminderSettingsStore.isAcknowledged(context, departureKey)) {
      return;
    }

    String localDate = PerthTime.localDateKey();
    if (LeaveReminderScheduler.TYPE_LEAVE_NOW.equals(type)) {
      if (LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context, journeyId, localDate)) {
        return;
      }
    } else if (LeaveReminderScheduler.TYPE_GET_READY.equals(type)) {
      if (LeaveReminderSettingsStore.hasGetReadyFiredForDay(context, journeyId, localDate)) {
        return;
      }
    } else if (LeaveReminderSettingsStore.hasFired(context, departureKey, type)) {
      return;
    }

    LeaveReminderNotifier.show(
      context,
      type,
      journeyId,
      route,
      trainTime,
      stale,
      getReadyMinutes,
      departureKey
    );
    LeaveReminderSettingsStore.markFired(context, departureKey, type);

    if (LeaveReminderScheduler.TYPE_LEAVE_NOW.equals(type)) {
      LeaveReminderSettingsStore.markLeaveNowFiredForDay(context, journeyId, localDate, departureKey);
    } else if (LeaveReminderScheduler.TYPE_GET_READY.equals(type)) {
      LeaveReminderSettingsStore.markGetReadyFiredForDay(context, journeyId, localDate);
    }

    if (dayKey != null) {
      // No further alarms for this journey today after leave-now fires.
      if (LeaveReminderScheduler.TYPE_LEAVE_NOW.equals(type)) {
        LeaveReminderScheduler.cancelAll(context);
        CommuteRefreshService.refreshAll(context);
      }
    }
  }
}
