package com.tdrevans.nexttrain;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "CommuteMode",
  permissions = {
    @Permission(
      strings = { Manifest.permission.POST_NOTIFICATIONS },
      alias = "notifications"
    )
  }
)
public class CommuteModePlugin extends Plugin {

  @PluginMethod
  public void start(PluginCall call) {
    String station = call.getString("station");
    String direction = call.getString("direction");
    Integer leaveBefore = call.getInt("leaveBeforeMinutes", 10);
    Integer skipTrains = call.getInt("skipTrains", 0);

    if (station == null || station.isEmpty() || direction == null || direction.isEmpty()) {
      call.reject("Missing station or direction");
      return;
    }

    if (needsNotificationPermission()) {
      requestPermissionForAlias("notifications", call, "notificationsPermsCallback");
      return;
    }

    startCommute(call, station, direction, leaveBefore, skipTrains);
  }

  @PermissionCallback
  private void notificationsPermsCallback(PluginCall call) {
    if (call == null) {
      return;
    }

    if (needsNotificationPermission()) {
      call.reject("Notification permission is required for Heading to station");
      return;
    }

    startCommute(
      call,
      call.getString("station"),
      call.getString("direction"),
      call.getInt("leaveBeforeMinutes", 10),
      call.getInt("skipTrains", 0)
    );
  }

  @PluginMethod
  public void stop(PluginCall call) {
    CommuteNotificationService.stop(getContext());
    JSObject result = new JSObject();
    result.put("active", false);
    call.resolve(result);
  }

  @PluginMethod
  public void isActive(PluginCall call) {
    JSObject result = new JSObject();
    result.put("active", CommuteNotificationService.isRunning());
    call.resolve(result);
  }

  private void startCommute(
    PluginCall call,
    String station,
    String direction,
    int leaveBefore,
    int skipTrains
  ) {
    CommuteNotificationService.start(
      getContext(),
      station,
      direction,
      leaveBefore,
      Math.max(0, skipTrains)
    );
    JSObject result = new JSObject();
    result.put("active", true);
    call.resolve(result);
  }

  private boolean needsNotificationPermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return false;
    }

    return (
      ContextCompat.checkSelfPermission(
        getContext(),
        Manifest.permission.POST_NOTIFICATIONS
      ) !=
      PackageManager.PERMISSION_GRANTED
    );
  }
}
