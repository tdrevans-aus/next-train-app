package com.tdrevans.nexttrain;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.os.Build;

/**
 * Shared widget alarm scheduling. From Android 12 SCHEDULE_EXACT_ALARM can be
 * denied (and from Android 14 it is denied by default), so exact alarms must be
 * gated on {@link AlarmManager#canScheduleExactAlarms()} — otherwise the
 * SecurityException silently degrades every widget update to a batched set().
 */
public final class WidgetAlarms {

  /** Inexact fallback window — keeps the countdown close without the exact-alarm permission. */
  static final long FALLBACK_WINDOW_MS = 60_000L;

  private WidgetAlarms() {}

  public static boolean canScheduleExact(AlarmManager manager) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return true;
    }
    try {
      return manager.canScheduleExactAlarms();
    } catch (Exception error) {
      return false;
    }
  }

  public static void scheduleWakeup(AlarmManager manager, long triggerAt, PendingIntent pending) {
    if (canScheduleExact(manager)) {
      try {
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending);
        return;
      } catch (SecurityException error) {
        // Permission revoked between the check and the call — fall through.
      }
    }
    manager.setWindow(AlarmManager.RTC_WAKEUP, triggerAt, FALLBACK_WINDOW_MS, pending);
  }
}
