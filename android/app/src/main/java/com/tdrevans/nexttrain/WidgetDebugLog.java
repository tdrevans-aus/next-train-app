package com.tdrevans.nexttrain;

import android.util.Log;
import org.json.JSONObject;

/** Structured log lines for widget freshness diagnosis (logcat tag: NextTrainWidget). */
public final class WidgetDebugLog {

  public static final String TAG = "NextTrainWidget";

  private WidgetDebugLog() {}

  public static void refreshStart(String trigger) {
    Log.i(TAG, "refresh start trigger=" + trigger);
  }

  public static void refreshDone(JSONObject snapshot) {
    if (snapshot == null) {
      Log.i(TAG, "refresh done snapshot=null");
      return;
    }
    Log.i(TAG, summarize(snapshot, "refresh done"));
  }

  public static void paintDone(JSONObject snapshot, String reason) {
    if (snapshot == null) {
      Log.i(TAG, "paint reason=" + reason + " snapshot=null");
      return;
    }
    Log.i(TAG, summarize(snapshot, "paint reason=" + reason));
  }

  static String summarize(JSONObject snapshot, String prefix) {
    return prefix
      + " primary=" + snapshot.optString("primary")
      + " secondary=" + snapshot.optString("secondary")
      + " stale=" + snapshot.optBoolean("stale")
      + " refreshedAtMs=" + snapshot.optLong("refreshedAtMs", 0L)
      + " updatingSinceMs=" + snapshot.optLong("updatingSinceMs", 0L)
      + " following="
      + !snapshot.optString("followingDepartureIso", "").isEmpty();
  }
}
