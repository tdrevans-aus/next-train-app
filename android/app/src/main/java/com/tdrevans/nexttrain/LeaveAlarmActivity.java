package com.tdrevans.nexttrain;

import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Full-screen leave-by alarm (FB-34). OK starts the on-the-way countdown (FB-16).
 */
public class LeaveAlarmActivity extends AppCompatActivity {

  public static final String EXTRA_JOURNEY_ID = "journey_id";
  public static final String EXTRA_ROUTE = "route";
  public static final String EXTRA_TRAIN_TIME = "train_time";
  public static final String EXTRA_DEPARTURE_KEY = "departure_key";
  public static final String EXTRA_STALE = "stale";

  private MediaPlayer alarmPlayer;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
    } else {
      getWindow().addFlags(
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
      );
    }
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    setContentView(R.layout.activity_leave_alarm);

    Intent intent = getIntent();
    String journeyId = intent != null ? intent.getStringExtra(EXTRA_JOURNEY_ID) : null;
    String route = intent != null ? intent.getStringExtra(EXTRA_ROUTE) : null;
    String trainTime = intent != null ? intent.getStringExtra(EXTRA_TRAIN_TIME) : null;
    String departureKey = intent != null ? intent.getStringExtra(EXTRA_DEPARTURE_KEY) : null;
    boolean stale = intent != null && intent.getBooleanExtra(EXTRA_STALE, false);

    TextView routeView = findViewById(R.id.leave_alarm_route);
    TextView trainView = findViewById(R.id.leave_alarm_train);
    Button okButton = findViewById(R.id.leave_alarm_ok);

    String routeText = route != null && !route.isEmpty() ? route : "Your journey";
    routeView.setText(routeText);

    String trainText = trainTime != null && !trainTime.isEmpty() ? "Train " + trainTime : "";
    if (stale && !trainText.isEmpty()) {
      trainText += " · Times may be out of date";
    } else if (stale) {
      trainText = "Times may be out of date";
    }
    trainView.setText(trainText);

    startAlarmSound();

    okButton.setOnClickListener(v -> {
      stopAlarmSound();
      CommuteStripScheduler.startOnTheWay(
        getApplicationContext(),
        journeyId,
        route,
        trainTime,
        departureKey,
        stale
      );
      startActivity(ReminderDeepLink.openPinnedTrainIntent(this, journeyId));
      finish();
    });
  }

  @Override
  protected void onDestroy() {
    stopAlarmSound();
    super.onDestroy();
  }

  private void startAlarmSound() {
    stopAlarmSound();
    try {
      Uri uri = Settings.System.DEFAULT_ALARM_ALERT_URI;
      if (uri == null) {
        uri = Settings.System.DEFAULT_RINGTONE_URI;
      }
      alarmPlayer = new MediaPlayer();
      alarmPlayer.setDataSource(this, uri);
      alarmPlayer.setAudioAttributes(
        new AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      );
      alarmPlayer.setLooping(true);
      alarmPlayer.prepare();
      alarmPlayer.start();
    } catch (Exception error) {
      alarmPlayer = null;
    }
  }

  private void stopAlarmSound() {
    if (alarmPlayer == null) {
      return;
    }
    try {
      alarmPlayer.stop();
    } catch (Exception ignored) {
      // Already stopped.
    }
    alarmPlayer.release();
    alarmPlayer = null;
  }
}
