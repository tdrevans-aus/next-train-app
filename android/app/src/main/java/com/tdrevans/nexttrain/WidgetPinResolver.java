package com.tdrevans.nexttrain;

import android.content.Context;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/** Picks the soonest upcoming pinned train across Near me + journey pins (FB-20 widget). */
public final class WidgetPinResolver {

  private WidgetPinResolver() {}

  public static CommuteSchedule.Result loadBestPinnedResult(
    Context context,
    JSONObject settings
  ) throws Exception {
    if (settings == null) {
      return null;
    }

    List<CommuteSchedule.Result> candidates = new ArrayList<>();
    JSONObject nearbyPin = settings.optJSONObject("nearbyPin");
    if (NearbyPinHelper.isHolding(nearbyPin)) {
      CommuteSchedule.Result nearby = loadNearbyPinResult(settings, nearbyPin);
      if (nearby != null) {
        candidates.add(nearby);
      }
    }

    JSONArray journeys = settings.optJSONArray("journeys");
    if (journeys != null) {
      for (int index = 0; index < journeys.length(); index += 1) {
        JSONObject journey = journeys.optJSONObject(index);
        if (journey == null || !isConfiguredJourney(journey)) {
          continue;
        }
        if (!JourneyPinHelper.isJourneyPinnedToday(journey)) {
          continue;
        }
        CommuteSchedule.Result journeyResult = loadJourneyPinResult(settings, journey);
        if (journeyResult != null) {
          candidates.add(journeyResult);
        }
      }
    }

    return pickSoonestPinned(settings, candidates);
  }

  static CommuteSchedule.Result loadNearbyPinResult(JSONObject settings, JSONObject pin)
    throws Exception {
    if (!NearbyPinHelper.isHolding(pin)) {
      return null;
    }

    int leaveBefore = settings.optInt("nearbyLeaveBeforeMinutes", 10);
    JSONObject payload =
      NextTrainApiClient.fetchNextTrain(
        pin.optString("station", ""),
        pin.optString("direction", ""),
        leaveBefore,
        pin.optString("cityId", "")
      );

    String departureIso = pin.optString("departureIso", "");
    JSONObject trip = NearbyPinHelper.findTripByDeparture(payload, departureIso);
    if (trip == null) {
      trip = NearbyPinHelper.buildSyntheticTrip(pin, leaveBefore);
    }
    if (trip == null) {
      return null;
    }

    CommuteSchedule.Result result = new CommuteSchedule.Result();
    result.settings = settings;
    result.journey = buildNearbyJourney(settings, pin);
    result.journeyId = NearbyPinHelper.JOURNEY_ID;
    result.route = NearbyPinHelper.formatRoute(pin);
    result.departMode = false;
    result.payload = payload;
    result.next = trip;
    CommuteSchedule.fillTripFields(result);
    return result;
  }

  static CommuteSchedule.Result loadJourneyPinResult(JSONObject settings, JSONObject journey)
    throws Exception {
    boolean departMode = !journey.optBoolean("useLeaveBefore", true);
    int leaveBefore = departMode ? 0 : journey.optInt("leaveBeforeMinutes", 10);
    JSONObject payload =
      NextTrainApiClient.fetchNextTrain(
        journey.optString("station", ""),
        journey.optString("direction", ""),
        leaveBefore,
        journey.optString("cityId", "")
      );
    JSONObject trip = JourneyPinHelper.resolvePinnedTrip(payload, journey);
    if (trip == null) {
      return null;
    }

    CommuteSchedule.Result result = new CommuteSchedule.Result();
    result.settings = settings;
    result.journey = journey;
    result.journeyId = journey.optString("id");
    result.route = WidgetDataService.formatRoute(journey);
    result.departMode = departMode;
    result.payload = payload;
    result.next = trip;
    CommuteSchedule.fillTripFields(result);
    return result;
  }

  static CommuteSchedule.Result pickSoonestPinned(
    JSONObject settings,
    List<CommuteSchedule.Result> candidates
  ) {
    CommuteSchedule.Result best = null;
    long bestDepartureMs = Long.MAX_VALUE;

    for (CommuteSchedule.Result candidate : candidates) {
      if (!isEligiblePinnedCandidate(settings, candidate)) {
        continue;
      }

      long departureMs = PerthTime.epochMillisFromIso(candidate.departureIso);
      if (departureMs <= 0L) {
        continue;
      }

      if (departureMs < bestDepartureMs) {
        bestDepartureMs = departureMs;
        best = candidate;
      }
    }

    return best;
  }

  static boolean isEligiblePinnedCandidate(JSONObject settings, CommuteSchedule.Result candidate) {
    if (candidate == null || candidate.next == null) {
      return false;
    }

    if (NearbyPinHelper.JOURNEY_ID.equals(candidate.journeyId)) {
      return NearbyPinHelper.isHolding(settings.optJSONObject("nearbyPin"));
    }

    return !CommuteSchedule.hasDepartureMinutePassed(candidate.departureIso);
  }

  static boolean isConfiguredJourney(JSONObject journey) {
    String station = journey.optString("station", "");
    String direction = journey.optString("direction", "");
    return !station.isEmpty() && !direction.isEmpty();
  }

  static JSONObject buildNearbyJourney(JSONObject settings, JSONObject pin) throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("id", NearbyPinHelper.JOURNEY_ID);
    journey.put("name", "Near me");
    journey.put("station", pin.optString("station", ""));
    journey.put("direction", pin.optString("direction", ""));
    journey.put("useLeaveBefore", true);
    journey.put("leaveBeforeMinutes", settings.optInt("nearbyLeaveBeforeMinutes", 10));
    return journey;
  }
}
