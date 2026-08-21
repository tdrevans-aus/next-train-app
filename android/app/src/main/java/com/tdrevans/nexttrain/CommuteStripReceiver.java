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
      LeaveReminderSettingsStore.clearOnTheWaySession(appContext);
      CommuteStripNotifier.cancelOnTheWay(appContext);
      CommuteStripNotifier.cancel(appContext);
      CommuteStripScheduler.cancelScheduledAlarms(appContext);
      return;
    }

    if (CommuteStripScheduler.ACTION_END.equals(action)) {
      LeaveReminderSettingsStore.clearOnTheWaySession(appContext);
      CommuteStripNotifier.cancelOnTheWay(appContext);
      CommuteStripNotifier.cancel(appContext);
      LeaveReminderNotifier.cancel(appContext);
      return;
    }

    if (!CommuteStripScheduler.ACTION_SHOW.equals(action)) {
      return;
    }

    if (!CommuteStripScheduler.hasNotificationPermission(appContext)) {
      return;
    }

    boolean onTheWay = LeaveReminderSettingsStore.isOnTheWayActive(appContext);
    if (!onTheWay && !LeaveReminderSettingsStore.isCommuteStripEnabled(appContext)) {
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
    long departureMs = intent.getLongExtra(CommuteStripScheduler.EXTRA_DEPARTURE_MS, 0L);
    boolean stale = intent.getBooleanExtra(CommuteStripScheduler.EXTRA_STALE, false);

    if (journeyId == null || route == null || trainTime == null || leaveByMs <= 0) {
      return;
    }

    if (departureMs <= 0) {
      departureMs = leaveByMs;
    }

    String alignedTrainTime =
      onTheWay && departureMs > 0
        ? CommuteStripNotifier.formatTrainClock24(departureMs)
        : trainTime;

    CommuteStripNotifier.show(
      appContext,
      journeyId,
      route,
      alignedTrainTime,
      leaveByMs,
      departureMs,
      stale,
      onTheWay
    );

    if (onTheWay) {
      CommuteStripScheduler.scheduleOnTheWayPhaseAlarms(
        appContext,
        journeyId,
        route,
        alignedTrainTime,
        leaveByMs,
        departureMs,
        endAtMs,
        stale
      );
      return;
    }

    // Before leave-by the chronometer tracks leave; at leave-by switch to train countdown.
    long refreshNow = System.currentTimeMillis();
    if (leaveByMs > refreshNow && departureMs > leaveByMs) {
      CommuteStripScheduler.scheduleShowRefresh(
        appContext,
        journeyId,
        route,
        trainTime,
        leaveByMs,
        departureMs,
        endAtMs,
        stale
      );
    }
  }
}
