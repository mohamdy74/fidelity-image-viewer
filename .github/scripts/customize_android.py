#!/usr/bin/env python3
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ANDROID_MAIN = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/downforce-cap/android/app/src/main")
RES = ANDROID_MAIN / "res"

def make_icon(size: int, round_mask: bool = False, foreground_only: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0) if foreground_only else (7, 8, 12, 255))
    draw = ImageDraw.Draw(img)

    if not foreground_only:
        step = max(6, size // 18)
        for i in range(-size, size * 2, step):
            draw.line([(i, 0), (i - size, size)], fill=(255, 255, 255, 10), width=max(1, size // 96))

    pad = int(size * (0.22 if foreground_only else 0.14))
    box = [pad, pad, size - pad, size - pad]
    radius = int((size - 2 * pad) * 0.24)
    draw.rounded_rectangle(
        box,
        radius=radius,
        fill=(225, 6, 0, 255),
        outline=(255, 210, 48, 220),
        width=max(2, size // 42),
    )

    cx, cy = size // 2, size // 2
    r_outer = int((size - 2 * pad) * 0.30)
    r_inner = int(r_outer * 0.52)
    draw.pieslice([cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer], -90, 90, fill=(255, 255, 255, 255))
    draw.rectangle([cx - int(r_outer * 0.65), cy - r_outer, cx, cy + r_outer], fill=(255, 255, 255, 255))
    draw.pieslice([cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner], -90, 90, fill=(225, 6, 0, 255))
    draw.rectangle([cx - int(r_inner * 0.35), cy - r_inner, cx, cy + r_inner], fill=(225, 6, 0, 255))

    if round_mask:
        mask = Image.new("L", (size, size), 0)
        mdraw = ImageDraw.Draw(mask)
        mdraw.ellipse([0, 0, size - 1, size - 1], fill=255)
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        return out
    return img

def make_splash(w: int, h: int) -> Image.Image:
    img = Image.new("RGBA", (w, h), (7, 8, 12, 255))
    draw = ImageDraw.Draw(img)
    icon_sz = min(w, h) // 4
    badge = make_icon(icon_sz, round_mask=False, foreground_only=True)
    img.paste(badge, ((w - icon_sz) // 2, (h - icon_sz) // 2), badge)
    dot_r = max(6, min(w, h) // 90)
    gap = dot_r * 3
    start_x = w // 2 - 2 * gap
    y_lights = (h - icon_sz) // 2 - dot_r * 3
    for i in range(5):
        lx = start_x + i * gap
        draw.ellipse([lx - dot_r, y_lights - dot_r, lx + dot_r, y_lights + dot_r], fill=(225, 6, 0, 255))
    return img

mipmaps = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
for folder, sz in mipmaps.items():
    d = RES / folder
    d.mkdir(parents=True, exist_ok=True)
    make_icon(sz, round_mask=False).save(d / "ic_launcher.png")
    make_icon(sz, round_mask=True).save(d / "ic_launcher_round.png")
    make_icon(int(sz * 2.25), foreground_only=True).save(d / "ic_launcher_foreground.png")

for d in RES.glob("drawable*"):
    if d.is_dir() and (d / "splash.png").exists():
        make_splash(1080, 1920).save(d / "splash.png")
(RES / "drawable").mkdir(parents=True, exist_ok=True)
make_splash(1080, 1920).save(RES / "drawable/splash.png")

ic_bg = RES / "values/ic_launcher_background.xml"
if ic_bg.exists():
    ic_bg.write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#07080C</color>\n</resources>\n',
        encoding="utf-8",
    )

xml_dir = RES / "xml"
xml_dir.mkdir(parents=True, exist_ok=True)
shortcuts_xml = """<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
    <shortcut
        android:shortcutId="make_picks"
        android:enabled="true"
        android:icon="@mipmap/ic_launcher"
        android:shortcutShortLabel="@string/shortcut_picks_short"
        android:shortcutLongLabel="@string/shortcut_picks_long">
        <intent
            android:action="android.intent.action.VIEW"
            android:targetPackage="app.lovable.downforce"
            android:targetClass="app.lovable.downforce.MainActivity"
            android:data="downforce://app/predict" />
    </shortcut>
    <shortcut
        android:shortcutId="standings"
        android:enabled="true"
        android:icon="@mipmap/ic_launcher"
        android:shortcutShortLabel="@string/shortcut_standings_short"
        android:shortcutLongLabel="@string/shortcut_standings_long">
        <intent
            android:action="android.intent.action.VIEW"
            android:targetPackage="app.lovable.downforce"
            android:targetClass="app.lovable.downforce.MainActivity"
            android:data="downforce://app/leaderboard" />
    </shortcut>
    <shortcut
        android:shortcutId="h2h_battle"
        android:enabled="true"
        android:icon="@mipmap/ic_launcher"
        android:shortcutShortLabel="@string/shortcut_h2h_short"
        android:shortcutLongLabel="@string/shortcut_h2h_long">
        <intent
            android:action="android.intent.action.VIEW"
            android:targetPackage="app.lovable.downforce"
            android:targetClass="app.lovable.downforce.MainActivity"
            android:data="downforce://app/h2h" />
    </shortcut>
</shortcuts>
"""
(xml_dir / "shortcuts.xml").write_text(shortcuts_xml, encoding="utf-8")

strings_path = RES / "values/strings.xml"
if strings_path.exists():
    strings_txt = strings_path.read_text(encoding="utf-8")
    if "shortcut_picks_short" not in strings_txt:
        extra_strings = """    <string name="shortcut_picks_short">Make Picks</string>
    <string name="shortcut_picks_long">Lock in your F1 Picks</string>
    <string name="shortcut_standings_short">Standings</string>
    <string name="shortcut_standings_long">League Table &amp; Standings</string>
    <string name="shortcut_h2h_short">1v1 Battle</string>
    <string name="shortcut_h2h_long">Head-to-Head Comparison</string>
</resources>"""
        strings_txt = strings_txt.replace("</resources>", extra_strings)
        strings_path.write_text(strings_txt, encoding="utf-8")

styles_path = RES / "values/styles.xml"
if styles_path.exists():
    st = styles_path.read_text(encoding="utf-8")
    if "android:windowBackground" not in st:
        st = st.replace(
            "</style>",
            '        <item name="android:windowBackground">#07080C</item>\n        <item name="android:statusBarColor">#07080C</item>\n        <item name="android:navigationBarColor">#07080C</item>\n    </style>',
        )
        styles_path.write_text(st, encoding="utf-8")

manifest_path = ANDROID_MAIN / "AndroidManifest.xml"
if manifest_path.exists():
    mf = manifest_path.read_text(encoding="utf-8")
    if "android:screenOrientation" not in mf:
        mf = mf.replace(
            'android:name=".MainActivity"',
            'android:name=".MainActivity" android:screenOrientation="portrait"',
        )
    if "android.app.shortcuts" not in mf:
        mf = mf.replace(
            "</activity>",
            '            <meta-data android:name="android.app.shortcuts" android:resource="@xml/shortcuts" />\n        </activity>',
        )
    if "android.permission.VIBRATE" not in mf:
        perms = """    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
</manifest>"""
        mf = mf.replace("</manifest>", perms)
    manifest_path.write_text(mf, encoding="utf-8")

main_act = ANDROID_MAIN / "java/app/lovable/downforce/MainActivity.java"
main_act.parent.mkdir(parents=True, exist_ok=True)
main_act.write_text(
    """package app.lovable.downforce;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.setBackgroundColor(Color.parseColor("#07080C"));

            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setJavaScriptEnabled(true);
            settings.setSupportMultipleWindows(false);

            webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    if (uri == null) return false;
                    String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase() : "";
                    String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";

                    if (host.equals("wa.me") || host.endsWith("whatsapp.com") || host.equals("calendar.google.com")) {
                        try {
                            startActivity(new Intent(Intent.ACTION_VIEW, uri));
                            return true;
                        } catch (Exception ignored) {
                            return false;
                        }
                    }

                    if (scheme.equals("http") || scheme.equals("https")) {
                        return false;
                    }

                    return super.shouldOverrideUrlLoading(view, request);
                }
            });
        }
        handleShortcutIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleShortcutIntent(intent);
    }

    private void handleShortcutIntent(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data != null && "downforce".equals(data.getScheme())) {
            String path = data.getPath();
            if (path != null && !path.isEmpty() && getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().loadUrl("https://downforce.lovable.app" + path);
            }
        }
    }
}
""",
    encoding="utf-8",
)
print("Android project customized successfully.")
