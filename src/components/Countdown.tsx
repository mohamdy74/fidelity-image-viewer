import { useEffect, useState } from "react";

function parts(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export function Countdown({ target, label }: { target: string; label: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = new Date(target).getTime() - now;
  const locked = left <= 0;
  const { d, h, m, s } = parts(left);

  return (
    <div className="carbon-panel rounded-md px-3 py-2">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {locked ? (
        <p className="font-display text-lg font-extrabold italic uppercase text-primary">
          Locked
        </p>
      ) : (
        <p className="font-mono text-lg font-bold tabular-nums">
          {d > 0 ? `${d}d ` : ""}
          {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:
          {String(s).padStart(2, "0")}
        </p>
      )}
    </div>
  );
}
