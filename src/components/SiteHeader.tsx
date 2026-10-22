import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Flame, Grid3x3, Home, LogOut, Moon, Shield, Sun, Swords, Trophy, Zap } from "lucide-react";

import { AccountAndOnboarding } from "@/components/AccountAndOnboarding";
import { LogoHorizontal, LogoMark } from "@/components/Logo";
import { PushOptIn } from "@/components/PushOptIn";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { racesQuery } from "@/lib/queries";
import { sprintWeekend } from "@/lib/sprint";
import { STEWARD_EMAIL } from "@/lib/stewards.functions";

const links = [
  { to: "/", label: "Paddock", icon: Home },
  { to: "/predict", label: "Predict", icon: Grid3x3 },
  { to: "/leaderboard", label: "Standings", icon: Trophy },
  { to: "/h2h", label: "1v1", icon: Swords },
  { to: "/weekend", label: "Weekend", icon: CalendarDays },
  { to: "/rules", label: "Rules", icon: null },
] as const;

const DESKTOP_LINK =
  "hidden rounded-sm px-2 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground md:inline [&.active]:text-primary";

function useSprintWeek(): boolean {
  const { data: races } = useQuery(racesQuery);
  return !!races && !!sprintWeekend(races);
}

export const HelmetLogo = LogoMark;

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const sprintOn = useSprintWeek();
  const isSteward = user?.email?.toLowerCase() === STEWARD_EMAIL;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-40 w-full overflow-x-clip border-b border-white/10 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-1.5 px-3 py-2 sm:gap-2 sm:px-4">
        <Link to="/" className="flex min-w-0 shrink items-center gap-2" aria-label="DOWNFORCE home">
          <img
            src="/app-icon.webp"
            alt="Downforce"
            className="h-7 w-7 rounded-lg border border-white/15 object-cover shadow-sm md:hidden"
          />
          <LogoHorizontal className="h-6 w-auto max-w-[130px] sm:h-9 sm:max-w-none" />
        </Link>

        <nav className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          {links
            .filter((l) => l.to !== "/rules")
            .map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className={DESKTOP_LINK}
              >
                {l.label}
              </Link>
            ))}
          <Link to="/sprint" className={DESKTOP_LINK}>
            Sprint {sprintOn ? "⚡" : ""}
          </Link>
          {isSteward && (
            <Link to="/stewards" className={DESKTOP_LINK} style={{ color: "var(--gold)" }}>
              Stewards
            </Link>
          )}
          <Link to="/rules" className={DESKTOP_LINK}>
            Rules
          </Link>
          {isSteward && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8 shrink-0 text-gold md:hidden"
              aria-label="Stewards"
            >
              <Link to="/stewards">
                <Shield className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Link
            to="/rules"
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:hidden [&.active]:border-primary/50 [&.active]:text-primary"
          >
            Rules
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user ? (
            <>
              <AccountAndOnboarding />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                onClick={() => signOut()}
                className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="ml-1 h-8 px-2.5 text-xs">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
      <div className="hidden"><PushOptIn /></div>
      <div className="kerb-strip" />
    </header>
  );
}

export function BottomNav() {
  return (
    <>
      <div className="h-[calc(5.25rem+env(safe-area-inset-bottom))] md:hidden" />
      <div
        className="fixed inset-x-3 bottom-3 z-50 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <nav
          className="glass-bottom-dock mx-auto flex max-w-md items-center justify-between rounded-[28px] px-3 py-1.5"
          aria-label="Main"
        >
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="flex w-14 touch-manipulation select-none flex-col items-center justify-center py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white/60 transition [&.active]:text-primary"
          >
            <Home className="h-5 w-5" />
            <span className="mt-0.5">Paddock</span>
          </Link>

          <Link
            to="/leaderboard"
            className="flex w-14 touch-manipulation select-none flex-col items-center justify-center py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white/60 transition [&.active]:text-gold"
          >
            <Trophy className="h-5 w-5" />
            <span className="mt-0.5">Standings</span>
          </Link>

          <div className="relative -top-4 flex flex-col items-center">
            <Link
              to="/predict"
              aria-label="Predict"
              className="dock-center-orb flex h-13 w-13 items-center justify-center rounded-full border-4 border-[#07080C] text-white transition active:scale-95"
            >
              <Flame className="h-6 w-6" />
            </Link>
            <span className="mt-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-white">
              Predict
            </span>
          </div>

          <Link
            to="/h2h"
            className="flex w-14 touch-manipulation select-none flex-col items-center justify-center py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white/60 transition [&.active]:text-primary"
          >
            <Swords className="h-5 w-5" />
            <span className="mt-0.5">1v1</span>
          </Link>

          <Link
            to="/weekend"
            className="flex w-14 touch-manipulation select-none flex-col items-center justify-center py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white/60 transition [&.active]:text-primary"
          >
            <CalendarDays className="h-5 w-5" />
            <span className="mt-0.5">Weekend</span>
          </Link>
        </nav>
      </div>
    </>
  );
}

export function FahlBadge() {
  return (
    <span
      dir="rtl"
      className="fahl-badge inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black not-italic leading-4"
      style={{ fontFamily: "Cairo, sans-serif" }}
    >
      👑 فحل الجولة
    </span>
  );
}
