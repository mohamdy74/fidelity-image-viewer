import { Link } from "@tanstack/react-router";
import { Grid3x3, Home, LogOut, Swords, Trophy } from "lucide-react";

import { LogoHorizontal, LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/", label: "Paddock", icon: Home },
  { to: "/predict", label: "Predict", icon: Grid3x3 },
  { to: "/leaderboard", label: "Standings", icon: Trophy },
  { to: "/h2h", label: "1v1", icon: Swords },
  { to: "/rules", label: "Rules", icon: null },
] as const;

/** Kept so any other file that still imports HelmetLogo keeps working. */
export const HelmetLogo = LogoMark;

export function SiteHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
        <Link to="/" className="flex min-w-0 items-center" aria-label="Fantasy F1 home">
          <LogoHorizontal className="h-5 w-auto max-w-full sm:h-6" />
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
    const text = `🏁 Fantasy F1 — join and lock in your picks before the track closes!\n${window.location.origin}/predict`;
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
