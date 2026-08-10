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
    String query =
      "station=" +
      URLEncoder.encode(station, StandardCharsets.UTF_8.name()) +
      "&direction=" +
      URLEncoder.encode(direction, StandardCharsets.UTF_8.name()) +
      "&leaveBefore=" +
      leaveBeforeMinutes;

    URL url = new URL(API_BASE + "/api/next-train?" + query);
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
}
