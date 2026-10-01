import { Link } from "@tanstack/react-router";
import { Grid3x3, Home, LogOut, Swords, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/", label: "Paddock", icon: Home },
  { to: "/predict", label: "Predict", icon: Grid3x3 },
  { to: "/leaderboard", label: "Standings", icon: Trophy },
  { to: "/h2h", label: "1v1", icon: Swords },
  { to: "/rules", label: "Rules", icon: null },
] as const;

export function HelmetLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="visorGrad" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="0.45" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--foreground)" />
        </linearGradient>
        <linearGradient id="shellGrad" x1="0" x2="0.3" y1="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="oklch(0.35 0.15 26)" />
        </linearGradient>
      </defs>

      {/* rear aero spoiler */}
      <path d="M2 24l11-2.5v8.5L2 32z" fill="oklch(0.3 0.01 280)" />
      {/* aero shell */}
      <path
        d="M8 31C8 15 20 4.5 35 4.5c13 0 21.5 7.5 23.5 19L60 29c.8 4.2-2 7.5-6.2 7.5H16C11 36.5 8 34.6 8 31z"
        fill="url(#shellGrad)"
      />
      {/* top air scoop */}
      <path d="M25 5.6l13 .9-1 3.2-13-.7z" fill="oklch(0.26 0.01 280)" opacity=".9" />
      {/* visor banner + aggressive slanted visor */}
      <path d="M25 11.5l29 3.4c3.3.6 4.6 3.3 4.2 7.1l-28.6-.6c-5.6-.1-8-6.9-4.6-9.9z" fill="url(#visorGrad)" />
      <path d="M27 12.9l25 3" stroke="oklch(0.2 0.01 280)" strokeOpacity=".55" strokeWidth="1.6" />
      {/* chin bar with vent slots */}
      <path d="M13 27.5h26l-1.6 8.3H16c-2.4 0-3.6-1.2-3.6-3.4z" fill="oklch(0.24 0.01 280)" />
      <g stroke="var(--gold)" strokeOpacity=".75" strokeWidth="1.1">
        <path d="M18 30.4h15" />
        <path d="M18.4 33h14" />
      </g>
      {/* carbon base collar */}
      <path d="M12 36.3h42c-.6 4-3.2 6.2-7.6 6.2H19c-4.6 0-7-2-7-6.2z" fill="oklch(0.19 0.012 280)" />
      <path d="M13 37.6h40" stroke="var(--foreground)" strokeOpacity=".18" strokeWidth="1" />
    </svg>
  );
}

export function SiteHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <HelmetLogo className="h-9 w-11 shrink-0 -rotate-6 drop-shadow-[0_0_10px_var(--primary)]" />
          <span className="leading-none">
            <span className="block font-display text-lg font-black italic uppercase tracking-tight">
              Fantasy<span className="text-primary">F1</span>
            </span>
            <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-gold">
              Prediction League · 2026
            </span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="hidden rounded-sm px-2 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground md:inline [&.active]:text-primary"
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/rules"
            className="rounded-sm px-2 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground md:hidden [&.active]:text-primary"
          >
            Rules
          </Link>
          {user ? (
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button asChild size="sm" className="ml-1">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
      <div className="kerb-strip" />
    </header>
  );
}

export function BottomNav() {
  const invite = () => {
    const text = `🏁 Fantasy F1 — ادخل سجّل توقعاتك قبل ما الحلبة تقفل!\n${window.location.origin}/predict`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };
  return (
    <>
      <div className="h-20 md:hidden" />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {links
          .filter((l) => l.icon)
          .map((l) => {
            const Icon = l.icon!;
            return (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className="flex h-16 flex-col items-center justify-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground [&.active]:text-primary"
              >
                <Icon className="h-5 w-5" />
                {l.label}
              </Link>
            );
          })}
        <button
          onClick={invite}
          className="flex h-16 flex-col items-center justify-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest text-gold"
        >
          <span className="text-lg leading-5">💬</span>
          Invite
        </button>
      </nav>
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
