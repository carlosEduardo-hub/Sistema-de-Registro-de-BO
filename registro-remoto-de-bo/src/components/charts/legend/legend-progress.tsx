"use client";

import { cn } from "@/lib/utils";
import { useLegendItem } from "./legend-context";

export interface LegendProgressProps {
  /** Track class name */
  trackClassName?: string;
  /** Indicator class name */
  indicatorClassName?: string;
  /** Track height. Default: "h-1.5" */
  height?: string;
}

export function LegendProgress({
  trackClassName = "",
  indicatorClassName = "",
  height = "h-1.5",
}: LegendProgressProps) {
  const { item } = useLegendItem();

  if (!item.maxValue || item.maxValue <= 0) {
    return null;
  }

  const width = `${Math.min(100, (item.value / item.maxValue) * 100)}%`;

  return (
    <div
      aria-valuemax={item.maxValue}
      aria-valuemin={0}
      aria-valuenow={item.value}
      className={cn(
        "w-full overflow-hidden rounded-full bg-legend-track",
        height,
        trackClassName,
      )}
      role="progressbar"
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          indicatorClassName,
        )}
        style={{ backgroundColor: item.color, width }}
      />
    </div>
  );
}

LegendProgress.displayName = "LegendProgress";
