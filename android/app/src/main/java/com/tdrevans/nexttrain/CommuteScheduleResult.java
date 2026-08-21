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
}
