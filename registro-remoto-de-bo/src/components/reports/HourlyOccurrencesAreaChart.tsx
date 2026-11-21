import { useMemo } from "react";
import { Area, AreaChart } from "@/components/charts/area-chart";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";

export type HourlyOccurrencePoint = {
  hour: string;
  count: number;
};

type HourlyOccurrencesAreaChartProps = {
  data: HourlyOccurrencePoint[];
};

export function HourlyOccurrencesAreaChart({
  data,
}: HourlyOccurrencesAreaChartProps) {
  const labels = useMemo(() => data.map((point) => point.hour), [data]);
  const series = useMemo(
    () =>
      data.map((point, hour) => ({
        date: new Date(2024, 0, 1, hour, 0, 0, 0),
        count: point.count,
      })),
    [data],
  );

  return (
    <AreaChart
      aspectRatio="16 / 9"
      data={series}
      margin={{ top: 16, right: 12, bottom: 28, left: 8 }}
      xDataKey="date"
    >
      <Grid horizontal />
      <Area dataKey="count" fill="#8b5cf6" stroke="#8b5cf6" strokeWidth={3} />
      <XAxis
        labels={labels}
        numTicks={{ base: 6, md: 12, lg: 24 }}
      />
      <ChartTooltip dateLabels={labels} showDatePill={false} />
    </AreaChart>
  );
}
