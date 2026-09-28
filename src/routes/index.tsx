import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Flag, Timer, Trophy } from "lucide-react";

import heroImage from "@/assets/hero-f1.jpg";
import { Countdown } from "@/components/Countdown";
import { Button } from "@/components/ui/button";
import { syncF1Data } from "@/lib/f1-sync.functions";
import { lastRace, leaderboardQuery, nextRace, racesQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fantasy F1 — Prediction League" },
      {
        name: "description",
        content:
          "Predict the F1 top 10, pole, fastest lap and DNF before every Grand Prix and climb the league table.",
      },
      { property: "og:title", content: "Fantasy F1 — Prediction League" },
      {
        property: "og:description",
        content: "Call the grid. Beat your rivals. Take the top step.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await syncF1Data({ data: {} }).catch(() => null);
    await context.queryClient.ensureQueryData(racesQuery);
  },
  component: Home,
});

function Home() {
  const { data: races } = useSuspenseQuery(racesQuery);
  const { data: board } = useQuery(leaderboardQuery);

  const upcoming = nextRace(races);
  const previous = lastRace(races);
  const leader = board?.[0];

  return (
    <main>
      <section className="relative overflow-hidden">
        <img
          src={heroImage}
          alt="Formula 1 car racing at night"
          width={1600}
          height={912}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-primary">
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
        {upcoming ? (
          <div className="carbon-panel rounded-lg p-5">
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
        ) : (
          <div className="carbon-panel rounded-lg p-5">
            <h2 className="text-xl">Season complete</h2>
            <p className="text-sm text-muted-foreground">
              No more races on the calendar. Check the final standings.
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <InfoCard
            icon={<Trophy className="h-4 w-4 text-gold" />}
            label="League leader"
            value={leader ? leader.name : "No scores yet"}
            sub={leader ? `${leader.points} pts` : "Be the first to score"}
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
    </main>
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
