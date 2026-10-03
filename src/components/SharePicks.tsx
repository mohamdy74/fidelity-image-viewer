import { Copy, Download, Image as ImageIcon, Share2 } from "lucide-react";
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
    `🏎️ My predictions for ${raceName} (Round ${round}) 🏁`,
    "━━━━━━━━━━━━━━",
    ...top10.map((id, i) => `${MEDAL[i]} P${i + 1}: ${name(id)}`),
    `⚡ Pole: ${name(pole)}`,
    `🟣 Fastest Lap: ${name(fastestLap)}`,
    `💥 First DNF: ${name(dnf)}`,
    "━━━━━━━━━━━━━━",
    `🏆 Check my picks & challenge me:`,
    url,
  ].join("\n");

  async function exportCardAsPng(): Promise<Blob | null> {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350; // Aspect ratio 4:5 for Instagram / Stories
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 1. Carbon Dark Background
    ctx.fillStyle = "#0E0E12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. F1 Accent Red Strip
    ctx.fillStyle = "#E10600";
    ctx.fillRect(0, 0, canvas.width, 16);

    // 3. Grand Prix & Player Header
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 52px Archivo, sans-serif";
    ctx.fillText(raceName.toUpperCase(), 60, 120);

    ctx.fillStyle = "#E10600";
    ctx.font = "bold 28px monospace";
    ctx.fillText(`ROUND ${round} · ${playerName.toUpperCase()}`, 60, 170);

    // 4. Driver Rows (P1 - P10)
    let y = 220;
    top10.forEach((id, i) => {
      const d = byId.get(id);
      ctx.fillStyle = "#18181F";
      ctx.fillRect(60, y, 960, 72);

      // Team Color Indicator Bar
      ctx.fillStyle = teamColor(d?.team ?? null);
      ctx.fillRect(60, y, 14, 72);

      ctx.fillStyle = "#888899";
      ctx.font = "bold 32px monospace";
      ctx.fillText(`P${i + 1}`, 95, y + 48);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 36px Archivo, sans-serif";
      ctx.fillText(d?.code ?? "—", 180, y + 50);

      ctx.fillStyle = "#AAAAAA";
      ctx.font = "30px sans-serif";
      ctx.fillText(d?.full_name ?? "", 300, y + 49);

      y += 84;
    });

    // 5. Bonus Picks Section
    ctx.fillStyle = "#14141A";
    ctx.fillRect(60, 1080, 960, 140);

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 26px monospace";
    ctx.fillText(`POLE: ${byId.get(pole ?? "")?.code ?? "—"}`, 100, 1160);
    ctx.fillText(`FL: ${byId.get(fastestLap ?? "")?.code ?? "—"}`, 420, 1160);
    ctx.fillText(`DNF: ${byId.get(dnf ?? "")?.code ?? "—"}`, 720, 1160);

    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  async function handleDownloadImage() {
    const blob = await exportCardAsPng();
    if (!blob) {
      toast.error("Failed to generate image.");
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `f1-picks-round-${round}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Image saved to your downloads!");
  }

  async function handleShareImage() {
    const blob = await exportCardAsPng();
    if (!blob) {
      toast.error("Failed to generate image.");
      return;
    }

    const file = new File([blob], `f1-picks-round-${round}.png`, { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `F1 Picks - Round ${round}`,
          text: `Check out my F1 predictions for ${raceName}!`,
        });
        return;
      } catch {
        /* Cancelled or failed share */
      }
    } else {
      handleDownloadImage();
    }
  }

  async function nativeShareText() {
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* Cancelled */
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="h-12 w-full gap-2 border-gold/60 text-gold">
          <Share2 className="h-4 w-4" />Share Picks 🏁
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

        {/* Action Buttons Section */}
        <div className="space-y-2 p-3 pt-0">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleShareImage} className="gap-2">
              <ImageIcon className="h-4 w-4" /> Share Card
            </Button>
            <Button variant="outline" onClick={handleDownloadImage} className="gap-2">
              <Download className="h-4 w-4" /> Save PNG
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={nativeShareText} className="h-9 text-xs gap-1.5">
              <Share2 className="h-3.5 w-3.5" /> Share Text
            </Button>
            <Button
              variant="ghost"
              className="h-9 text-xs gap-1.5"
              onClick={async () => {
                await navigator.clipboard?.writeText(text);
                toast.success("Copied text to clipboard!");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy Text
            </Button>
          </div>
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