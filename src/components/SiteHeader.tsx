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

/** Monochrome side-profile F1 helmet: faceted shell, rear gurney spoiler, visor slot, chin vents. */
export function HelmetLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden fill="none">
      {/* faceted shell — straight segments, no egg curves */}
      <path
        d="M9 33 L11 21 L18 11 L29 6 L42 6 L52 10 L58 17 L60 25 L58 31 L50 34 L44 38 L14 38 Z"
        fill="var(--foreground)"
      />
      {/* rear gurney spoiler */}
      <path d="M4 20 L18 17 L16 23 L5 25 Z" fill="var(--foreground)" fillOpacity=".55" />
      {/* top airbox ridge */}
      <path d="M22 9 L40 7" stroke="var(--background)" strokeWidth="1.4" />
      {/* visor aperture */}
      <path d="M33 15 L55 16 L58 22 L36 23 L31 19 Z" fill="var(--background)" />
      <path d="M37 18.5 L54 19" stroke="var(--foreground)" strokeOpacity=".35" strokeWidth="1" />
      {/* side livery cut */}
      <path d="M12 28 L36 26 L48 30" stroke="var(--background)" strokeWidth="1.6" />
      {/* chin vents */}
      <g stroke="var(--background)" strokeWidth="1.3">
        <path d="M47 33 L53 31" />
        <path d="M45 35.5 L50 33.8" />
      </g>
      {/* collar */}
      <path d="M14 40 L44 40" stroke="var(--foreground)" strokeOpacity=".45" strokeWidth="2" />
    </svg>
  );
}

export function SiteHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <HelmetLogo className="h-9 w-11 shrink-0" />
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
