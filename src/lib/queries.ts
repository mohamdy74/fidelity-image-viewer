import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const SEASON = 2026;

export type Race = {
  id: string;
  season: number;
  round: number;
  name: string;
  circuit: string | null;
  country: string | null;
  locality: string | null;
  race_at: string;
  qualifying_at: string | null;
  has_results: boolean;
};

export type Driver = {
  id: string;
  code: string | null;
  full_name: string;
  team: string | null;
  number: number | null;
};

export const racesQuery = queryOptions({
  queryKey: ["races", SEASON],
  queryFn: async (): Promise<Race[]> => {
    const { data, error } = await supabase
      .from("races")
      .select("*")
      .eq("season", SEASON)
      .order("round");
    if (error) throw error;
    return data as Race[];
  },
});

export const driversQuery = queryOptions({
  queryKey: ["drivers"],
  queryFn: async (): Promise<Driver[]> => {
    const { data, error } = await supabase
      .from("drivers")
      .select("id, code, full_name, team, number")
      .eq("active", true)
      .order("full_name");
    if (error) throw error;
    return data as Driver[];
  },
});

export type LeaderboardEntry = {
  userId: string;
  name: string;
  avatar: string | null;
  points: number;
  races: number;
  best: number | null;
};

export const leaderboardQuery = queryOptions({
  queryKey: ["leaderboard", SEASON],
  queryFn: async (): Promise<LeaderboardEntry[]> => {
    const [{ data: scores, error: sErr }, { data: profiles, error: pErr }] =
      await Promise.all([
        supabase.from("scores").select("user_id, race_id, points"),
        supabase.from("profiles").select("id, display_name, avatar_url"),
      ]);
    if (sErr) throw sErr;
    if (pErr) throw pErr;

    const byUser = new Map<string, LeaderboardEntry>();
    for (const p of profiles ?? []) {
      byUser.set(p.id, {
        userId: p.id,
        name: p.display_name,
        avatar: p.avatar_url,
        points: 0,
        races: 0,
        best: null,
      });
    }
    for (const s of scores ?? []) {
      const entry = byUser.get(s.user_id);
      if (!entry) continue;
      entry.points += s.points;
      entry.races += 1;
      entry.best = entry.best == null ? s.points : Math.max(entry.best, s.points);
    }

    return [...byUser.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  },
});

export function nextRace(races: Race[]): Race | null {
  const now = Date.now();
  return races.find((r) => new Date(r.race_at).getTime() > now) ?? null;
}

export function lastRace(races: Race[]): Race | null {
  const done = races.filter((r) => r.has_results);
  return done.length ? done[done.length - 1]! : null;
}
