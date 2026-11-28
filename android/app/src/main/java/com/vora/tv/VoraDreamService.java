package com.vora.tv;

import android.content.res.AssetManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.service.dreams.DreamService;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextClock;
import android.widget.TextView;

import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class VoraDreamService extends DreamService {

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final List<String> assetPaths = new ArrayList<>();
    private int currentIdx = 0;

    private ImageView bgImageA;
    private ImageView bgImageB;
    private boolean showingA = true;
    private TextView dateView;
    private TextView spotifyView;

    private final Runnable rotateRunnable = new Runnable() {
        @Override
        public void run() {
            showNextWallpaper();
            updateDateText();
            updateSpotifyText();
            handler.postDelayed(this, 18_000L);
        }
    };

    private final Runnable clockRefreshRunnable = new Runnable() {
        @Override
        public void run() {
            updateDateText();
            updateSpotifyText();
            handler.postDelayed(this, 5_000L);
        }
    };

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        setInteractive(false);
        setFullscreen(true);
        setScreenBright(true);

        loadWallpaperAssetPaths();

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        bgImageA = new ImageView(this);
        bgImageA.setScaleType(ImageView.ScaleType.CENTER_CROP);
        bgImageA.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        bgImageB = new ImageView(this);
        bgImageB.setScaleType(ImageView.ScaleType.CENTER_CROP);
        bgImageB.setAlpha(0f);
        bgImageB.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        root.addView(bgImageA);
        root.addView(bgImageB);

        // Scrim sutil superior e inferior
        View topScrim = new View(this);
        topScrim.setBackground(new GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            new int[] { Color.argb(135, 0, 0, 0), Color.TRANSPARENT }
        ));
        FrameLayout.LayoutParams topScrimLp = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            dp(160),
            Gravity.TOP
        );
        root.addView(topScrim, topScrimLp);

        View bottomScrim = new View(this);
        bottomScrim.setBackground(new GradientDrawable(
            GradientDrawable.Orientation.BOTTOM_TOP,
            new int[] { Color.argb(185, 0, 0, 0), Color.TRANSPARENT }
        ));
        FrameLayout.LayoutParams bottomScrimLp = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            dp(200),
            Gravity.BOTTOM
        );
        root.addView(bottomScrim, bottomScrimLp);

        // Esquina superior izquierda: VORA TV OS
        TextView brandView = new TextView(this);
        brandView.setText("VORA TV OS");
        brandView.setTextColor(Color.WHITE);
        brandView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        brandView.setTypeface(Typeface.SANS_SERIF, Typeface.BOLD);
        brandView.setLetterSpacing(0.06f);
        brandView.setShadowLayer(8f, 0f, 2f, Color.argb(180, 0, 0, 0));
        FrameLayout.LayoutParams brandLp = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.TOP | Gravity.START
        );
        brandLp.setMargins(dp(44), dp(34), dp(44), 0);
        root.addView(brandView, brandLp);

        // Esquina inferior izquierda: Spotify cuando hay reproducción
        spotifyView = new TextView(this);
        spotifyView.setTextColor(Color.WHITE);
        spotifyView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        spotifyView.setTypeface(Typeface.SANS_SERIF, Typeface.NORMAL);
        spotifyView.setMaxLines(1);
        spotifyView.setEllipsize(TextUtils.TruncateAt.END);
        spotifyView.setShadowLayer(8f, 0f, 2f, Color.argb(200, 0, 0, 0));
        spotifyView.setVisibility(View.GONE);
        FrameLayout.LayoutParams spotifyLp = new FrameLayout.LayoutParams(
            dp(460),
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM | Gravity.START
        );
        spotifyLp.setMargins(dp(44), 0, dp(24), dp(36));
        root.addView(spotifyView, spotifyLp);

        // Esquina inferior derecha: Reloj compacto y fecha
        LinearLayout clockBox = new LinearLayout(this);
        clockBox.setOrientation(LinearLayout.VERTICAL);
        clockBox.setGravity(Gravity.END);

        TextClock clockView = new TextClock(this);
        clockView.setTextColor(Color.WHITE);
        clockView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 34);
        clockView.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        clockView.setShadowLayer(10f, 0f, 2f, Color.argb(200, 0, 0, 0));

        dateView = new TextView(this);
        dateView.setTextColor(Color.argb(205, 255, 255, 255));
        dateView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        dateView.setShadowLayer(6f, 0f, 2f, Color.argb(200, 0, 0, 0));

        clockBox.addView(clockView);
        clockBox.addView(dateView);

        FrameLayout.LayoutParams clockLp = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM | Gravity.END
        );
        clockLp.setMargins(dp(24), 0, dp(44), dp(36));
        root.addView(clockBox, clockLp);

        setContentView(root);
    }

    @Override
    public void onDreamingStarted() {
        super.onDreamingStarted();
        showNextWallpaper();
        updateDateText();
        updateSpotifyText();
        handler.postDelayed(rotateRunnable, 18_000L);
        handler.postDelayed(clockRefreshRunnable, 5_000L);
    }

    @Override
    public void onDreamingStopped() {
        handler.removeCallbacks(rotateRunnable);
        handler.removeCallbacks(clockRefreshRunnable);
        super.onDreamingStopped();
    }

    private void loadWallpaperAssetPaths() {
        assetPaths.clear();
        try {
            AssetManager assets = getAssets();
            String dir = "public/src/assets/images";
            String[] files = assets.list(dir);
            if (files != null) {
                for (String name : files) {
                    if (name.startsWith("screensaver_") && (name.endsWith(".jpg") || name.endsWith(".png"))) {
                        assetPaths.add(dir + "/" + name);
                    }
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void showNextWallpaper() {
        if (assetPaths.isEmpty()) return;
        String path = assetPaths.get(currentIdx % assetPaths.size());
        currentIdx = (currentIdx + 1) % assetPaths.size();

        try (InputStream is = getAssets().open(path)) {
            BitmapFactory.Options opts = new BitmapFactory.Options();
            opts.inPreferredConfig = Bitmap.Config.RGB_565;
            Bitmap bmp = BitmapFactory.decodeStream(is, null, opts);
            if (bmp == null) return;

            ImageView incoming = showingA ? bgImageB : bgImageA;
            ImageView outgoing = showingA ? bgImageA : bgImageB;
            incoming.setImageBitmap(bmp);
            incoming.animate().alpha(1f).setDuration(1400L).start();
            outgoing.animate().alpha(0f).setDuration(1400L).withEndAction(() -> outgoing.setImageDrawable(null)).start();
            showingA = !showingA;
        } catch (Exception ignored) {
        }
    }

    private void updateDateText() {
        if (dateView == null) return;
        SimpleDateFormat fmt = new SimpleDateFormat("EEEE, d 'de' MMMM", new Locale("es", "ES"));
        String text = fmt.format(new Date());
        if (!text.isEmpty()) {
            text = text.substring(0, 1).toUpperCase(new Locale("es", "ES")) + text.substring(1);
        }
        dateView.setText(text);
    }

    private void updateSpotifyText() {
        if (spotifyView == null) return;
        String track = LauncherPlugin.getLatestSpotifyTrackIfPlaying(getApplicationContext());
        if (track != null && !track.isEmpty()) {
            spotifyView.setText("Estás escuchando: " + track);
            spotifyView.setVisibility(View.VISIBLE);
        } else {
            spotifyView.setVisibility(View.GONE);
        }
    }

    private int dp(int value) {
        return Math.round(
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                value,
                getResources().getDisplayMetrics()
            )
        );
    }
}
