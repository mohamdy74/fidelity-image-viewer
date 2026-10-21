import { useLocation } from "@tanstack/react-router";
import { Download, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { isNativeApp } from "@/lib/native";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const VISITS_KEY = "dfr:visits";
const DISMISSED_KEY = "dfr:install-dismissed";
const APK_DOWNLOAD_URL =
  "https://github.com/mohamdy74/fidelity-image-viewer/releases/latest/download/DOWNFORCE.apk";

/**
 * Mobile install banner (home page only):
 * - Automatically hidden when running inside the native Capacitor APK or standalone PWA.
 * - On Android mobile browsers, offers direct 1-tap APK installation (or PWA install).
 */
export function InstallPrompt() {
  const { pathname } = useLocation();
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [showAndroidApkBanner, setShowAndroidApkBanner] = useState(false);

  useEffect(() => {
    try {
      if (isNativeApp()) return;
      if (window.matchMedia("(display-mode: standalone)").matches) return;
      const visits = Number(window.localStorage.getItem(VISITS_KEY) ?? "0") + 1;
      window.localStorage.setItem(VISITS_KEY, String(visits));
      if (window.localStorage.getItem(DISMISSED_KEY)) return;

      if (/android/i.test(navigator.userAgent)) {
        setShowAndroidApkBanner(true);
      }

      const onPrompt = (e: Event) => {
        e.preventDefault();
        setEvent(e as InstallEvent);
      };
      const onInstalled = () => {
        setEvent(null);
        setShowAndroidApkBanner(false);
      };
      window.addEventListener("beforeinstallprompt", onPrompt);
      window.addEventListener("appinstalled", onInstalled);
      return () => {
        window.removeEventListener("beforeinstallprompt", onPrompt);
        window.removeEventListener("appinstalled", onInstalled);
      };
    } catch {
      return;
    }
  }, []);

  if (pathname !== "/" || (!event && !showAndroidApkBanner)) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
    setEvent(null);
    setShowAndroidApkBanner(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 md:hidden">
      <div className="carbon-panel flex items-center gap-3 rounded-lg border border-gold/30 p-3 shadow-lg">
        <Smartphone className="h-5 w-5 shrink-0 text-gold" />
        <p className="min-w-0 flex-1 text-xs sm:text-sm leading-snug">
          Get the <strong>DOWNFORCE Android App</strong> for F1 haptics, offline alarms &amp; instant launch.
        </p>
        <Button asChild size="sm" className="shrink-0">
          <a href={APK_DOWNLOAD_URL} download="DOWNFORCE.apk">
            <Download className="mr-1 h-3.5 w-3.5" />
            Get APK
          </a>
        </Button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="shrink-0 p-1 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
