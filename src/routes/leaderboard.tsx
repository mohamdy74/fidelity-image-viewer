import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { leaderboardQuery, racesQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "League standings — Fantasy F1" },
      {
        name: "description",
        content: "Live Fantasy F1 prediction league standings for the season.",
      },
      { property: "og:title", content: "League standings — Fantasy F1" },
      {
        property: "og:description",
        content: "See who is leading the Fantasy F1 prediction league.",
      },
    ],
  }),
  component: Leaderboard,
});

function Leaderboard() {
  const { data: board, isLoading } = useQuery(leaderboardQuery);
  const { data: races } = useQuery(racesQuery);
  const { user } = useAuth();

  const scored = races?.filter((r) => r.has_results).length ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl">League standings</h1>
      <p className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {scored} race{scored === 1 ? "" : "s"} scored
      </p>

      <div className="mt-8 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading timing tower…</p>}
        {!isLoading && !board?.length && (
          <p className="text-sm text-muted-foreground">
            No players yet. Sign in to claim P1.
          </p>
        )}
        {board?.map((entry, index) => (
          <div
            key={entry.userId}
            className={cn(
              "tower-row flex items-center gap-3 rounded-md px-3 py-3",
              index === 0 && "border-l-gold",
              index > 0 && index < 3 && "border-l-primary",
              entry.userId === user?.id && "ring-1 ring-primary/60",
            )}
          >
            <span
              className={cn(
                "w-8 shrink-0 text-center font-mono text-lg font-bold tabular-nums",
                index === 0 && "text-gold",
              )}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-extrabold italic uppercase">
                {entry.name}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {entry.races} scored · best {entry.best ?? 0}
              </p>
            </div>
            <span className="font-mono text-xl font-bold tabular-nums">{entry.points}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
