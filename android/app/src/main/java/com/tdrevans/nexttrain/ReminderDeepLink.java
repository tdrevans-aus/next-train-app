package com.tdrevans.nexttrain;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;

/** Deep links for leave reminders / commute strip notification taps. */
public final class ReminderDeepLink {

  private ReminderDeepLink() {}

  public static Uri forJourney(String journeyId) {
    if (journeyId != null && NearbyPinHelper.JOURNEY_ID.equals(journeyId)) {
      return Uri.parse("nexttrain://nearby");
    }
    return Uri.parse("nexttrain://journey/" + (journeyId != null ? journeyId : ""));
  }

  /** Bring the app to the pinned train (Near me pin or journey/route). */
  public static Intent openPinnedTrainIntent(Context context, String journeyId) {
    Intent openIntent = new Intent(context, MainActivity.class);
    openIntent.setAction(Intent.ACTION_VIEW);
    openIntent.setData(forJourney(journeyId));
    openIntent.setFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK |
      Intent.FLAG_ACTIVITY_CLEAR_TOP |
      Intent.FLAG_ACTIVITY_SINGLE_TOP
    );
    return openIntent;
  }
}
