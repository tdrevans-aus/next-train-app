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
  private static volatile boolean widgetSetupOverlayActive = false;

  static boolean isWidgetSetupOverlayActive() {
    return widgetSetupOverlayActive;
  }

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

    String previousJson = WidgetSettingsStore.readSettings(getContext());
    WidgetSettingsStore.saveSettingsSync(getContext(), settingsJson);
    LeaveReminderScheduler.rearmNearbyPinIfNotifyTurnedOn(
      getContext(),
      previousJson,
      settingsJson
    );
    CommuteRefreshService.repaintFromCache(getContext());
    CommuteRefreshService.refreshAll(getContext());
    call.resolve();
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
  public void peekLaunchDeepLink(PluginCall call) {
    JSObject result = new JSObject();
    result.put("uri", pendingDeepLink);
    call.resolve(result);
  }

  @PluginMethod
  public void clearLaunchDeepLink(PluginCall call) {
    pendingDeepLink = null;
    call.resolve();
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
  public void getSystemWidgetPalette(PluginCall call) {
    JSObject result = new JSObject();
    if (!WidgetThemePalette.supportsDynamicSystemColors()) {
      result.put("available", false);
      result.put("api31", false);
      call.resolve(result);
      return;
    }

    WidgetThemePalette palette =
      WidgetThemePalette.resolve(getContext(), WidgetThemePalette.ID_SYSTEM);
    boolean night = WidgetThemePalette.isNightMode(getContext());
    result.put("available", true);
    result.put("api31", true);
    result.put("night", night);
    result.put("bg", WidgetThemePalette.colorToArgbHex(palette.bg));
    result.put("text", WidgetThemePalette.colorToArgbHex(palette.text));
    result.put("muted", WidgetThemePalette.colorToArgbHex(palette.muted));
    result.put("accent", WidgetThemePalette.colorToArgbHex(palette.accent));
    result.put("border", WidgetThemePalette.colorToArgbHex(palette.border));
    call.resolve(result);
  }

  @PluginMethod
  public void setWidgetSetupOverlayActive(PluginCall call) {
    widgetSetupOverlayActive = call.getBoolean("active", false);
    call.resolve();
  }

  @PluginMethod
  public void getWidgetConfigureContext(PluginCall call) {
    JSObject result = new JSObject();
    boolean active = WidgetConfigureBridge.isActive();
    result.put("active", active);
    if (active) {
      result.put("appWidgetId", WidgetConfigureBridge.getAppWidgetId());
      result.put("cancellable", true);
    }
    call.resolve(result);
  }

  @PluginMethod
  public void finishWidgetConfigure(PluginCall call) {
    boolean ok = call.getBoolean("ok", false);
    if (ok && WidgetConfigureBridge.isActive()) {
      int widgetId = WidgetConfigureBridge.getAppWidgetId();
      CommuteRefreshService.paintFromCache(getContext());
      NextTrainWidgetProvider.updateWidgetId(getContext(), widgetId);
      CommuteRefreshService.refreshAll(getContext());
    }
    WidgetConfigureBridge.finish(ok);
    call.resolve();
  }

  @PluginMethod
  public void getDebugState(PluginCall call) {
    try {
      JSONObject snapshot = WidgetSettingsStore.readSnapshot(getContext());
      JSObject result = new JSObject();
      if (snapshot == null) {
        result.put("hasSnapshot", false);
        result.put("lastRefreshMs", WidgetSettingsStore.readLastRefreshMs(getContext()));
        result.put("widgetThemeId", WidgetThemePalette.readWidgetThemeId(getContext()));
        WidgetAppearanceSettings appearance = WidgetAppearanceSettings.read(getContext());
        result.put("widgetBgOpacity", appearance.bgOpacity);
        result.put("widgetTransparentBg", appearance.transparentBg);
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
      result.put("widgetThemeId", WidgetThemePalette.readWidgetThemeId(getContext()));
      WidgetAppearanceSettings appearance = WidgetAppearanceSettings.read(getContext());
      result.put("widgetBgOpacity", appearance.bgOpacity);
      result.put("widgetTransparentBg", appearance.transparentBg);
      call.resolve(result);
    } catch (Exception error) {
      call.reject(error.getMessage());
    }
  }
}
