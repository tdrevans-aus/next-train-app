package com.tdrevans.nexttrain;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.View;
import android.widget.RemoteViews;

/** Paints rounded widget card background + optional legibility scrim (FB-36). */
final class WidgetBackgroundPainter {

  private static final float CORNER_RADIUS_DP = 16f;
  private static final float STROKE_WIDTH_DP = 1f;
  /** ~30% black scrim when opacity is below 50%. */
  private static final int LEGIBILITY_SCRIM_COLOR = 0x4D000000;

  private WidgetBackgroundPainter() {}

  static void apply(
    RemoteViews views,
    Context context,
    WidgetThemePalette palette,
    WidgetAppearanceSettings appearance,
    WidgetUiBuilder.WidgetSize size
  ) {
    int opacity = appearance.effectiveBgOpacity();
    float density = context.getResources().getDisplayMetrics().density;
    int widthPx = Math.max((int) (size.widthDp * density), 1);
    int heightPx = Math.max((int) (size.heightDp * density), 1);

    if (opacity <= 0) {
      views.setViewVisibility(R.id.widget_bg_layer, View.GONE);
      views.setViewVisibility(R.id.widget_text_scrim, View.GONE);
      views.setInt(R.id.widget_root, "setBackgroundColor", Color.TRANSPARENT);
      return;
    }

    int alpha = Math.round((opacity / 100f) * 255f);
    int fill = (alpha << 24) | (palette.bg & 0x00FFFFFF);
    int cornerPx = (int) (CORNER_RADIUS_DP * density);
    int strokePx = Math.max(1, (int) (STROKE_WIDTH_DP * density));

    GradientDrawable drawable = new GradientDrawable();
    drawable.setCornerRadius(cornerPx);
    drawable.setColor(fill);
    if (!appearance.transparentBg && opacity > 0) {
      drawable.setStroke(strokePx, palette.border);
    }

    Bitmap bgBitmap = drawableToBitmap(drawable, widthPx, heightPx);
    views.setViewVisibility(R.id.widget_bg_layer, View.VISIBLE);
    views.setImageViewBitmap(R.id.widget_bg_layer, bgBitmap);
    views.setInt(R.id.widget_root, "setBackgroundColor", Color.TRANSPARENT);

    if (appearance.needsLegibilityAid()) {
      GradientDrawable scrim = new GradientDrawable();
      scrim.setCornerRadius(cornerPx);
      scrim.setColor(LEGIBILITY_SCRIM_COLOR);
      Bitmap scrimBitmap = drawableToBitmap(scrim, widthPx, heightPx);
      views.setViewVisibility(R.id.widget_text_scrim, View.VISIBLE);
      views.setImageViewBitmap(R.id.widget_text_scrim, scrimBitmap);
    } else {
      views.setViewVisibility(R.id.widget_text_scrim, View.GONE);
    }
  }

  private static Bitmap drawableToBitmap(GradientDrawable drawable, int width, int height) {
    Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
    Canvas canvas = new Canvas(bitmap);
    drawable.setBounds(0, 0, width, height);
    drawable.draw(canvas);
    return bitmap;
  }
}
