import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";
import type { OccurrenceTypePoint } from "./TypeDistributionPieChart";

type TypeSummaryBarChartProps = {
  data: OccurrenceTypePoint[];
};

export function TypeSummaryBarChart({ data }: TypeSummaryBarChartProps) {
  if (data.length === 0) {
    return null;
  }

  const heightRatio = Math.min(8, Math.max(1.8, data.length * 0.48)).toFixed(2);

  return (
    <BarChart
      aspectRatio={`5 / ${heightRatio}`}
      data={data}
      margin={{ top: 8, right: 16, bottom: 8, left: 168 }}
      orientation="horizontal"
      xDataKey="name"
    >
      <Grid vertical />
      <Bar dataKey="value" fill="var(--chart-line-primary)" lineCap="round" />
      <BarYAxis />
      <ChartTooltip
        rows={(point) => [
          {
            color: String(point.color ?? "var(--chart-line-primary)"),
            label: "Ocorrências",
            value: Number(point.value ?? 0),
          },
        ]}
        showDatePill={false}
      />
    </BarChart>
  );
}
