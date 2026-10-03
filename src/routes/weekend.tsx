import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Countdown } from "@/components/Countdown";
import { supabase } from "@/integrations/supabase/client";
import { driversQuery, racesQuery, type Driver, type Race } from "@/lib/queries";
import { teamColor } from "@/lib/teams";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/weekend")({
  head: () => ({
    meta: [
      { title: "Race weekend — Fantasy F1" },
      {
        name: "description",
        content: "Session schedule, qualifying and race classification for the current Grand Prix weekend.",
      },
      { property: "og:title", content: "Race weekend — Fantasy F1" },
      {
        property: "og:description",
        content: "Follow the Grand Prix weekend: schedule, qualifying and race result.",
      },
      { name: "twitter:title", content: "Race weekend — Fantasy F1" },
      {
        name: "twitter:description",
        content: "Follow the Grand Prix weekend: schedule, qualifying and race result.",
      },
    ],
  }),
  component: Weekend,
});

type Tab = "schedule" | "practice" | "qualifying" | "race";
const TABS: { id: Tab; label: string }[] = [
  { id: "schedule", label: "Schedule" },
  { id: "practice", label: "Practice" },
  { id: "qualifying", label: "Qualifying" },
  { id: "race", label: "Race" },
];

type Status = "upcoming" | "live" | "completed";
const MIN = 60_000;
const QUALI_MS = 60 * MIN;
const RACE_MS = 120 * MIN;
const STAY_MS = 3 * 24 * 60 * MIN; // keep showing a weekend until 3 days after the race starts

function statusOf(startIso: string, durationMs: number, now: number): Status {
  const start = new Date(startIso).getTime();
  if (now < start) return "upcoming";
  return now < start + durationMs ? "live" : "completed";
}

/** null on the server and first render, so times never mismatch between server and browser. */
function useNow(ms = 15_000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function currentWeekend(races: Race[], now: number): Race | null {
  if (!races.length) return null;
  return (
    races.find((r) => new Date(r.race_at).getTime() + STAY_MS >= now) ?? races[races.length - 1]!
  );
}

function localTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLE: Record<Status, { label: string; color: string }> = {
  upcoming: { label: "Upcoming", color: "var(--gold)" },
  live: { label: "Live", color: "var(--color-primary)" },
  completed: { label: "Completed", color: "var(--track-green)" },
};

function Weekend() {
  const now = useNow();
  const { data: races, isLoading } = useQuery(racesQuery);
  const [tab, setTab] = useState<Tab>("schedule");

  if (isLoading || now === null || !races) {
    return (
      <Shell>
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-muted/60" />
      </Shell>
    );
  }

  const race = currentWeekend(races, now);
  if (!race) {
    return (
      <Shell>
        <h1 className="text-3xl">Race weekend</h1>
        <p className="mt-3 text-sm text-muted-foreground">No races on the calendar yet.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-primary">
        Round {race.round}
      </p>
      <h1 className="mt-1 text-3xl">{race.name}</h1>
      <p className="text-sm text-muted-foreground">
        {race.circuit}
        {race.locality ? ` · ${race.locality}` : ""}
        {race.country ? `, ${race.country}` : ""}
      </p>

      <div role="tablist" aria-label="Weekend sections" className="mt-5 grid grid-cols-4 gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "min-h-11 touch-manipulation rounded-md border px-1 font-mono text-[11px] font-bold uppercase tracking-wider transition",
              tab === t.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "schedule" && <Schedule race={race} now={now} />}
        {tab === "practice" && (
          <Empty text="No practice classification is available for this weekend yet." />
        )}
        {(tab === "qualifying" || tab === "race") && <Results race={race} now={now} tab={tab} />}
      </div>
    </Shell>
  );
}

function Schedule({ race, now }: { race: Race; now: number }) {
  const sessions = [
    race.qualifying_at && {
      key: "q",
      name: "Qualifying",
      at: race.qualifying_at,
      status: statusOf(race.qualifying_at, QUALI_MS, now),
    },
    { key: "r", name: "Grand Prix", at: race.race_at, status: statusOf(race.race_at, RACE_MS, now) },
  ].filter(Boolean) as { key: string; name: string; at: string; status: Status }[];

  const next = sessions.find((s) => s.status !== "completed");

  return (
    <div className="space-y-2">
      {sessions.map((s) => {
        const st = STATUS_STYLE[s.status];
        return (
          <div
            key={s.key}
            className="tower-row flex items-center justify-between gap-3 rounded-md px-3 py-3"
            style={{ borderLeftColor: st.color }}
          >
            <div className="min-w-0">
              <p className="font-display text-base font-extrabold italic uppercase">{s.name}</p>
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {localTime(s.at)}
              </p>
            </div>
            <span
              className="shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest"
              style={{ borderColor: st.color, color: st.color }}
            >
              {st.label}
            </span>
          </div>
        );
      })}
      {next && (
        <div className="pt-2">
          <Countdown target={next.at} label={`${next.name} starts in`} />
        </div>
      )}
    </div>
  );
}

type ResultRow = {
  driver_id: string;
  position: number | null;
  finished: boolean;
  fastest_lap: boolean;
  pole: boolean;
};

function Results({ race, now, tab }: { race: Race; now: number; tab: "qualifying" | "race" }) {
  const { data: drivers } = useQuery(driversQuery);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["weekend-results", race.id],
    staleTime: 5 * MIN,
    queryFn: async (): Promise<ResultRow[]> => {
      const { data, error } = await supabase
        .from("race_results")
        .select("driver_id, position, finished, fastest_lap, pole")
        .eq("race_id", race.id)
        .order("position", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ResultRow[];
    },
  });

  const byId = new Map((drivers ?? []).map((d) => [d.id, d]));
  const rows = data ?? [];
  const hasResults = race.has_results && rows.length > 0;

  if (isLoading) return <div className="h-40 animate-pulse rounded-lg bg-muted/60" />;
  if (isError) return <Empty text="Couldn't load results right now. Try again in a moment." />;

  if (tab === "qualifying") {
    const pole = rows.find((r) => r.pole);
    if (!pole) {
      const st = race.qualifying_at ? statusOf(race.qualifying_at, QUALI_MS, now) : "upcoming";
      return (
        <Empty
          text={
            st === "upcoming"
              ? "Qualifying hasn't started yet."
              : st === "live"
                ? "Qualifying is in progress."
                : "The qualifying result will appear here once it is confirmed."
          }
        />
      );
    }
    return (
      <div className="carbon-panel rounded-lg p-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Pole position
        </p>
        <DriverName d={byId.get(pole.driver_id)} fallback={pole.driver_id} big />
      </div>
    );
  }

  // Race tab
  if (!hasResults) {
    const st = statusOf(race.race_at, RACE_MS, now);
    return (
      <Empty
        text={
          st === "upcoming"
            ? "The race hasn't started. Picks lock when the lights go out."
            : st === "live"
              ? "The race is in progress. The classification appears after the chequered flag."
              : "Waiting for the official classification."
        }
      />
    );
  }

  const classified = rows.filter((r) => r.finished && r.position != null);
  const dnfs = rows.filter((r) => !r.finished);
  const winner = classified[0];
  const pole = rows.find((r) => r.pole);
  const fl = rows.find((r) => r.fastest_lap);

  return (
    <div className="space-y-4">
      <div className="carbon-panel grid grid-cols-2 gap-3 rounded-lg p-4 sm:grid-cols-4">
        <Fact label="Winner" d={winner && byId.get(winner.driver_id)} />
        <Fact label="Pole" d={pole && byId.get(pole.driver_id)} />
        <Fact label="Fastest lap" d={fl && byId.get(fl.driver_id)} purple />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">DNFs</p>
          <p className="font-display text-lg font-extrabold italic">{dnfs.length}</p>
        </div>
      </div>

      <div className="space-y-1">
        {classified.map((r) => {
          const d = byId.get(r.driver_id);
          return (
            <div
              key={r.driver_id}
              className="tower-row flex items-center gap-3 rounded-md px-3 py-2"
              style={{ borderLeftColor: teamColor(d?.team ?? null) }}
            >
              <span className="w-8 shrink-0 text-center font-mono text-sm font-bold tabular-nums">
                {r.position}
              </span>
              <DriverName d={d} fallback={r.driver_id} />
              <span className="ml-auto flex shrink-0 gap-1 font-mono text-[10px] font-bold uppercase">
                {r.pole && <span className="rounded bg-gold px-1.5 py-0.5 text-gold-foreground">Pole</span>}
                {r.fastest_lap && <span className="rounded bg-secondary px-1.5 py-0.5 text-purple">FL</span>}
              </span>
            </div>
          );
        })}
        {dnfs.map((r) => {
          const d = byId.get(r.driver_id);
          return (
            <div
              key={r.driver_id}
              className="tower-row flex items-center gap-3 rounded-md px-3 py-2 opacity-70"
              style={{ borderLeftColor: teamColor(d?.team ?? null) }}
            >
              <span className="w-8 shrink-0 text-center font-mono text-sm font-bold text-primary">DNF</span>
              <DriverName d={d} fallback={r.driver_id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DriverName({ d, fallback, big }: { d?: Driver | undefined; fallback: string; big?: boolean }) {
  return (
    <span className="min-w-0">
      <span className={cn("block truncate font-display font-extrabold italic uppercase", big ? "mt-1 text-2xl" : "text-sm")}>
        {d ? (d.code ?? d.full_name) : fallback}
      </span>
      {d && (
        <span className="block truncate text-[11px] text-muted-foreground">
          {d.full_name}
          {d.team ? ` · ${d.team}` : ""}
        </span>
      )}
    </span>
  );
}

function Fact({ label, d, purple }: { label: string; d?: Driver | undefined; purple?: boolean }) {
  return (
    <div>
      <p className={cn("font-mono text-[10px] uppercase tracking-widest", purple ? "text-purple" : "text-muted-foreground")}>
        {label}
      </p>
      <p className="font-display text-lg font-extrabold italic uppercase">{d ? (d.code ?? d.full_name) : "—"}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="carbon-panel rounded-lg p-5 text-sm text-muted-foreground">{text}</p>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl px-4 pb-24 pt-10">{children}</main>;
}
