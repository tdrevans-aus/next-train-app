package com.tdrevans.nexttrain;

import android.content.Context;
import android.graphics.Bitmap;
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

  static Bitmap bitmapForView(RemoteViews remoteViews, int targetViewId) {
    try {
      Field actionsField = RemoteViews.class.getDeclaredField("mActions");
      actionsField.setAccessible(true);
      @SuppressWarnings("unchecked")
      ArrayList<Object> actions = (ArrayList<Object>) actionsField.get(remoteViews);
      if (actions == null) {
        return null;
      }
      for (Object action : actions) {
        Integer viewId = resolveViewId(action);
        if (viewId == null || viewId != targetViewId) {
          continue;
        }
        Object bitmap = readActionField(action, "bitmap");
        if (bitmap == null) {
          bitmap = readActionField(action, "mBitmap");
        }
        if (bitmap instanceof Bitmap) {
          return (Bitmap) bitmap;
        }
      }
    } catch (ReflectiveOperationException e) {
      throw new AssertionError("Failed to read RemoteViews bitmap action", e);
    }
    return null;
  }

  private static Integer resolveViewId(Object action) {
    Integer viewId = asInt(readActionField(action, "viewId"));
    if (viewId != null) {
      return viewId;
    }
    return asInt(readActionField(action, "mViewId"));
  }

  private static Object readActionField(Object target, String name) {
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

  private static Integer asInt(Object value) {
    return value instanceof Integer ? (Integer) value : null;
  }

  static final class RemoteViewsBinding {
    private final Map<Integer, String> textByViewId = new HashMap<>();
    private final Map<Integer, Integer> visibilityByViewId = new HashMap<>();
    private final Map<Integer, Bitmap> bitmapByViewId = new HashMap<>();
    private final Map<Integer, Integer> backgroundColorByViewId = new HashMap<>();

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
      String className = action.getClass().getSimpleName();
      String methodName = asString(readActionField(action, "methodName"));
      Integer viewId = resolveViewId(action);

      if (className.contains("Bitmap")) {
        Object bitmap = readActionField(action, "bitmap");
        if (bitmap == null) {
          bitmap = readActionField(action, "mBitmap");
        }
        if (viewId != null && bitmap instanceof Bitmap) {
          bitmapByViewId.put(viewId, (Bitmap) bitmap);
        }
        return;
      }

      if (methodName == null) {
        return;
      }
      if (viewId == null) {
        return;
      }
      Object value = readActionField(action, "value");
      Object bitmap = readActionField(action, "bitmap");
      switch (methodName) {
        case "setText":
          textByViewId.put(viewId, value == null ? "" : value.toString());
          break;
        case "setVisibility":
          visibilityByViewId.put(viewId, value instanceof Integer ? (Integer) value : View.GONE);
          break;
        case "setImageViewBitmap":
        case "setImageBitmap":
          if (bitmap instanceof Bitmap) {
            bitmapByViewId.put(viewId, (Bitmap) bitmap);
          } else if (value instanceof Bitmap) {
            bitmapByViewId.put(viewId, (Bitmap) value);
          }
          break;
        case "setBackgroundColor":
          if (value instanceof Integer) {
            backgroundColorByViewId.put(viewId, (Integer) value);
          }
          break;
        default:
          break;
      }
    }

    private static Object readActionField(Object target, String name) {
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

    private static Integer resolveViewId(Object action) {
      Integer viewId = asInt(readActionField(action, "viewId"));
      if (viewId != null) {
        return viewId;
      }
      return asInt(readActionField(action, "mViewId"));
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

    Bitmap bitmap(int viewId) {
      return bitmapByViewId.get(viewId);
    }

    Integer backgroundColor(int viewId) {
      return backgroundColorByViewId.get(viewId);
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
