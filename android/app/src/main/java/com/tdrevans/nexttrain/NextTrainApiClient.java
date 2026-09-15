package com.tdrevans.nexttrain;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public final class NextTrainApiClient {

  private static final String API_BASE = "https://next-train-app.vercel.app";

  private NextTrainApiClient() {}

  public static JSONObject fetchNextTrain(
    String station,
    String direction,
    int leaveBeforeMinutes
  ) throws Exception {
    return fetchNextTrain(station, direction, leaveBeforeMinutes, null);
  }

  public static JSONObject fetchNextTrain(
    String station,
    String direction,
    int leaveBeforeMinutes,
    String cityId
  ) throws Exception {
    URL url = new URL(buildRequestUrl(station, direction, leaveBeforeMinutes, cityId));
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
    connection.setConnectTimeout(15_000);
    connection.setReadTimeout(15_000);
    connection.setRequestMethod("GET");

    int status = connection.getResponseCode();
    if (status != 200) {
      connection.disconnect();
      throw new Exception("API status " + status);
    }

    StringBuilder response = new StringBuilder();
    try (
      BufferedReader reader = new BufferedReader(
        new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8)
      )
    ) {
      String line;
      while ((line = reader.readLine()) != null) {
        response.append(line);
      }
    } finally {
      connection.disconnect();
    }

    return new JSONObject(response.toString());
  }

  /**
   * Pure query-string builder, split out so callers (widget/pin resolution, reminders) can be
   * regression-tested for always naming a non-Perth journey's city without needing real network
   * (FB widget-stuck-updating, 15 Sep 2026 — {@code WidgetPinResolver} previously called the
   * 3-arg overload here, silently dropping {@code cityId} and defaulting every pinned UK/etc.
   * fetch to the Perth catalog, where the station is unresolvable).
   */
  static String buildRequestUrl(String station, String direction, int leaveBeforeMinutes, String cityId)
    throws Exception {
    String query =
      "station=" +
      URLEncoder.encode(station, StandardCharsets.UTF_8.name()) +
      "&direction=" +
      URLEncoder.encode(direction, StandardCharsets.UTF_8.name()) +
      "&leaveBefore=" +
      leaveBeforeMinutes;
    // The API defaults to Perth when no city is given, so non-Perth
    // journeys must always name theirs.
    if (cityId != null && !cityId.isEmpty()) {
      query += "&city=" + URLEncoder.encode(cityId, StandardCharsets.UTF_8.name());
    }
    return API_BASE + "/api/next-train?" + query;
  }
}
