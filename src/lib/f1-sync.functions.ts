import { createServerFn } from "@tanstack/react-start";

import type { Json } from "@/integrations/supabase/types";
import { NO_SUBMISSION_PENALTY, scorePrediction, type ResultRow } from "./scoring";

const API = "https://api.jolpi.ca/ergast/f1";
const SEASON = 2026;
const STALE_MS = 15 * 60 * 1000;

type ErgastSession = { date: string; time?: string | undefined };
type ErgastRace = {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: {
    circuitName: string;
    Location: { locality?: string; country?: string };
  };
  Qualifying?: ErgastSession;
  Results?: Array<{
    position: string;
    grid: string;
    status: string;
    Driver: { driverId: string; code?: string; givenName: string; familyName: string };
    Constructor?: { name: string };
    FastestLap?: { rank?: string };
  }>;
};

function toIso(session: { date: string; time?: string | undefined } | undefined): string | null {
  if (!session?.date) return null;
  return new Date(`${session.date}T${session.time ?? "12:00:00Z"}`).toISOString();
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const syncF1Data = createServerFn({ method: "POST" })
  .inputValidator((input: { force?: boolean } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: state } = await supabaseAdmin
      .from("sync_state")
      .select("synced_at")
      .eq("key", `season-${SEASON}`)
      .maybeSingle();

    if (!data.force && state?.synced_at) {
      const age = Date.now() - new Date(state.synced_at).getTime();
      if (age < STALE_MS) return { skipped: true as const };
    }

    // ---- Calendar ----
    const calendar = await getJson<{
      MRData: { RaceTable: { Races: ErgastRace[] } };
    }>(`${API}/${SEASON}/races/?format=json&limit=40`);
    const races = calendar?.MRData.RaceTable.Races ?? [];

    if (races.length) {
      await supabaseAdmin.from("races").upsert(
        races.map((r) => ({
          season: Number(r.season),
          round: Number(r.round),
          name: r.raceName,
          circuit: r.Circuit.circuitName,
          country: r.Circuit.Location.country ?? null,
          locality: r.Circuit.Location.locality ?? null,
          race_at: toIso({ date: r.date, time: r.time })!,
          qualifying_at: toIso(r.Qualifying),
        })),
        { onConflict: "season,round" },
      );
    }

    // ---- Drivers ----
    const standings = await getJson<{
      MRData: {
        StandingsTable: {
          StandingsLists: Array<{
            DriverStandings: Array<{
              Driver: {
                driverId: string;
                code?: string;
                permanentNumber?: string;
                givenName: string;
                familyName: string;
              };
              Constructors: Array<{ name: string }>;
            }>;
          }>;
        };
      };
    }>(`${API}/${SEASON}/driverstandings/?format=json&limit=60`);

    const entries = standings?.MRData.StandingsTable.StandingsLists?.[0]?.DriverStandings ?? [];
    if (entries.length) {
      await supabaseAdmin.from("drivers").upsert(
        entries.map((e) => ({
          id: e.Driver.driverId,
          code: e.Driver.code ?? null,
          full_name: `${e.Driver.givenName} ${e.Driver.familyName}`,
          team: e.Constructors[0]?.name ?? null,
          number: e.Driver.permanentNumber ? Number(e.Driver.permanentNumber) : null,
          active: true,
        })),
        { onConflict: "id" },
      );
    }

    // ---- Results (the API caps each page at 100 result rows, so page through) ----
    const racesWithResults: ErgastRace[] = [];
    const pageSize = 100;
    let offset = 0;
    let total = Infinity;
    while (offset < total && offset < 2000) {
      const page = await getJson<{
        MRData: { total: string; RaceTable: { Races: ErgastRace[] } };
      }>(`${API}/${SEASON}/results/?format=json&limit=${pageSize}&offset=${offset}`);
      if (!page) break;
      total = Number(page.MRData.total);
      for (const race of page.MRData.RaceTable.Races) {
        const existing = racesWithResults.find((r) => r.round === race.round);
        if (existing) existing.Results = [...(existing.Results ?? []), ...(race.Results ?? [])];
        else racesWithResults.push(race);
      }
      offset += pageSize;
    }

    const { data: dbRaces } = await supabaseAdmin
      .from("races")
      .select("id, round")
      .eq("season", SEASON);
    const roundToId = new Map((dbRaces ?? []).map((r) => [r.round, r.id]));

    for (const race of racesWithResults) {
      const raceId = roundToId.get(Number(race.round));
      if (!raceId || !race.Results?.length) continue;

      const rows = race.Results.map((res) => {
        const status = res.status ?? "";
        const finished = /finished|\+\d+ lap/i.test(status);
        return {
          race_id: raceId,
          driver_id: res.Driver.driverId,
          position: finished ? Number(res.position) : null,
          status,
          finished,
          fastest_lap: res.FastestLap?.rank === "1",
          pole: res.grid === "1",
        };
      });

      await supabaseAdmin
        .from("race_results")
        .upsert(rows, { onConflict: "race_id,driver_id" });
      await supabaseAdmin.from("races").update({ has_results: true }).eq("id", raceId);
    }

    await scoreAllRaces();

    await supabaseAdmin
      .from("sync_state")
      .upsert(
        { key: `season-${SEASON}`, synced_at: new Date().toISOString() },
        { onConflict: "key" },
      );

    return { skipped: false as const, races: races.length, scored: racesWithResults.length };
  });

async function scoreAllRaces() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: races } = await supabaseAdmin
    .from("races")
    .select("id, race_at")
    .eq("season", SEASON)
    .eq("has_results", true);
  if (!races?.length) return;

  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, created_at");
  if (!profiles?.length) return;

  for (const race of races) {
    const { data: results } = await supabaseAdmin
      .from("race_results")
      .select("driver_id, position, finished, fastest_lap, pole")
      .eq("race_id", race.id);
    if (!results?.length) continue;

    const { data: predictions } = await supabaseAdmin
      .from("predictions")
      .select("user_id, top10, pole_driver_id, fastest_lap_driver_id, dnf_driver_id")
      .eq("race_id", race.id);

    const byUser = new Map((predictions ?? []).map((p) => [p.user_id, p]));
    const rows: Array<{
      user_id: string;
      race_id: string;
      points: number;
      breakdown: Json;
      updated_at: string;
    }> = [];

    for (const profile of profiles) {
      // Players who joined after the race started are not penalised.
      if (new Date(profile.created_at) > new Date(race.race_at)) continue;

      const prediction = byUser.get(profile.id);
      if (!prediction) {
        rows.push({
          user_id: profile.id,
          race_id: race.id,
          points: NO_SUBMISSION_PENALTY,
          breakdown: { noSubmission: true, total: NO_SUBMISSION_PENALTY },
          updated_at: new Date().toISOString(),
        });
        continue;
      }

      const breakdown = scorePrediction(
        {
          top10: prediction.top10 ?? [],
          pole_driver_id: prediction.pole_driver_id,
          fastest_lap_driver_id: prediction.fastest_lap_driver_id,
          dnf_driver_id: prediction.dnf_driver_id,
        },
        results as ResultRow[],
      );

      rows.push({
        user_id: profile.id,
        race_id: race.id,
        points: breakdown.total,
        breakdown: { ...breakdown },
        updated_at: new Date().toISOString(),
      });
    }

    if (rows.length) {
      await supabaseAdmin.from("scores").upsert(rows, { onConflict: "user_id,race_id" });
    }
  }
}
