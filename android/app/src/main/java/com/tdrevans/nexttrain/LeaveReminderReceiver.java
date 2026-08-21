package com.tdrevans.nexttrain;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class LeaveReminderReceiver extends BroadcastReceiver {

  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null || intent.getAction() == null) {
      return;
    }

    Context appContext = context.getApplicationContext();

    if (LeaveReminderNotifier.ACTION_DISMISS_LEAVE_ALARM.equals(intent.getAction())) {
      LeaveReminderNotifier.cancel(appContext);
      return;
    }

    if (LeaveReminderNotifier.ACTION_ON_THE_WAY.equals(intent.getAction())) {
      String journeyId = intent.getStringExtra(LeaveReminderNotifier.EXTRA_JOURNEY_ID);
      String route = intent.getStringExtra(LeaveReminderNotifier.EXTRA_ROUTE);
      String trainTime = intent.getStringExtra(LeaveReminderNotifier.EXTRA_TRAIN_TIME);
      String departureKey = intent.getStringExtra(LeaveReminderNotifier.EXTRA_DEPARTURE_KEY);
      boolean stale = intent.getBooleanExtra(LeaveReminderNotifier.EXTRA_STALE, false);
      CommuteStripScheduler.startOnTheWay(
        appContext,
        journeyId,
        route,
        trainTime,
        departureKey,
        stale
      );
      appContext.startActivity(ReminderDeepLink.openPinnedTrainIntent(appContext, journeyId));
      return;
    }

    if (!LeaveReminderScheduler.ACTION_LEAVE_REMINDER.equals(intent.getAction())) {
      return;
    }

    if (!LeaveReminderSettingsStore.isEnabled(appContext) || LeaveReminderSettingsStore.isPaused(appContext)) {
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

    if (LeaveReminderSettingsStore.isAcknowledged(appContext, departureKey)) {
      return;
    }

    String localDate = PerthTime.localDateKey();
    if (LeaveReminderScheduler.TYPE_LEAVE_NOW.equals(type)) {
      if (!LeaveReminderScheduler.isLeaveNowStillArmed(appContext, journeyId)) {
        return;
      }
      if (LeaveReminderSettingsStore.hasFired(appContext, departureKey, type)) {
        return;
      }
      if (
        !NearbyPinHelper.JOURNEY_ID.equals(journeyId) &&
        LeaveReminderSettingsStore.hasLeaveNowFiredForDay(appContext, journeyId, localDate)
      ) {
        return;
      }
    } else if (LeaveReminderScheduler.TYPE_GET_READY.equals(type)) {
      if (LeaveReminderSettingsStore.hasGetReadyFiredForDay(appContext, journeyId, localDate)) {
        return;
      }
    } else if (LeaveReminderSettingsStore.hasFired(appContext, departureKey, type)) {
      return;
    }

    LeaveReminderNotifier.show(
      appContext,
      type,
      journeyId,
      route,
      trainTime,
      stale,
      getReadyMinutes,
      departureKey
    );
    LeaveReminderSettingsStore.markFired(appContext, departureKey, type);

    if (LeaveReminderScheduler.TYPE_LEAVE_NOW.equals(type)) {
      LeaveReminderSettingsStore.markLeaveNowFiredForDay(appContext, journeyId, localDate, departureKey);
    } else if (LeaveReminderScheduler.TYPE_GET_READY.equals(type)) {
      LeaveReminderSettingsStore.markGetReadyFiredForDay(appContext, journeyId, localDate);
    }

    if (dayKey != null) {
      // No further alarms for this journey today after leave-now fires.
      if (LeaveReminderScheduler.TYPE_LEAVE_NOW.equals(type)) {
        LeaveReminderScheduler.cancelAll(appContext);
        CommuteRefreshService.refreshAll(appContext);
      }
    }
  }
}
