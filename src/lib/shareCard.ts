import { LOGO } from "@/lib/logoPaths";
import { teamLabel } from "@/lib/teams";

export const CARD_W = 1080;
export const CARD_H = 1350; // 4:5, fits Instagram / WhatsApp status

export type CardDriver = { code: string | null; name: string | null; team: string | null } | null;

export type CardData = {
  raceName: string;
  round: number;
  playerName: string;
  top10: CardDriver[];
  pole: CardDriver;
  fastestLap: CardDriver;
  dnf: CardDriver;
  host: string;
};

// Hex versions of the --team-* tokens in styles.css (canvas can't read CSS variables).
const TEAM_HEX: Record<string, string> = {
  Ferrari: "#E3121E",
  McLaren: "#FF8918",
  Mercedes: "#36D2BA",
  "Red Bull": "#325AC2",
  "Aston Martin": "#007C59",
  Alpine: "#0099E0",
  Williams: "#2A80E2",
  Haas: "#FCFCFC",
  "Racing Bulls": "#5E78D9",
  Audi: "#97989B",
  Cadillac: "#8C8C96",
};

const C = {
  bg: "#0E0E12",
  row: "#15151B",
  line: "rgba(255,255,255,0.09)",
  text: "#FFFFFF",
  muted: "#A4A4AB",
  red: "#E10600",
  orange: "#FF6A1F",
  gold: "#FFD230",
  purple: "#955BE3",
  silver: "#C9CCD3",
  bronze: "#CD7F32",
};

const DISPLAY = (size: number, italic = true) =>
  `${italic ? "italic " : ""}800 ${size}px Archivo, "Arial Black", system-ui, sans-serif`;
const SANS = (size: number, weight = 600) => `${weight} ${size}px Barlow, system-ui, sans-serif`;
const MONO = (size: number) =>
  `700 ${size}px "Barlow Semi Condensed", ui-monospace, Menlo, monospace`;

function teamHex(team: string | null | undefined) {
  return TEAM_HEX[teamLabel(team)] ?? "#6B6B73";
}

type Ctx = CanvasRenderingContext2D;

function spaced(ctx: Ctx, px: number) {
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}

function fit(ctx: Ctx, text: string, maxW: number, make: (size: number) => string, start: number, min = 26) {
  let size = start;
  ctx.font = make(size);
  while (size > min && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = make(size);
  }
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLogo(ctx: Ctx, x: number, y: number, height: number) {
  const k = height / LOGO.box.h;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.translate(-LOGO.box.x, -LOGO.box.y);
  ctx.fillStyle = C.text;
  ctx.fill(new Path2D(LOGO.d), "evenodd");
  ctx.fillStyle = C.orange;
  ctx.fill(new Path2D(LOGO.c1));
  ctx.fillStyle = C.red;
  ctx.fill(new Path2D(LOGO.c2));
  ctx.save();
  ctx.translate(LOGO.textX, 0);
  ctx.fillStyle = C.text;
  ctx.fill(new Path2D(LOGO.word));
  ctx.translate(0, LOGO.subY);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fill(new Path2D(LOGO.sub));
  ctx.restore();
  ctx.restore();
}

/** Pure drawing: paints the whole share card onto a 1080x1350 canvas context. */
export function drawPickCard(ctx: Ctx, d: CardData) {
  const L = 60;
  const R = CARD_W - 60;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // background + soft red glow top-right + red strip
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const glow = ctx.createRadialGradient(CARD_W, 0, 0, CARD_W, 0, 820);
  glow.addColorStop(0, "rgba(225,6,0,0.20)");
  glow.addColorStop(1, "rgba(225,6,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = C.red;
  ctx.fillRect(0, 0, CARD_W, 10);

  // header: logo + round
  drawLogo(ctx, L, 50, 66);
  ctx.fillStyle = C.muted;
  ctx.font = MONO(26);
  spaced(ctx, 5);
  ctx.textAlign = "right";
  ctx.fillText(`ROUND ${String(d.round).padStart(2, "0")}`, R, 96);
  ctx.textAlign = "left";
  spaced(ctx, 0);

  // race name
  ctx.fillStyle = C.text;
  const race = d.raceName.toUpperCase();
  fit(ctx, race, R - L, (s) => DISPLAY(s), 68, 36);
  ctx.fillText(race, L, 200);

  // participant
  ctx.fillStyle = C.red;
  ctx.fillRect(L, 246, 8, 84);
  ctx.fillStyle = C.muted;
  ctx.font = MONO(22);
  spaced(ctx, 6);
  ctx.fillText("PICKS BY", L + 30, 268);
  spaced(ctx, 0);
  ctx.fillStyle = C.text;
  const player = d.playerName.toUpperCase();
  fit(ctx, player, R - L - 30, (s) => DISPLAY(s, false), 58, 30);
  ctx.fillText(player, L + 30, 322);

  ctx.fillStyle = C.line;
  ctx.fillRect(L, 366, R - L, 2);

  // top 10
  const startY = 392;
  const rowH = 62;
  const pitch = 72;
  d.top10.slice(0, 10).forEach((drv, i) => {
    const y = startY + i * pitch;
    ctx.fillStyle = C.row;
    roundRect(ctx, L, y, R - L, rowH, 8);
    ctx.fill();
    ctx.fillStyle = teamHex(drv?.team);
    ctx.fillRect(L, y + 8, 8, rowH - 16);

    ctx.textAlign = "center";
    ctx.fillStyle = i === 0 ? C.gold : i === 1 ? C.silver : i === 2 ? C.bronze : C.muted;
    ctx.font = MONO(32);
    ctx.fillText(String(i + 1), L + 58, y + 42);

    ctx.textAlign = "left";
    ctx.fillStyle = C.text;
    ctx.font = DISPLAY(34);
    ctx.fillText(drv?.code ?? "—", L + 112, y + 43);

    ctx.fillStyle = C.muted;
    fit(ctx, drv?.name ?? "", R - (L + 260) - 24, (s) => SANS(s, 600), 28, 20);
    ctx.fillText(drv?.name ?? "", L + 260, y + 41);
  });

  // bonus picks
  const by = startY + 10 * pitch + 16;
  const bh = 112;
  ctx.fillStyle = C.row;
  roundRect(ctx, L, by, R - L, bh, 10);
  ctx.fill();
  const cell = (R - L) / 3;
  const bonus: Array<[string, CardDriver, string]> = [
    ["POLE", d.pole, C.gold],
    ["FASTEST LAP", d.fastestLap, C.purple],
    ["FIRST DNF", d.dnf, C.red],
  ];
  bonus.forEach(([label, drv, color], i) => {
    const cx = L + cell * i + cell / 2;
    if (i > 0) {
      ctx.fillStyle = C.line;
      ctx.fillRect(L + cell * i, by + 22, 2, bh - 44);
    }
    ctx.textAlign = "center";
    ctx.fillStyle = C.muted;
    ctx.font = MONO(20);
    spaced(ctx, 4);
    ctx.fillText(label, cx, by + 38);
    spaced(ctx, 0);
    ctx.fillStyle = color;
    ctx.font = DISPLAY(46);
    ctx.fillText(drv?.code ?? "—", cx, by + 92);
  });

  // footer
  ctx.textAlign = "left";
  ctx.fillStyle = C.muted;
  ctx.font = MONO(22);
  spaced(ctx, 2);
  ctx.fillText(d.host.toUpperCase(), L, CARD_H - 44);
  ctx.fillStyle = C.red;
  ctx.textAlign = "right";
  spaced(ctx, 4);
  ctx.fillText("CAN YOU BEAT ME?", R, CARD_H - 44);
  spaced(ctx, 0);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(164,164,171,0.6)";
  ctx.font = MONO(15);
  spaced(ctx, 3);
  ctx.fillText("UNOFFICIAL NON-PROFIT FAN PROJECT", CARD_W / 2, CARD_H - 12);
  spaced(ctx, 0);
  ctx.textAlign = "left";
}

/** Browser helper: waits for the web fonts, draws the card and returns a PNG blob. */
export async function renderPickCard(data: CardData): Promise<Blob | null> {
  try {
    await Promise.all(
      [
        "italic 800 40px Archivo",
        "800 40px Archivo",
        "600 28px Barlow",
        '700 28px "Barlow Semi Condensed"',
      ].map((f) => document.fonts.load(f).catch(() => null)),
    );
  } catch {
    /* draw with fallback fonts */
  }
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawPickCard(ctx, data);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
