package com.tdrevans.nexttrain;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

@CapacitorPlugin(name = "WidgetSync")
public class WidgetSyncPlugin extends Plugin {

  private static String pendingDeepLink;

  public static void setPendingDeepLink(String uri) {
    pendingDeepLink = uri;
  }

  @PluginMethod
  public void syncSettings(PluginCall call) {
    String settingsJson = call.getString("settingsJson");
    if (settingsJson == null || settingsJson.isEmpty()) {
      call.reject("Missing settingsJson");
      return;
    }

    WidgetSettingsStore.saveSettings(getContext(), settingsJson);
    CommuteRefreshService.refreshAll(getContext());
  }

  @PluginMethod
  public void requestPinWidget(PluginCall call) {
    JSObject result = new JSObject();
    result.put("requested", false);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
      ComponentName provider = new ComponentName(getContext(), NextTrainWidgetProvider.class);
      if (manager.isRequestPinAppWidgetSupported()) {
        Intent success = new Intent(getContext(), MainActivity.class);
        PendingIntent callback = PendingIntent.getActivity(
          getContext(),
          42,
          success,
          PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        manager.requestPinAppWidget(provider, null, callback);
        result.put("requested", true);
      }
    }

    call.resolve(result);
  }

  @PluginMethod
  public void getLaunchDeepLink(PluginCall call) {
    JSObject result = new JSObject();
    result.put("uri", pendingDeepLink);
    pendingDeepLink = null;
    call.resolve(result);
  }

  @PluginMethod
  public void isAvailable(PluginCall call) {
    JSObject result = new JSObject();
    result.put("available", true);
    call.resolve(result);
  }

  @PluginMethod
  public void getWidgetInstanceCount(PluginCall call) {
    AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
    ComponentName provider = new ComponentName(getContext(), NextTrainWidgetProvider.class);
    int[] ids = manager.getAppWidgetIds(provider);
    JSObject result = new JSObject();
    result.put("count", ids != null ? ids.length : 0);
    call.resolve(result);
  }

  @PluginMethod
  public void isDebugBuild(PluginCall call) {
    boolean debug =
      (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    JSObject result = new JSObject();
    result.put("debug", debug);
    call.resolve(result);
  }

  @PluginMethod
  public void getDebugState(PluginCall call) {
    try {
      JSONObject snapshot = WidgetSettingsStore.readSnapshot(getContext());
      JSObject result = new JSObject();
      if (snapshot == null) {
        result.put("hasSnapshot", false);
        result.put("lastRefreshMs", WidgetSettingsStore.readLastRefreshMs(getContext()));
        call.resolve(result);
        return;
      }

      result.put("hasSnapshot", true);
      result.put("primary", snapshot.optString("primary"));
      result.put("secondary", snapshot.optString("secondary"));
      result.put("stale", snapshot.optBoolean("stale"));
      result.put("refreshedAtMs", snapshot.optLong("refreshedAtMs", 0L));
      result.put("updatingSinceMs", snapshot.optLong("updatingSinceMs", 0L));
      result.put("updatingRetried", snapshot.optBoolean("updatingRetried"));
      result.put("followingDepartureIso", snapshot.optString("followingDepartureIso", ""));
      result.put("departureIso", snapshot.optString("departureIso", ""));
      result.put("updatedLine", snapshot.optString("updatedLine", ""));
      result.put("lastRefreshMs", WidgetSettingsStore.readLastRefreshMs(getContext()));
      call.resolve(result);
    } catch (Exception error) {
      call.reject(error.getMessage());
    }
  }
}
