#!/usr/bin/env python3
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ANDROID_MAIN = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/downforce-cap/android/app/src/main")
RES = ANDROID_MAIN / "res"
WORKSPACE = Path(__file__).resolve().parents[2]

icon_src_path = WORKSPACE / "public/app-icon.webp"
fg_src_path = WORKSPACE / "public/aero-d-fg.webp"
outline_src_path = WORKSPACE / "public/outline-splash.webp"

icon_master = Image.open(icon_src_path).convert("RGBA")
fg_master = Image.open(fg_src_path).convert("RGBA")
outline_master = Image.open(outline_src_path).convert("RGBA")

def make_icon(size: int, round_mask: bool = False, foreground_only: bool = False) -> Image.Image:
    if foreground_only:
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        inner = int(size * 0.68)
        fg_resized = fg_master.resize((inner, inner), Image.Resampling.LANCZOS)
        out.alpha_composite(fg_resized, ((size - inner) // 2, (size - inner) // 2))
        return out

    img = icon_master.resize((size, size), Image.Resampling.LANCZOS)
    if round_mask:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        return out
    return img

def make_outline_splash(w: int, h: int) -> Image.Image:
    # Pure #07080C Carbon with centered Glowing Titanium Outline Aero D logo
    img = Image.new("RGBA", (w, h), (7, 8, 12, 255))
    logo_sz = int(min(w, h) * 0.36)
    out_resized = outline_master.resize((logo_sz, logo_sz), Image.Resampling.LANCZOS)
    img.alpha_composite(out_resized, ((w - logo_sz) // 2, (h - logo_sz) // 2))
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
        make_outline_splash(1080, 1920).save(d / "splash.png")
(RES / "drawable").mkdir(parents=True, exist_ok=True)
make_outline_splash(1080, 1920).save(RES / "drawable/splash.png")

outline_icon_288 = Image.new("RGBA", (288, 288), (7, 8, 12, 0))
m_inner = outline_master.resize((192, 192), Image.Resampling.LANCZOS)
outline_icon_288.alpha_composite(m_inner, (48, 48))
outline_icon_288.save(RES / "drawable/splash_mono_icon.png")

ic_bg = RES / "values/ic_launcher_background.xml"
if ic_bg.exists():
    ic_bg.write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0C0E16</color>\n</resources>\n',
        encoding="utf-8",
    )

strings_path = RES / "values/strings.xml"
if strings_path.exists():
    strings_txt = strings_path.read_text(encoding="utf-8")
    strings_txt = strings_txt.replace(">DOWNFORCE<", ">Downforce<")
    strings_path.write_text(strings_txt, encoding="utf-8")

styles_path = RES / "values/styles.xml"
if styles_path.exists():
    st = styles_path.read_text(encoding="utf-8")
    if "android:windowBackground" not in st:
        st = st.replace(
            "</style>",
            '        <item name="android:windowBackground">#07080C</item>\n'
            '        <item name="android:statusBarColor">#07080C</item>\n'
            '        <item name="android:navigationBarColor">#07080C</item>\n'
            '        <item name="windowSplashScreenBackground">#07080C</item>\n'
            '        <item name="windowSplashScreenAnimatedIcon">@drawable/splash_mono_icon</item>\n'
            '    </style>',
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
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView wv = getBridge().getWebView();
            wv.setBackgroundColor(Color.parseColor("#07080C"));
            WebSettings ws = wv.getSettings();
            ws.setDomStorageEnabled(true);
            ws.setDatabaseEnabled(true);
            ws.setCacheMode(WebSettings.LOAD_DEFAULT);
            CookieManager cm = CookieManager.getInstance();
            cm.setAcceptCookie(true);
            cm.setAcceptThirdPartyCookies(wv, true);
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
print("Android project customized with Borderless Aero D Icon & Outline Splash.")
