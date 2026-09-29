import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Countdown } from "@/components/Countdown";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { driversQuery, nextRace, racesQuery, type Driver } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { teamColor } from "@/lib/teams";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "Make your picks — Fantasy F1" },
      {
        name: "description",
        content:
          "Lock in your top 10 finishing order plus pole, fastest lap and DNF picks before the lights go out.",
      },
      { property: "og:title", content: "Make your picks — Fantasy F1" },
      {
        property: "og:description",
        content: "Predict the top 10, pole, fastest lap and a DNF for the next Grand Prix.",
      },
    ],
  }),
  component: Predict,
});

const EMPTY = "__none__";

function Predict() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const { data: races } = useQuery(racesQuery);
  const { data: drivers } = useQuery(driversQuery);

  const race = useMemo(() => (races ? nextRace(races) : null), [races]);

  const { data: prediction } = useQuery({
    queryKey: ["prediction", race?.id, user?.id],
    enabled: !!race && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("race_id", race!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [top10, setTop10] = useState<string[]>(Array(10).fill(EMPTY));
  const [pole, setPole] = useState(EMPTY);
  const [fastestLap, setFastestLap] = useState(EMPTY);
  const [dnf, setDnf] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!prediction) return;
    const saved = prediction.top10 ?? [];
    setTop10(Array.from({ length: 10 }, (_, i) => saved[i] ?? EMPTY));
    setPole(prediction.pole_driver_id ?? EMPTY);
    setFastestLap(prediction.fastest_lap_driver_id ?? EMPTY);
    setDnf(prediction.dnf_driver_id ?? EMPTY);
  }, [prediction]);

  const now = Date.now();
  const raceLocked = !!race && new Date(race.race_at).getTime() <= now;
  const poleLocked =
    raceLocked ||
    (!!race?.qualifying_at && new Date(race.qualifying_at).getTime() <= now);

  if (loading) {
    return <Shell>Loading…</Shell>;
  }

  if (!user) {
    return (
      <Shell>
        <h1 className="text-3xl">Sign in to predict</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You need an account so your points can be tracked on the league table.
        </p>
        <Button asChild className="mt-6">
          <Link to="/auth">Continue with Google</Link>
        </Button>
      </Shell>
    );
  }

  if (!race) {
    return (
      <Shell>
        <h1 className="text-3xl">No race to predict</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          There is no upcoming Grand Prix on the calendar right now.
        </p>
      </Shell>
    );
  }

  const usedInTop10 = top10.filter((d) => d !== EMPTY);
  const duplicates = usedInTop10.length !== new Set(usedInTop10).size;
  const dnfInTop10 = dnf !== EMPTY && usedInTop10.includes(dnf);

  async function save() {
    if (duplicates) {
      toast.error("Each driver can only appear once in your top 10.");
      return;
    }
    if (dnfInTop10) {
      toast.error("Your DNF pick can't be one of your top 10 finishers.");
      return;
    }
    if (usedInTop10.length !== 10 && !raceLocked) {
      toast.error("Pick all 10 positions before submitting.");
      return;
    }

    setSaving(true);
    const payload = {
      user_id: user!.id,
      race_id: race!.id,
      top10,
      pole_driver_id: pole === EMPTY ? null : pole,
      fastest_lap_driver_id: fastestLap === EMPTY ? null : fastestLap,
      dnf_driver_id: dnf === EMPTY ? null : dnf,
    };

    const { error } = await supabase
      .from("predictions")
      .upsert(payload, { onConflict: "user_id,race_id" });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Predictions locked in.");
    queryClient.invalidateQueries({ queryKey: ["prediction", race!.id, user!.id] });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-primary">
        Round {race.round}
      </p>
      <h1 className="mt-1 text-3xl">{race.name}</h1>
      <p className="text-sm text-muted-foreground">
        {race.circuit}
        {race.country ? ` · ${race.country}` : ""}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {race.qualifying_at && (
          <Countdown target={race.qualifying_at} label="Pole pick closes in" />
        )}
        <Countdown target={race.race_at} label="Top 10 / bonus picks close in" />
      </div>

      <GridPicker
        drivers={drivers ?? []}
        top10={top10}
        setTop10={setTop10}
        locked={raceLocked}
      />
      {duplicates && (
        <p className="mt-3 text-sm text-destructive">A driver is selected more than once.</p>
      )}

      <section className="carbon-panel mt-6 rounded-lg p-5">
        <h2 className="text-xl">Bonus picks</h2>
        <div className="mt-4 space-y-4">
          <Field label={poleLocked ? "Pole position (locked)" : "Pole position (+3)"}>
            <DriverSelect
              drivers={drivers ?? []}
              value={pole}
              disabled={poleLocked}
              onChange={setPole}
            />
          </Field>
          <Field label="Fastest lap (+3)">
            <DriverSelect
              drivers={drivers ?? []}
              value={fastestLap}
              disabled={raceLocked}
              onChange={setFastestLap}
            />
          </Field>
          <Field label="Driver to DNF (+1)">
            <DriverSelect
              drivers={drivers ?? []}
              value={dnf}
              disabled={raceLocked}
              exclude={usedInTop10}
              onChange={setDnf}
            />
            {dnfInTop10 && (
              <p className="mt-1.5 text-sm text-destructive">
                Your DNF pick can't be one of your top 10 finishers.
              </p>
            )}
          </Field>
        </div>
      </section>

      <div className="sticky bottom-4 mt-6">
        <Button
          size="lg"
          className="w-full"
          disabled={saving || raceLocked}
          onClick={save}
        >
          {raceLocked ? "Picks locked — race started" : saving ? "Saving…" : "Lock in picks"}
        </Button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function DriverSelect({
  drivers,
  value,
  onChange,
  disabled,
  exclude,
}: {
  drivers: Driver[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  exclude?: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={!!disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select driver" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY}>— No pick —</SelectItem>
        {drivers.map((d) => {
          const taken = !!exclude?.includes(d.id) && d.id !== value;
          return (
            <SelectItem key={d.id} value={d.id} disabled={taken}>
              {d.code ? `${d.code} · ` : ""}
              {d.full_name}
              {d.team ? ` (${d.team})` : ""}
              {taken ? " — already picked" : ""}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl px-4 py-16">{children}</main>;
}

function GridPicker({
  drivers,
  top10,
  setTop10,
  locked,
}: {
  drivers: Driver[];
  top10: string[];
  setTop10: React.Dispatch<React.SetStateAction<string[]>>;
  locked: boolean;
}) {
  const [active, setActive] = useState(() => {
    const i = top10.indexOf(EMPTY);
    return i === -1 ? 0 : i;
  });
  const byId = new Map(drivers.map((d) => [d.id, d]));
  const used = new Set(top10.filter((d) => d !== EMPTY));

  function place(id: string) {
    if (locked) return;
    setTop10((prev) => {
      const next = prev.map((p) => (p === id ? EMPTY : p));
      next[active] = id;
      const empty = next.findIndex((p, i) => p === EMPTY && i > active);
      const first = next.indexOf(EMPTY);
      setActive(empty !== -1 ? empty : first !== -1 ? first : active);
      return next;
    });
  }

  function clearSlot(i: number) {
    setTop10((prev) => prev.map((p, idx) => (idx === i ? EMPTY : p)));
    setActive(i);
  }

  return (
    <section className="carbon-panel mt-8 rounded-lg p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl">Starting grid</h2>
        {!locked && used.size > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setTop10(Array(10).fill(EMPTY));
              setActive(0);
            }}
          >
            Clear
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap a slot, then tap a driver. Tap a filled slot again to clear it.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2">
        {top10.map((id, i) => {
          const d = id !== EMPTY ? byId.get(id) : undefined;
          const isActive = i === active && !locked;
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => (d && i === active ? clearSlot(i) : setActive(i))}
              className={cn(
                "flex items-center gap-2 rounded-md border bg-background/70 px-2 py-2 text-left transition",
                i % 2 === 1 && "mt-5",
                isActive && "border-primary ring-1 ring-primary",
              )}
              style={d ? { borderLeft: `4px solid ${teamColor(d.team)}` } : undefined}
            >
              <span
                className={cn(
                  "w-7 shrink-0 rounded-sm py-0.5 text-center font-mono text-xs font-bold",
                  i === 0 ? "bg-gold text-gold-foreground" : "bg-secondary",
                )}
              >
                P{i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-extrabold italic uppercase">
                  {d ? (d.code ?? d.full_name) : "—"}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {d ? d.team : isActive ? "Pick a driver" : "Empty"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {!locked && (
        <>
          <p className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Drivers · filling P{active + 1}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {drivers.map((d) => {
              const taken = used.has(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  disabled={taken}
                  onClick={() => place(d.id)}
                  className={cn(
                    "rounded-md border bg-background/70 px-2 py-2 text-left transition hover:border-primary",
                    taken && "opacity-30",
                  )}
                  style={{ borderTop: `3px solid ${teamColor(d.team)}` }}
                >
                  <span className="block font-display text-sm font-extrabold italic uppercase">
                    {d.code ?? d.full_name.split(" ").pop()}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {d.full_name}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
