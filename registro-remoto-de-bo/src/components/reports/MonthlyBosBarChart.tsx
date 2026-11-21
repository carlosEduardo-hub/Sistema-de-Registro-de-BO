import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";

export type MonthlyBosPoint = {
  month: string;
  total: number;
};

type MonthlyBosBarChartProps = {
  data: MonthlyBosPoint[];
};

export function MonthlyBosBarChart({ data }: MonthlyBosBarChartProps) {
  return (
    <BarChart
      aspectRatio="16 / 9"
      data={data}
      margin={{ top: 16, right: 8, bottom: 28, left: 8 }}
      xDataKey="month"
    >
      <Grid horizontal />
      <Bar dataKey="total" fill="var(--chart-line-primary)" lineCap="round" />
      <BarXAxis maxLabels={{ base: 6, sm: 12 }} />
      <ChartTooltip showDatePill={false} />
    </BarChart>
  );
}
