import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarClock,
  ChevronRight,
  Flag,
  Flame,
  LayoutGrid,
  RefreshCw,
  Swords,
  Timer,
  Trophy,
  Unlock,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Countdown } from "@/components/Countdown";
import { MissingPlayers } from "@/components/MissingPlayers";
import { PickStatus } from "@/components/PickStatus";
import { FahlBadge } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { syncF1Data } from "@/lib/f1-sync.functions";
import { lastRace, leaderboardQuery, nextRace, racesQuery, type Race } from "@/lib/queries";
import { isSprintWeek } from "@/lib/sprint";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DOWNFORCE — Fantasy Racing League" },
      {
        name: "description",
        content:
          "Predict the top 10, pole, fastest lap and DNF before every Grand Prix and climb the league table.",
      },
      { property: "og:title", content: "DOWNFORCE — Fantasy Racing League" },
      {
        property: "og:description",
        content: "Call the grid. Beat your rivals. Take the top step.",
      },
      { name: "twitter:title", content: "DOWNFORCE — Fantasy Racing League" },
      { name: "twitter:description", content: "Call the grid. Beat your rivals. Take the top step." },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(racesQuery);
  },
  component: Home,
});

function readCachedPred(userId: string | undefined, raceId: string | undefined) {
  if (typeof window === "undefined" || !userId || !raceId) return undefined;
  try {
    const raw = window.localStorage.getItem(`dfr:pred-cache:${userId}:${raceId}`);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function Home() {
  const { data: races } = useSuspenseQuery(racesQuery);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: board } = useQuery({ ...leaderboardQuery, enabled: !!user });
  const [syncing, setSyncing] = useState(false);

  const upcoming = nextRace(races);
  const previous = lastRace(races);
  const leader = board?.[0];
  const fahl = board?.find((e) => e.fahl);
  const myEntry = board?.find((e) => e.userId === user?.id);
  const myRank = myEntry ? (board?.findIndex((e) => e.userId === user?.id) ?? 0) + 1 : null;

  // Fetch user's current round prediction with localStorage instant cache
  const { data: myPred } = useQuery({
    queryKey: ["prediction", upcoming?.id, user?.id],
    enabled: !!upcoming && !!user,
    initialData: () => readCachedPred(user?.id, upcoming?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("race_id", upcoming!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `dfr:pred-cache:${user!.id}:${upcoming!.id}`,
            JSON.stringify(data),
          );
        } catch {
          /* ignore */
        }
      }
      return data;
    },
  });

  const hasTop10Saved = Boolean(myPred && (myPred.top10 ?? []).filter(Boolean).length === 10);
  const hasPoleSaved = Boolean(myPred?.pole_driver_id);
  const completedCount = races.filter((r) => r.has_results).length;
  const displayName =
    myEntry?.name ??
    (user?.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ??
    "Driver";

  async function handleQuickSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncF1Data();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["races"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      ]);
      toast.success("Live F1 telemetry synced!");
    } catch {
      toast.error("Couldn't sync right now.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="glass-cockpit-shell">
      {/* =================================================================== */}
      {/* MOBILE GLASSMORPHISM COCKPIT (Active on Mobile & Android APK)       */}
      {/* =================================================================== */}
      <div className="mx-auto max-w-md space-y-4 px-3.5 pb-8 pt-3 md:hidden">
        {/* 1. Greeting & Quick Orbs Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/app-icon.webp"
                alt="Downforce"
                className="h-11 w-11 rounded-2xl border border-white/20 object-cover shadow-lg shadow-primary/25"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#07080C] bg-[#22C55E]" />
            </div>
            <div>
              <h1 className="font-display text-lg font-extrabold tracking-tight text-white">
                Hi, {displayName} 👋
              </h1>
              <p className="font-mono text-[11px] text-white/60">
                {myEntry
                  ? `Rank #${myRank} · ${myEntry.points} PTS · ${completedCount}/${races.length} Races`
                  : `Season 2026 · ${completedCount}/${races.length} Races`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/weekend"
              aria-label="Weekend Schedule"
              className="glass-pill flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition active:scale-90"
            >
              <CalendarClock className="h-4 w-4 text-gold" />
            </Link>
            <Link
              to="/predict"
              aria-label="Race Lock Reminders"
              className="glass-pill relative flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition active:scale-90"
            >
              <Bell className="h-4 w-4" />
              {!hasTop10Saved && (
                <span className=" -top-0.5 absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-[#07080C]" />
              )}
            </Link>
            <Link
              to="/leaderboard"
              aria-label="Standings"
              className="glass-pill flex h-10 w-10 items-center justify-center rounded-full text-gold transition active:scale-90"
            >
              <Trophy className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* 2. Active Round Pill + Live Sync Button */}
        {upcoming && (
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/weekend"
              className="glass-pill flex min-w-0 flex-1 items-center gap-2 rounded-full px-3.5 py-2 transition active:scale-98"
            >
              <Flag className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate font-display text-xs font-extrabold uppercase tracking-wide text-white">
                R{upcoming.round} · {upcoming.name}
              </span>
              {isSprintWeek(upcoming) && (
                <span className="shrink-0 rounded-full border border-gold/40 bg-gold/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-gold">
                  SPRINT
                </span>
              )}
              <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-white/50" />
            </Link>

            <button
              type="button"
              onClick={handleQuickSync}
              aria-label="Sync F1 Data"
              className="glass-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition active:scale-90"
            >
              <RefreshCw className={"h-4 w-4 " + (syncing ? "animate-spin text-gold" : "")} />
            </button>
          </div>
        )}

        {/* 3. Horizontal Glass Squircle Quick-Action Carousel */}
        <div className="-mx-1 flex items-center gap-2.5 overflow-x-auto px-1 pb-1 no-scrollbar">
          <SquircleAction
            to="/predict"
            badge="P1-10"
            badgeColor="bg-primary text-white"
            icon={<LayoutGrid className="h-5 w-5 text-primary" />}
            label={"Race\nGrid"}
          />
          <SquircleAction
            to="/sprint"
            badge="+9 PT"
            badgeColor="bg-gold text-black"
            icon={<Zap className="h-5 w-5 text-gold" />}
            label={"Sprint\nTop 8"}
          />
          <SquircleAction
            to="/predict"
            badge={hasPoleSaved ? "SAVED" : "+3 PT"}
            badgeColor={
              hasPoleSaved
                ? "bg-[#22C55E]/25 text-[#22C55E] border border-[#22C55E]/50"
                : "bg-gold/20 text-gold border border-gold/40"
            }
            icon={<Flag className="h-5 w-5 text-gold" />}
            label={"Pole\nKing"}
          />
          <SquircleAction
            to="/predict"
            badge="+3 PT"
            badgeColor="bg-purple/25 text-purple border border-purple/50"
            icon={<Timer className="h-5 w-5 text-purple" />}
            label={"Fastest\nLap"}
          />
          <SquircleAction
            to="/predict"
            badge="+1 PT"
            badgeColor="bg-orange-500/25 text-orange-300 border border-orange-500/40"
            icon={<Flame className="h-5 w-5 text-orange-400" />}
            label={"DNF\nPick"}
          />
          <SquircleAction
            to="/paddock"
            badge="LIVE"
            badgeColor="bg-sky-500/20 text-sky-300 border border-sky-500/40"
            icon={<Unlock className="h-5 w-5 text-sky-400" />}
            label={"Group\nReveal"}
          />
          <SquircleAction
            to="/h2h"
            icon={<Swords className="h-5 w-5 text-primary" />}
            label={"1v1\nDuel"}
          />
        </div>

        {/* 4. CENTERPIECE GLASSMORPHISM TELEMETRY HERO CARD */}
        {upcoming && (
          <div className="glass-hero-card relative overflow-hidden rounded-[28px] p-5">
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/20 blur-2xl" />

            {/* Top Status Pill + Edit Link */}
            <div className="mb-4 flex items-center justify-between gap-2">
              <div
                className={
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 " +
                  (hasTop10Saved
                    ? "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]"
                    : hasPoleSaved
                      ? "border-gold/40 bg-gold/15 text-gold"
                      : "border-primary/50 bg-primary/20 text-gold")
                }
              >
                <span
                  className={
                    "h-2 w-2 rounded-full " +
                    (hasTop10Saved
                      ? "bg-[#22C55E]"
                      : hasPoleSaved
                        ? "bg-gold"
                        : "animate-ping bg-primary")
                  }
                />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                  {hasTop10Saved
                    ? "PICKS LOCKED IN · 10/10 ✓"
                    : hasPoleSaved
                      ? "POLE SAVED · COMPLETE TOP 10"
                      : "ACTION NEEDED · -25 PT RISK"}
                </span>
              </div>

              <Link
                to="/predict"
                className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-white/85 hover:text-white"
              >
                <span>{hasTop10Saved ? "Review" : "Lock Picks"}</span>
                <ChevronRight className="h-3.5 w-3.5 text-primary" />
              </Link>
            </div>

            {/* Dual Metric Split: Left = Player Points & Rank | Right = Lock Countdown */}
            <div className="grid grid-cols-2 gap-4 border-b border-white/10 pb-4 pt-1">
              <div className="border-r border-white/10 pr-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-3xl font-black tracking-tight text-white">
                    {myEntry ? myEntry.points : 0}
                  </span>
                  <span className="font-mono text-xs font-bold text-gold">PTS</span>
                </div>
                <div className="mb-2 mt-0.5 flex items-center justify-between text-[11px] text-white/60">
                  <span>
                    Rank <strong className="text-white">#{myRank ?? "—"}</strong> of{" "}
                    {board?.length ?? "—"}
                  </span>
                  {myEntry?.fahl && <span className="text-[10px] text-gold">👑 فحل</span>}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 p-[1px]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-orange-500 to-gold"
                    style={{
                      width: `${Math.min(100, Math.max(25, leader && leader.points > 0 && myEntry ? Math.round((myEntry.points / leader.points) * 100) : 65))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pl-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/55">
                  {upcoming.qualifying_at &&
                  new Date(upcoming.qualifying_at).getTime() > Date.now()
                    ? "POLE LOCKS IN"
                    : "RACE LOCKS IN"}
                </div>
                <div className="mt-0.5">
                  <CompactCountdown
                    target={
                      upcoming.qualifying_at &&
                      new Date(upcoming.qualifying_at).getTime() > Date.now()
                        ? upcoming.qualifying_at
                        : upcoming.race_at
                    }
                  />
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1">
                  <div className="h-1.5 rounded-full bg-primary shadow-[0_0_8px_#E10600]" />
                  <div className="h-1.5 rounded-full bg-primary shadow-[0_0_8px_#E10600]" />
                  <div className="h-1.5 rounded-full bg-primary shadow-[0_0_8px_#E10600]" />
                  <div className="h-1.5 rounded-full bg-gold shadow-[0_0_8px_#FFD230]" />
                  <div className="h-1.5 rounded-full bg-white/15" />
                </div>
              </div>
            </div>

            {/* Season Progress Strip inside Glass Card */}
            <div className="flex items-center justify-between py-2.5 text-[11px] font-mono text-white/65">
              <span>
                SEASON PROGRESS: <strong className="text-white">{completedCount}/{races.length}</strong>
              </span>
              <span className="text-[#22C55E]">● AUTO-REMINDERS ON</span>
            </div>

            {/* Nested Bottom Crimson-to-Carbon Action Bar */}
            <div className="glass-nested-cta mt-1 flex items-center justify-between rounded-2xl p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base">👑</span>
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-white/70">
                    LEAGUE LEADER · فحل الجولة
                  </div>
                  <div className="truncate text-xs font-bold text-white">
                    {leader ? `${leader.name} · ` : "Standings · "}
                    <span className="font-mono text-gold">
                      {leader ? `${leader.points} PTS` : "View"}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to="/predict"
                className="flex shrink-0 items-center gap-1 rounded-xl border border-white/20 bg-white/15 px-3 py-2 font-display text-xs font-bold text-white transition active:scale-95"
              >
                <span>{hasTop10Saved ? "Edit Picks" : "Make Picks"}</span>
                <ChevronRight className="h-3.5 w-3.5 text-gold" />
              </Link>
            </div>
          </div>
        )}

        {/* 5. What's New / Spotlight Horizontal Glass Carousel */}
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-white">
              Paddock Spotlight
            </h2>
            <span className="font-mono text-[10px] text-white/50">SWIPE →</span>
          </div>

          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
            {/* Spotlight 1: Group Picks Reveal & Debrief */}
            <Link
              to="/paddock"
              className="glass-hero-card min-w-[275px] shrink-0 rounded-[24px] p-4 transition active:scale-98"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full border border-primary/40 bg-primary/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-white">
                  🔓 PADDOCK REVEAL
                </span>
                <span className="font-mono text-[10px] text-gold">
                  {previous ? `R${previous.round}` : "LIVE"}
                </span>
              </div>
              <p className="font-display text-sm font-extrabold uppercase text-white">
                Group Picks &amp; Race Debrief
              </p>
              <p className="mt-1 text-xs text-white/65">
                See every player&apos;s locked Top 10, Pole, Fastest Lap &amp; DNF breakdown.
              </p>
            </Link>

            {/* Spotlight 2: Sprint Shootout & Top 8 */}
            <Link
              to="/sprint"
              className="glass-hero-card min-w-[275px] shrink-0 rounded-[24px] p-4 transition active:scale-98"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full border border-gold/40 bg-gold/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-gold">
                  ⚡ SPRINT CHAMPIONSHIP
                </span>
                <span className="font-mono text-[10px] text-[#22C55E]">+9 EXTRA PTS</span>
              </div>
              <p className="font-display text-sm font-extrabold uppercase text-white">
                Sprint Pole + Top 8 Grid
              </p>
              <p className="mt-1 text-xs text-white/65">
                Predict Sprint Shootout Pole (+1) &amp; Top 8 (+8) with zero penalty risk!
              </p>
            </Link>

            {/* Spotlight 3: 1v1 Head-to-Head Duel */}
            <Link
              to="/h2h"
              className="glass-hero-card min-w-[275px] shrink-0 rounded-[24px] p-4 transition active:scale-98"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full border border-purple/40 bg-purple/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-purple">
                  ⚔️ 1V1 RIVALRY
                </span>
                <span className="font-mono text-[10px] text-white/60">HEAD-TO-HEAD</span>
              </div>
              <p className="font-display text-sm font-extrabold uppercase text-white">
                Compare Round-by-Round
              </p>
              <p className="mt-1 text-xs text-white/65">
                Put your card side-by-side against any rival in the league.
              </p>
            </Link>
          </div>
        </div>

        {/* 6. Live Top-4 League Standings Preview Card */}
        {board && board.length > 0 && (
          <div className="glass-hero-card rounded-[24px] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-gold" />
                <h3 className="font-display text-sm font-bold uppercase text-white">
                  League Standings
                </h3>
              </div>
              <Link
                to="/leaderboard"
                className="font-mono text-[11px] font-bold text-primary hover:underline"
              >
                Full Table →
              </Link>
            </div>

            <div className="space-y-2">
              {board.slice(0, 4).map((row, idx) => {
                const isMe = row.userId === user?.id;
                return (
                  <div
                    key={row.userId}
                    className={
                      "flex items-center justify-between rounded-xl border px-3 py-2 " +
                      (idx === 0
                        ? "border-gold/35 bg-gradient-to-r from-gold/15 to-transparent"
                        : isMe
                          ? "border-primary/50 bg-primary/15"
                          : "border-white/10 bg-white/5")
                    }
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-extrabold text-black " +
                          (idx === 0
                            ? "bg-gold"
                            : idx === 1
                              ? "bg-white/80"
                              : idx === 2
                                ? "bg-orange-400"
                                : "bg-white/30 text-white")
                        }
                      >
                        {idx + 1}
                      </span>
                      <span className="truncate text-xs font-bold text-white">
                        {row.name} {isMe ? "(YOU)" : ""}
                      </span>
                      {row.fahl && <FahlBadge />}
                    </div>
                    <span className="ml-2 shrink-0 font-mono text-xs font-extrabold text-gold">
                      {row.points} PTS
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* DESKTOP VIEW (Preserved for Laptop/PC screens md:block)             */}
      {/* =================================================================== */}
      <div className="hidden md:block">
        <section className="relative overflow-hidden">
          <div className="relative z-10 mx-auto max-w-5xl px-4 py-16 sm:py-24">
            <StartLights />
            <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Season {races[0]?.season ?? 2026}
            </p>
            <h1 className="mt-2 text-4xl leading-none sm:text-6xl">
              Call the grid.
              <br />
              Beat your <span className="text-primary">rivals.</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground">
              Predict the top 10 finishing order plus pole, fastest lap and a DNF before
              every Grand Prix. Picks lock automatically when the cars go out.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/predict">Make your picks</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/leaderboard">League table</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16">
          <div className="mb-6">
            <div className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span>Season progress</span>
              <span>
                {completedCount} / {races.length} races
              </span>
            </div>
            <div className="mt-2 flex gap-1">
              {races.map((r) => (
                <span
                  key={r.id}
                  title={r.name}
                  className={
                    "h-2 flex-1 rounded-sm " +
                    (r.has_results
                      ? "bg-primary"
                      : r.id === upcoming?.id
                        ? "animate-pulse bg-gold"
                        : "bg-secondary")
                  }
                />
              ))}
            </div>
          </div>
          {upcoming && <PickStatus race={upcoming} />}
          {upcoming && <MissingPlayers race={upcoming} />}
          <Link
            to="/paddock"
            className="carbon-panel mt-3 flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold"
          >
            <span>🔓 Group picks reveal and race debrief</span>
            <span className="text-primary">→</span>
          </Link>
          {upcoming ? (
            <div className="carbon-panel mt-4 rounded-lg p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Round {upcoming.round} · Next up
                  </p>
                  <h2 className="mt-1 text-2xl">{upcoming.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {upcoming.circuit}
                    {upcoming.locality ? ` · ${upcoming.locality}` : ""}
                    {upcoming.country ? `, ${upcoming.country}` : ""}
                  </p>
                </div>
                <Button asChild>
                  <Link to="/predict">Predict</Link>
                </Button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {upcoming.qualifying_at && (
                  <Countdown target={upcoming.qualifying_at} label="Pole pick closes in" />
                )}
                <Countdown target={upcoming.race_at} label="Top 10 picks close in" />
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <InfoCard
              icon={<Trophy className="h-4 w-4 text-gold" />}
              label="League leader"
              value={leader ? leader.name : user ? "No scores yet" : "Sign in to see"}
              sub={
                leader
                  ? `${leader.points} pts${fahl ? ` · 👑 فحل الجولة: ${fahl.name}` : ""}`
                  : "Be the first to score"
              }
            />
            <InfoCard
              icon={<Flag className="h-4 w-4 text-primary" />}
              label="Last race scored"
              value={previous ? previous.name : "None yet"}
              sub={previous ? `Round ${previous.round}` : "Season not started"}
            />
            <InfoCard
              icon={<Timer className="h-4 w-4 text-primary" />}
              label="Max per weekend"
              value="52 points"
              sub="Perfect weekend"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function SquircleAction({
  to,
  badge,
  badgeColor,
  icon,
  label,
}: {
  to: "/predict" | "/sprint" | "/paddock" | "/h2h" | "/weekend";
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  label: string;
}) {
  const parts = label.split("\n");
  return (
    <Link to={to} className="flex shrink-0 flex-col items-center gap-1.5">
      <div className="glass-squircle relative flex h-[62px] w-[62px] items-center justify-center rounded-[22px]">
        {badge && (
          <span
            className={
              "absolute -top-1.5 right-1 rounded-full px-1.5 py-0.2 font-mono text-[8px] font-extrabold shadow " +
              (badgeColor ?? "bg-primary text-white")
            }
          >
            {badge}
          </span>
        )}
        {icon}
      </div>
      <span className="text-center text-[10px] font-semibold leading-tight text-white/85">
        {parts[0]}
        {parts[1] ? (
          <>
            <br />
            {parts[1]}
          </>
        ) : null}
      </span>
    </Link>
  );
}

function CompactCountdown({ target }: { target: string }) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return (
    <span className="font-mono text-xl font-extrabold tracking-tight text-white">
      {String(d).padStart(2, "0")}d {String(h).padStart(2, "0")}h {String(m).padStart(2, "0")}m
    </span>
  );
}

function InfoCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="carbon-panel rounded-lg p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 font-display text-lg font-extrabold italic uppercase">{value}</p>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function StartLights() {
  return (
    <div className="flex gap-2" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-md bg-background/90 p-1.5 shadow-lg">
          <span
            className="start-light block h-5 w-5 rounded-full sm:h-7 sm:w-7"
            style={{ animationName: `sl${i}` }}
          />
        </div>
      ))}
    </div>
  );
}
