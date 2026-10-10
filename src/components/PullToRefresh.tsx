import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const PULL_THRESHOLD = 80; // pixels to pull before triggering refresh
const MAX_PULL = 120; // max visual pull distance

export function PullToRefresh() {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    // Only enable on touch devices
    if (!("ontouchstart" in window)) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if scrolled to the top
      if (window.scrollY > 0) return;

      startY.current = e.touches[0]!.clientY;
      isPulling.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0]!.clientY;
      const distance = currentY - startY.current;

      // Only pull down, not up
      if (distance <= 0) {
        setPullDistance(0);
        return;
      }

      // Damping effect — gets harder to pull the further you go
      const dampenedDistance = Math.min(
        distance * 0.5,
        MAX_PULL,
      );

      setPullDistance(dampenedDistance);

      // Prevent default scroll if pulling
      if (distance > 10) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current) return;

      isPulling.current = false;

      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(PULL_THRESHOLD);

        // Trigger router invalidation (refetches all queries)
        await router.invalidate();

        // Hold the spinner for a moment so it's visible
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 600);
      } else {
        setPullDistance(0);
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, router]);

  const rotation = (pullDistance / PULL_THRESHOLD) * 360;
  const opacity = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const scale = Math.min(pullDistance / PULL_THRESHOLD, 1);

  if (pullDistance === 0) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[100] flex -translate-x-1/2 items-center justify-center"
      style={{
        top: `${Math.min(pullDistance, PULL_THRESHOLD)}px`,
        opacity,
        transform: `translateX(-50%) scale(${scale})`,
        transition: isRefreshing ? "top 0.2s ease, opacity 0.2s ease" : "none",
      }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 shadow-lg backdrop-blur">
        <RefreshCw
          className="h-5 w-5 text-primary-foreground"
          style={{
            transform: `rotate(${rotation}deg)`,
            animation: isRefreshing ? "spin 1s linear infinite" : "none",
          }}
        />
      </div>
    </div>
  );
}
