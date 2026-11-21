import { useState } from "react";
import { PieCenter } from "@/components/charts/pie-center";
import { PieChart } from "@/components/charts/pie-chart";
import type { PieData } from "@/components/charts/pie-context";
import { PieSlice } from "@/components/charts/pie-slice";
import {
  Legend,
  LegendItem,
  LegendLabel,
  LegendMarker,
  LegendValue,
} from "@/components/charts/legend";

export type OccurrenceTypePoint = {
  name: string;
  value: number;
  color: string;
};

type TypeDistributionPieChartProps = {
  data: OccurrenceTypePoint[];
};

export function TypeDistributionPieChart({
  data,
}: TypeDistributionPieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum tipo de ocorrência no período.
      </p>
    );
  }

  const slices: PieData[] = data.map((item) => ({
    label: item.name,
    value: item.value,
    color: item.color,
  }));

  const legendItems = slices.map((item) => ({
    label: item.label,
    value: item.value,
    color: item.color ?? "var(--chart-1)",
  }));

  return (
    <div className="flex w-full flex-col items-center gap-6 lg:flex-row">
      <div className="h-[280px] w-full lg:w-1/2">
        <PieChart
          cornerRadius={4}
          data={slices}
          hoveredIndex={hoveredIndex}
          innerRadius={68}
          onHoverChange={setHoveredIndex}
          padAngle={0.03}
        >
          {slices.map((slice, index) => (
            <PieSlice key={slice.label} index={index} />
          ))}
          <PieCenter defaultLabel="Total" />
        </PieChart>
      </div>
      <div className="max-h-[250px] w-full overflow-y-auto pr-1 lg:w-1/2">
        <Legend
          hoveredIndex={hoveredIndex}
          items={legendItems}
          onHoverChange={setHoveredIndex}
        >
          <LegendItem className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-3">
              <LegendMarker />
              <LegendLabel className="truncate text-sm font-medium" />
            </span>
            <LegendValue />
          </LegendItem>
        </Legend>
      </div>
    </div>
  );
}
