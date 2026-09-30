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
        <linearGradient id="visor" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <path
        d="M6 34C6 16 20 6 36 6c14 0 24 9 24 22v6c0 4-3 7-7 7H14c-5 0-8-3-8-7z"
        fill="var(--primary)"
      />
      <path d="M8 30h44l-4 4H10z" fill="var(--foreground)" opacity=".85" />
      <path d="M30 14h22c4 0 7 4 7 9v2H34c-4 0-7-3-6-7z" fill="url(#visor)" />
      <path d="M33 16h18" stroke="var(--foreground)" strokeOpacity=".6" strokeWidth="1.5" />
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
