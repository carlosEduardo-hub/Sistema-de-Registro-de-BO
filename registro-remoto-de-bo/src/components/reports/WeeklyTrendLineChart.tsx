import { useMemo } from "react";
import { Grid } from "@/components/charts/grid";
import { Line, LineChart } from "@/components/charts/line-chart";
import { ChartTooltip } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";

export type WeeklyTrendPoint = {
  day: string;
  occurrences: number;
};

type WeeklyTrendLineChartProps = {
  data: WeeklyTrendPoint[];
};

const WEEK_ANCHOR = new Date(2024, 0, 7);

export function WeeklyTrendLineChart({ data }: WeeklyTrendLineChartProps) {
  const labels = useMemo(() => data.map((point) => point.day), [data]);
  const series = useMemo(
    () =>
      data.map((point, index) => {
        const date = new Date(WEEK_ANCHOR);
        date.setDate(WEEK_ANCHOR.getDate() + index);
        return {
          date,
          occurrences: point.occurrences,
        };
      }),
    [data],
  );

  return (
    <LineChart
      aspectRatio="16 / 9"
      data={series}
      margin={{ top: 16, right: 12, bottom: 28, left: 8 }}
      xDataKey="date"
    >
      <Grid horizontal />
      <Line
        dataKey="occurrences"
        stroke="var(--chart-2)"
        strokeWidth={3}
      />
      <XAxis labels={labels} numTicks={labels.length || 7} />
      <ChartTooltip dateLabels={labels} showDatePill={false} />
    </LineChart>
  );
}
