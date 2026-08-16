package com.tdrevans.nexttrain;

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
}
