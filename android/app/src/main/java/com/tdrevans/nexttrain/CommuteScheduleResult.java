package com.tdrevans.nexttrain;

import org.json.JSONObject;

/** Loaded commute/widget payload used by {@link CommuteSchedule#load}. */
public class CommuteScheduleResult {

  public JSONObject settings;
  public JSONObject journey;
  public JSONObject payload;
  public JSONObject next;
  public boolean departMode;
  public boolean stale;
  public boolean empty;
  public boolean nearbyFallback;
  public boolean widgetLocked;
  public long refreshedAtMs;
  public String journeyId;
  public String route;
  public String leaveByIso;
  public String departureIso;
  public String displayTime;
  public String status;
  public String leavePhase;
  public int minutesUntilLeave;
  /**
   * Set when {@link CommuteSchedule#load} threw before a fetch produced any usable data
   * (no payload, no cached departure to fall back to) — the moment this failure episode
   * started, carried forward across refreshes so the widget can time out of "Updating…"
   * into a clear error face instead of sitting on it forever (FB widget-stuck-updating,
   * 15 Sep 2026).
   */
  public long fetchFailedSinceMs;
}
