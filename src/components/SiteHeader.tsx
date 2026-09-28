import { Link } from "@tanstack/react-router";
import { Flag, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/", label: "Paddock" },
  { to: "/predict", label: "Predict" },
  { to: "/leaderboard", label: "Standings" },
  { to: "/rules", label: "Rules" },
] as const;

export function SiteHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          <span className="font-display text-base font-extrabold italic uppercase tracking-tight">
            Fantasy<span className="text-primary">F1</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-sm px-2 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground [&.active]:text-primary"
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button asChild size="sm" className="ml-1">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
      <div className="flag-divider" />
    </header>
  );
}
