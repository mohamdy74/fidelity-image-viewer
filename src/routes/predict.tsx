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

  async function save() {
    if (duplicates) {
      toast.error("Each driver can only appear once in your top 10.");
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

      <section className="carbon-panel mt-8 rounded-lg p-5">
        <h2 className="text-xl">Top 10 finishing order</h2>
        <div className="mt-4 space-y-2">
          {top10.map((value, index) => (
            <div key={index} className="flex items-center gap-3">
              <span
                className={cn(
                  "w-8 shrink-0 rounded-sm py-1 text-center font-mono text-sm font-bold",
                  index === 0 ? "bg-gold text-gold-foreground" : "bg-secondary",
                )}
              >
                {index + 1}
              </span>
              <DriverSelect
                drivers={drivers ?? []}
                value={value}
                disabled={raceLocked}
                onChange={(v) =>
                  setTop10((prev) => prev.map((p, i) => (i === index ? v : p)))
                }
              />
            </div>
          ))}
        </div>
        {duplicates && (
          <p className="mt-3 text-sm text-destructive">
            A driver is selected more than once.
          </p>
        )}
      </section>

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
              onChange={setDnf}
            />
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
}: {
  drivers: Driver[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={!!disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select driver" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY}>— No pick —</SelectItem>
        {drivers.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            {d.code ? `${d.code} · ` : ""}
            {d.full_name}
            {d.team ? ` (${d.team})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl px-4 py-16">{children}</main>;
}
