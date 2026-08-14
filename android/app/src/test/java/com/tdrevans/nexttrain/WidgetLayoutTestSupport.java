package com.tdrevans.nexttrain;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.RemoteViews;
import androidx.test.core.app.ApplicationProvider;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * FB-28 helpers: verify widget layouts define expected ids, and read bound text /
 * visibility from {@link RemoteViews} without {@link RemoteViews#reapply} (Robolectric
 * cannot replay every reflection action, e.g. {@code setGravity} on {@code TextView}).
 */
final class WidgetLayoutTestSupport {

  private WidgetLayoutTestSupport() {}

  static Context appContext() {
    return ApplicationProvider.getApplicationContext();
  }

  static WidgetUiBuilder.WidgetSize small2x1() {
    return new WidgetUiBuilder.WidgetSize(110, 40, R.layout.widget_small);
  }

  static WidgetUiBuilder.WidgetSize medium3x1() {
    // ≥55dp avoids short-cell route fold so medium shows route + Updated footer separately.
    return new WidgetUiBuilder.WidgetSize(250, 80, R.layout.widget_medium);
  }

  static void assertLayoutDefines(WidgetUiBuilder.WidgetSize size, int... viewIds) {
    Context context = appContext();
    View root = LayoutInflater.from(context).inflate(size.layoutId, null, false);
    for (int viewId : viewIds) {
      if (root.findViewById(viewId) == null) {
        throw new AssertionError("Layout " + size.layoutId + " missing view id " + viewId);
      }
    }
  }

  static RemoteViewsBinding capture(RemoteViews remoteViews) {
    return RemoteViewsBinding.from(remoteViews);
  }

  static final class RemoteViewsBinding {
    private final Map<Integer, String> textByViewId = new HashMap<>();
    private final Map<Integer, Integer> visibilityByViewId = new HashMap<>();

    static RemoteViewsBinding from(RemoteViews remoteViews) {
      RemoteViewsBinding binding = new RemoteViewsBinding();
      try {
        Field actionsField = RemoteViews.class.getDeclaredField("mActions");
        actionsField.setAccessible(true);
        @SuppressWarnings("unchecked")
        ArrayList<Object> actions = (ArrayList<Object>) actionsField.get(remoteViews);
        if (actions == null) {
          return binding;
        }
        for (Object action : actions) {
          binding.applyAction(action);
        }
      } catch (ReflectiveOperationException e) {
        throw new AssertionError("Failed to read RemoteViews actions", e);
      }
      return binding;
    }

    private void applyAction(Object action) {
      String methodName = asString(readField(action, "methodName"));
      if (methodName == null) {
        return;
      }
      Integer viewId = asInt(readField(action, "viewId"));
      if (viewId == null) {
        return;
      }
      Object value = readField(action, "value");
      switch (methodName) {
        case "setText":
          textByViewId.put(viewId, value == null ? "" : value.toString());
          break;
        case "setVisibility":
          visibilityByViewId.put(viewId, value instanceof Integer ? (Integer) value : View.GONE);
          break;
        default:
          break;
      }
    }

    private static Object readField(Object target, String name) {
      Class<?> clazz = target.getClass();
      while (clazz != null) {
        try {
          Field field = clazz.getDeclaredField(name);
          field.setAccessible(true);
          return field.get(target);
        } catch (ReflectiveOperationException ignored) {
          clazz = clazz.getSuperclass();
        }
      }
      return null;
    }

    private static String asString(Object value) {
      return value == null ? null : value.toString();
    }

    private static Integer asInt(Object value) {
      return value instanceof Integer ? (Integer) value : null;
    }

    String text(int viewId) {
      return textByViewId.getOrDefault(viewId, "");
    }

    int visibility(int viewId) {
      return visibilityByViewId.getOrDefault(viewId, View.GONE);
    }

    String primaryDisplay() {
      String value = text(R.id.widget_primary_value);
      String unit = text(R.id.widget_primary_unit);
      if (unit.isEmpty()) {
        return value;
      }
      return value + " " + unit;
    }
  }
}
