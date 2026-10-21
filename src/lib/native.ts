import type { Race } from "@/lib/queries";

interface CapacitorHapticsPlugin {
  impact(options: { style: "LIGHT" | "MEDIUM" | "HEAVY" }): Promise<void>;
  notification(options: { type: "SUCCESS" | "WARNING" | "ERROR" }): Promise<void>;
  vibrate(options?: { duration?: number }): Promise<void>;
}

interface CapacitorLocalNotificationItem {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date; allowWhileIdle?: boolean };
  smallIcon?: string;
  iconColor?: string;
  extra?: Record<string, string>;
}

interface CapacitorLocalNotificationsPlugin {
  checkPermissions(): Promise<{ display: string }>;
  requestPermissions(): Promise<{ display: string }>;
  schedule(options: { notifications: CapacitorLocalNotificationItem[] }): Promise<void>;
  cancel(options: { notifications: Array<{ id: number }> }): Promise<void>;
}

interface CapacitorFilesystemPlugin {
  writeFile(options: {
    path: string;
    data: string;
    directory: "CACHE" | "DATA";
  }): Promise<{ uri: string }>;
}

interface CapacitorSharePlugin {
  share(options: {
    title?: string;
    text?: string;
    url?: string;
    files?: string[];
    dialogTitle?: string;
  }): Promise<void>;
}

interface CapacitorSplashScreenPlugin {
  hide(options?: { fadeOutDuration?: number }): Promise<void>;
}

interface CapacitorStatusBarPlugin {
  setStyle(options: { style: "DARK" | "LIGHT" | "DEFAULT" }): Promise<void>;
  setBackgroundColor(options: { color: string }): Promise<void>;
  setOverlaysWebView(options: { overlay: boolean }): Promise<void>;
}

interface CapacitorAppPlugin {
  addListener(
    eventName: "backButton",
    listenerFunc: (data: { canGoBack: boolean }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
  minimizeApp(): Promise<void>;
}

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: {
    Haptics?: CapacitorHapticsPlugin;
    LocalNotifications?: CapacitorLocalNotificationsPlugin;
    Filesystem?: CapacitorFilesystemPlugin;
    Share?: CapacitorSharePlugin;
    SplashScreen?: CapacitorSplashScreenPlugin;
    StatusBar?: CapacitorStatusBarPlugin;
    App?: CapacitorAppPlugin;
  };
}

declare global {
  interface Window {
    Capacitor?: CapacitorBridge;
  }
}

function getBridge(): CapacitorBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return window.Capacitor;
}

/** True when running inside the native Android/iOS Capacitor APK shell. */
export function isNativeApp(): boolean {
  try {
    return Boolean(getBridge()?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/** Crisp mechanical gear-shift click when placing a driver in P1-P10 or picking a bonus. */
export function hapticGearShift(): void {
  const haptics = getBridge()?.Plugins?.Haptics;
  if (isNativeApp() && haptics) {
    haptics.impact({ style: "MEDIUM" }).catch(() => {});
    return;
  }
}

/** Subtle click when dragging/swapping two grid positions. */
export function hapticSwap(): void {
  const haptics = getBridge()?.Plugins?.Haptics;
  if (isNativeApp() && haptics) {
    haptics.impact({ style: "LIGHT" }).catch(() => {});
    return;
  }
}

/** Escalating telemetry pulse as each of the 5 red start lights illuminates. */
export function hapticLightPulse(lightNumber: number): void {
  const haptics = getBridge()?.Plugins?.Haptics;
  if (isNativeApp() && haptics) {
    const style = lightNumber >= 5 ? "HEAVY" : lightNumber >= 3 ? "MEDIUM" : "LIGHT";
    haptics.impact({ style }).catch(() => {});
    return;
  }
  if (typeof navigator !== "undefined") navigator.vibrate?.(10 + lightNumber * 4);
}

/** Celebratory double-burst when the 5 red lights go out ("Lights out and away we go!"). */
export function hapticLightsOutLaunch(): void {
  const haptics = getBridge()?.Plugins?.Haptics;
  if (isNativeApp() && haptics) {
    haptics.notification({ type: "SUCCESS" }).catch(() => {});
    return;
  }
  if (typeof navigator !== "undefined") navigator.vibrate?.([15, 40, 22]);
}

/** Sharp warning rumble when a duplicate driver or locked deadline error occurs. */
export function hapticErrorWarning(): void {
  const haptics = getBridge()?.Plugins?.Haptics;
  if (isNativeApp() && haptics) {
    haptics.notification({ type: "ERROR" }).catch(() => {});
    return;
  }
  if (typeof navigator !== "undefined") navigator.vibrate?.([35, 50, 35]);
}

/**
 * Schedules (or auto-cancels) offline-capable native OS race alarms on the phone:
 * - 30 minutes before Qualifying (if Pole pick is not saved yet)
 * - 2 hours before the Race (if Top 10 picks are not locked yet)
 * - 30 minutes before the Race (final call if Top 10 picks are not locked yet)
 */
export async function syncNativeRaceAlarms(
  race: Pick<Race, "id" | "round" | "name" | "qualifying_at" | "race_at">,
  status: { hasPoleSaved: boolean; hasRaceSaved: boolean },
): Promise<boolean> {
  const ln = getBridge()?.Plugins?.LocalNotifications;
  if (!isNativeApp() || !ln) return false;

  try {
    const perm = await ln.checkPermissions();
    if (perm.display !== "granted") {
      const req = await ln.requestPermissions();
      if (req.display !== "granted") return false;
    }

    const poleId = race.round * 100 + 1;
    const race2hId = race.round * 100 + 2;
    const race30mId = race.round * 100 + 3;

    await ln.cancel({
      notifications: [{ id: poleId }, { id: race2hId }, { id: race30mId }],
    });

    const now = Date.now();
    const toSchedule: CapacitorLocalNotificationItem[] = [];

    if (!status.hasPoleSaved && race.qualifying_at) {
      const qualyMs = new Date(race.qualifying_at).getTime();
      const alarmAt = qualyMs - 30 * 60_000;
      if (alarmAt > now + 15_000) {
        toSchedule.push({
          id: poleId,
          title: `⚡ Pole Pick Closes in 30m · R${race.round}`,
          body: `Qualifying for the ${race.name} starts in 30 minutes! Lock in your Pole Position pick (+3 pts).`,
          schedule: { at: new Date(alarmAt), allowWhileIdle: true },
          iconColor: "#FFD230",
          extra: { route: "/predict" },
        });
      }
    }

    if (!status.hasRaceSaved && race.race_at) {
      const raceMs = new Date(race.race_at).getTime();
      const alarm2h = raceMs - 120 * 60_000;
      const alarm30m = raceMs - 30 * 60_000;

      if (alarm2h > now + 15_000) {
        toSchedule.push({
          id: race2hId,
          title: `🏎️ Grid Locks in 2 Hours · ${race.name}`,
          body: `Lock in your Top 10, Fastest Lap & DNF picks before the lights go out to avoid the -25 pt penalty!`,
          schedule: { at: new Date(alarm2h), allowWhileIdle: true },
          iconColor: "#E10600",
          extra: { route: "/predict" },
        });
      }

      if (alarm30m > now + 15_000) {
        toSchedule.push({
          id: race30mId,
          title: `🚨 FINAL CALL: 30m to Lights Out!`,
          body: `${race.name} picks lock in 30 minutes! Tap now to lock in your starting grid.`,
          schedule: { at: new Date(alarm30m), allowWhileIdle: true },
          iconColor: "#E10600",
          extra: { route: "/predict" },
        });
      }
    }

    if (toSchedule.length > 0) {
      await ln.schedule({ notifications: toSchedule });
    }
    return toSchedule.length > 0;
  } catch {
    return false;
  }
}

/** Automatically queries Supabase for the upcoming race & user prediction and syncs phone alarms. */
export async function autoSyncAlarmsFromSupabase(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { nextRace } = await import("@/lib/queries");
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return;

    const { data: races } = await supabase
      .from("races")
      .select("*")
      .order("round", { ascending: true });
    if (!races?.length) return;
    const upcoming = nextRace(races as Race[]);
    if (!upcoming) return;

    const { data: pred } = await supabase
      .from("predictions")
      .select("top10, pole_driver_id")
      .eq("race_id", upcoming.id)
      .eq("user_id", userId)
      .maybeSingle();

    await syncNativeRaceAlarms(upcoming, {
      hasPoleSaved: Boolean(pred?.pole_driver_id),
      hasRaceSaved: Boolean(pred && (pred.top10 ?? []).filter(Boolean).length === 10),
    });
  } catch {
    /* ignore background alarm sync errors */
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = typeof reader.result === "string" ? reader.result : "";
      const commaIdx = res.indexOf(",");
      resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Shares a 1080x1350 PNG Blob via the native Android Share Sheet (WhatsApp / Instagram Stories)
 * by writing the image to the native cache directory first.
 */
export async function nativeShareImage(
  blob: Blob,
  fileName: string,
  title: string,
): Promise<boolean> {
  const plugins = getBridge()?.Plugins;
  if (!isNativeApp() || !plugins?.Filesystem || !plugins?.Share) return false;

  try {
    const base64Data = await blobToBase64(blob);
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const saved = await plugins.Filesystem.writeFile({
      path: safeName,
      data: base64Data,
      directory: "CACHE",
    });
    await plugins.Share.share({
      title,
      text: `${title} — DOWNFORCE F1 Fantasy League`,
      files: [saved.uri],
      dialogTitle: title,
    });
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel|abort|dismiss/i.test(msg)) return true;
    return false;
  }
}

let shellInitialized = false;

/**
 * Initializes the native mobile shell on mount:
 * - Colors the Android system status bar in #07080C Carbon
 * - Wires the Android hardware Back button to router history
 * - Transparently upgrades navigator.vibrate & navigator.share to Native Capacitor Plugins
 * - Automatically arms/cancels offline race alarms for the signed-in user
 * - Smoothly fades out the native Splash Screen after first paint (zero flicker)
 */
export async function initNativeShell(): Promise<void> {
  if (!isNativeApp() || shellInitialized) return;
  shellInitialized = true;
  const plugins = getBridge()?.Plugins;
  if (!plugins) return;

  // 1. Upgrade navigator.vibrate to native Capacitor Haptics automatically
  if (typeof navigator !== "undefined") {
    navigator.vibrate = (pattern: VibratePattern): boolean => {
      if (Array.isArray(pattern)) {
        hapticLightsOutLaunch();
        setTimeout(() => {
          autoSyncAlarmsFromSupabase().catch(() => {});
        }, 1200);
      } else if (typeof pattern === "number" && pattern >= 14) {
        hapticSwap();
      } else {
        hapticGearShift();
      }
      return true;
    };

    // 2. Upgrade navigator.canShare & navigator.share for PNG Share Cards on Android WebView
    const origCanShare = navigator.canShare?.bind(navigator);
    const origShare = navigator.share?.bind(navigator);

    navigator.canShare = (data?: ShareData): boolean => {
      if (data?.files && data.files.length > 0) return true;
      return origCanShare ? origCanShare(data) : true;
    };

    navigator.share = async (data?: ShareData): Promise<void> => {
      if (data?.files && data.files.length > 0) {
        const file = data.files[0];
        if (file) {
          const shared = await nativeShareImage(
            file,
            file.name || "downforce-card.png",
            data.title || "DOWNFORCE",
          );
          if (shared) return;
        }
      }
      if (data?.text && plugins.Share) {
        await plugins.Share.share({
          title: data.title ?? "DOWNFORCE",
          text: data.text,
          ...(data.url ? { url: data.url } : {}),
        });
        return;
      }
      if (origShare && data) return origShare(data);
    };
  }

  // 3. Configure Carbon Status Bar
  try {
    await plugins.StatusBar?.setOverlaysWebView({ overlay: false });
    await plugins.StatusBar?.setStyle({ style: "DARK" });
    await plugins.StatusBar?.setBackgroundColor({ color: "#07080C" });
  } catch {
    /* ignore status bar errors */
  }

  // 4. Wire Android Hardware Back Button
  try {
    await plugins.App?.addListener("backButton", ({ canGoBack }) => {
      if (window.location.pathname !== "/" || canGoBack) {
        window.history.back();
      } else {
        plugins.App?.minimizeApp().catch(() => {});
      }
    });
  } catch {
    /* ignore backButton errors */
  }

  // 5. Request notification permission & auto-sync race alarms
  setTimeout(() => {
    autoSyncAlarmsFromSupabase().catch(() => {});
  }, 1500);

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        autoSyncAlarmsFromSupabase().catch(() => {});
      }
    });
  }

  // 6. Hide native Splash Screen smoothly after first paint
  if (typeof window !== "undefined") {
    window.requestAnimationFrame(() => {
      setTimeout(() => {
        plugins.SplashScreen?.hide({ fadeOutDuration: 260 }).catch(() => {});
      }, 60);
    });
  }
}
