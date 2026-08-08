package com.tdrevans.nexttrain;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class CommuteNotificationService extends Service {

  public static final String ACTION_STOP = "com.tdrevans.nexttrain.action.STOP_COMMUTE";
  private static final String CHANNEL_ID = "commute_mode";
  private static final int NOTIFICATION_ID = 41001;
  private static final String API_BASE = "https://next-train-app.vercel.app";
  private static final long POLL_INTERVAL_MS = 30_000L;
  private static final long MAX_RUNTIME_MS = 90 * 60_000L;

  private static volatile boolean running = false;

  private HandlerThread workerThread;
  private Handler workerHandler;
  private Runnable pollRunnable;
  private long startedAtMs;

  private String station;
  private String direction;
  private int leaveBeforeMinutes;
  private int skipTrains;

  public static boolean isRunning() {
    return running;
  }

  public static void start(
    Context context,
    String station,
    String direction,
    int leaveBeforeMinutes,
    int skipTrains
  ) {
    Intent intent = new Intent(context, CommuteNotificationService.class);
    intent.putExtra("station", station);
    intent.putExtra("direction", direction);
    intent.putExtra("leaveBeforeMinutes", leaveBeforeMinutes);
    intent.putExtra("skipTrains", skipTrains);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(intent);
    } else {
      context.startService(intent);
    }
  }

  public static void stop(Context context) {
    Intent intent = new Intent(context, CommuteNotificationService.class);
    intent.setAction(ACTION_STOP);
    context.startService(intent);
  }

  @Override
  public void onCreate() {
    super.onCreate();
    createNotificationChannel();
    workerThread = new HandlerThread("CommuteModeWorker");
    workerThread.start();
    workerHandler = new Handler(workerThread.getLooper());
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent != null && ACTION_STOP.equals(intent.getAction())) {
      shutdown();
      return START_NOT_STICKY;
    }

    if (intent != null) {
      station = intent.getStringExtra("station");
      direction = intent.getStringExtra("direction");
      leaveBeforeMinutes = intent.getIntExtra("leaveBeforeMinutes", 10);
      skipTrains = Math.max(0, intent.getIntExtra("skipTrains", 0));
    }

    if (station == null || direction == null) {
      shutdown();
      return START_NOT_STICKY;
    }

    running = true;
    startedAtMs = System.currentTimeMillis();

    startForeground(
      NOTIFICATION_ID,
      buildNotification("Heading to station", "Fetching live train times…")
    );

    if (pollRunnable != null) {
      workerHandler.removeCallbacks(pollRunnable);
    }

    pollRunnable =
      new Runnable() {
        @Override
        public void run() {
          if (!running) {
            return;
          }

          boolean shouldStop = pollOnce();
          if (!running || shouldStop) {
            shutdown();
            return;
          }

          workerHandler.postDelayed(this, POLL_INTERVAL_MS);
        }
      };

    workerHandler.post(pollRunnable);
    return START_STICKY;
  }

  @Override
  public void onDestroy() {
    running = false;
    if (workerThread != null) {
      workerThread.quitSafely();
      workerThread = null;
    }
    super.onDestroy();
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  private boolean pollOnce() {
    if (System.currentTimeMillis() - startedAtMs > MAX_RUNTIME_MS) {
      updateNotification("Heading to station ended", "Session timed out after 90 minutes");
      return true;
    }

    try {
      JSONObject payload = fetchNextTrain();
      if (payload == null) {
        updateNotification("Next Train", "Could not load train times");
        return false;
      }

      JSONObject next = payload.optJSONObject("next");
      if (next == null) {
        updateNotification(
          formatRouteLabel() + " · No trains",
          "No upcoming trains in this direction"
        );
        return false;
      }

      String title = buildTitle(next);
      String body = buildBody(next);
      updateNotification(title, body);

      String leavePhase = next.optString("leavePhase", "");
      int minutesUntilLeave = next.optInt("minutesUntilLeave", 0);
      int minutesUntilArrival = next.optInt("minutesUntilArrival", 0);

      if ("missed".equals(leavePhase) && minutesUntilArrival <= -10) {
        updateNotification("Heading to station ended", "Train window passed");
        return true;
      }

      if (minutesUntilLeave < -20) {
        updateNotification("Heading to station ended", "Leave window passed");
        return true;
      }

      return false;
    } catch (Exception error) {
      updateNotification("Next Train", "Update failed — retrying…");
      return false;
    }
  }

  private JSONObject fetchNextTrain() throws Exception {
    String query =
      "station=" +
      URLEncoder.encode(station, StandardCharsets.UTF_8.name()) +
      "&direction=" +
      URLEncoder.encode(direction, StandardCharsets.UTF_8.name()) +
      "&leaveBefore=" +
      leaveBeforeMinutes +
      "&skipTrains=" +
      skipTrains;

    URL url = new URL(API_BASE + "/api/next-train?" + query);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
    connection.setConnectTimeout(15_000);
    connection.setReadTimeout(15_000);
    connection.setRequestMethod("GET");

    int status = connection.getResponseCode();
    if (status != 200) {
      connection.disconnect();
      return null;
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

  private String formatRouteLabel() {
    String stationLabel = station.replace(" Stn", "");
    return stationLabel + " → " + direction;
  }

  private String buildTitle(JSONObject next) {
    String leavePhase = next.optString("leavePhase", "calm");
    int minutesUntilLeave = next.optInt("minutesUntilLeave", 0);

    if ("late".equals(leavePhase)) {
      return "Leave now — you're late";
    }
    if ("now".equals(leavePhase)) {
      return "Leave now";
    }
    if ("missed".equals(leavePhase)) {
      return "Train window passed";
    }
    if (minutesUntilLeave == 1) {
      return "Leave in 1 minute";
    }
    if (minutesUntilLeave >= 0) {
      return "Leave in " + minutesUntilLeave + " minutes";
    }

    return "Next Train";
  }

  private String buildBody(JSONObject next) {
    String displayTime = next.optString("displayTime", "—");
    String platform = next.optString("platform", "—");
    String status = next.optString("status", "—");
    return (
      formatRouteLabel() +
      " · Train " +
      displayTime +
      " · Plat " +
      platform +
      " · " +
      status
    );
  }

  private void updateNotification(String title, String body) {
    NotificationManager manager = (NotificationManager) getSystemService(
      Context.NOTIFICATION_SERVICE
    );
    if (manager != null) {
      manager.notify(NOTIFICATION_ID, buildNotification(title, body));
    }
  }

  private Notification buildNotification(String title, String body) {
    Intent openIntent = new Intent(this, MainActivity.class);
    openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent openPending = PendingIntent.getActivity(
      this,
      0,
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    Intent stopIntent = new Intent(this, CommuteNotificationService.class);
    stopIntent.setAction(ACTION_STOP);
    PendingIntent stopPending = PendingIntent.getService(
      this,
      1,
      stopIntent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    return new NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(openPending)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .addAction(0, "Stop", stopPending)
      .build();
  }

  private void createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationChannel channel = new NotificationChannel(
      CHANNEL_ID,
      "Heading to station",
      NotificationManager.IMPORTANCE_LOW
    );
    channel.setDescription("Live train times while you head to the station");

    NotificationManager manager = getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.createNotificationChannel(channel);
    }
  }

  private void shutdown() {
    running = false;
    stopForeground(STOP_FOREGROUND_REMOVE);
    stopSelf();
  }
}
