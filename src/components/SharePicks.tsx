import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

import { HelmetLogo } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Driver } from "@/lib/queries";
import { teamColor } from "@/lib/teams";

const MEDAL = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export function SharePicks({
  raceName,
  round,
  playerName,
  drivers,
  top10,
  pole,
  fastestLap,
  dnf,
}: {
  raceName: string;
  round: number;
  playerName: string;
  drivers: Driver[];
  top10: string[];
  pole: string | null;
  fastestLap: string | null;
  dnf: string | null;
}) {
  const byId = new Map(drivers.map((d) => [d.id, d]));
  const name = (id: string | null) => (id ? (byId.get(id)?.full_name ?? "—") : "—");
  const url = typeof window !== "undefined" ? `${window.location.origin}/predict` : "";

  const text = [
    `🏎️ توقعاتي لـ ${raceName} (الجولة ${round}) 🏁`,
    "━━━━━━━━━━━━━━",
    ...top10.map((id, i) => `${MEDAL[i]} P${i + 1}: ${name(id)}`),
    `⚡ Pole: ${name(pole)}`,
    `🟣 Fastest Lap: ${name(fastestLap)}`,
    `💥 First DNF: ${name(dnf)}`,
    "━━━━━━━━━━━━━━",
    `🏆 وريني توقعك وتحداني:`,
    url,
  ].join("\n");

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* cancelled */
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="h-12 w-full gap-2 border-gold/60 text-gold">
          <Share2 className="h-4 w-4" /> شارك توقعاتك 🏁
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm p-0">
        <DialogTitle className="sr-only">Share your picks</DialogTitle>
        <div className="carbon-panel overflow-hidden rounded-lg">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <HelmetLogo className="h-7 w-9" />
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                Round {round} · {playerName}
              </p>
              <p className="truncate font-display text-lg font-black italic uppercase">{raceName}</p>
            </div>
          </div>
          <ol className="space-y-1 p-3">
            {top10.map((id, i) => {
              const d = byId.get(id);
              return (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-sm border-l-4 bg-muted/40 px-2 py-1"
                  style={{ borderColor: teamColor(d?.team ?? null) }}
                >
                  <span className="w-7 font-mono text-xs font-bold text-muted-foreground">P{i + 1}</span>
                  <span className="font-semibold">{d?.code ?? "—"}</span>
                  <span className="truncate text-sm text-muted-foreground">{d?.full_name}</span>
                </li>
              );
            })}
          </ol>
          <div className="grid grid-cols-3 gap-2 border-t border-border p-3 text-center text-xs">
            <Bonus label="Pole ⚡" value={byId.get(pole ?? "")?.code} />
            <Bonus label="FL 🟣" value={byId.get(fastestLap ?? "")?.code} />
            <Bonus label="DNF 💥" value={byId.get(dnf ?? "")?.code} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 pt-0">
          <Button onClick={nativeShare} className="gap-2">
            <Share2 className="h-4 w-4" /> واتساب
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={async () => {
              await navigator.clipboard?.writeText(text);
              toast.success("اتنسخت — الصقها في الجروب");
            }}
          >
            <Copy className="h-4 w-4" /> نسخ
          </Button>
          <p className="col-span-2 text-center text-xs text-muted-foreground">
            خد سكرين شوت للكارت وحطه ستوري 📸
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Bonus({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-sm bg-muted/40 py-1.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-display text-base font-black">{value ?? "—"}</p>
    </div>
  );
}
