import { useState, useMemo } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Download,
  Calendar,
  Loader2,
  Clock,
} from "lucide-react";
import { HourlyOccurrencesAreaChart } from "@/components/reports/HourlyOccurrencesAreaChart";
import { MonthlyBosBarChart } from "@/components/reports/MonthlyBosBarChart";
import { TypeDistributionPieChart } from "@/components/reports/TypeDistributionPieChart";
import { TypeSummaryBarChart } from "@/components/reports/TypeSummaryBarChart";
import { WeeklyTrendLineChart } from "@/components/reports/WeeklyTrendLineChart";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { useQuery } from "@tanstack/react-query";
import { getAllBos } from "@/api/registerBoAPI";
import { RegisterBo } from "@/types/registerBo";
import { toast } from "sonner";

// Cores para os gráficos
const CHART_COLORS = [
  "#dc2626",
  "#fbbf24",
  "#1e3a8a",
  "#16a34a",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f59e0b",
];

export default function Reports() {
  const [period, setPeriod] = useState("all");
  const [chartYear, setChartYear] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Buscar todos os B.O.s para análise (agregando todas as páginas)
  const {
    data: bosData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["registerBos", "all"],
    queryFn: () => getAllBos("", "all"),
    staleTime: 300000,
  });

  const allTypes = useMemo(() => {
    if (!bosData?.data) return [] as string[];
    return Array.from(
      new Set(
        bosData.data.map(
          (bo: RegisterBo) => bo.type_of_occurrence || "Não especificado",
        ),
      ),
    ).filter(Boolean);
  }, [bosData]);

  const allYears = useMemo(() => {
    if (!bosData?.data) return ["all"];
    const setYears = new Set<string>(["all"]);
    bosData.data.forEach((bo: RegisterBo) => {
      const year = new Date(bo.createdAt).getFullYear();
      setYears.add(String(year));
    });
    return Array.from(setYears).sort((a, b) =>
      a === "all" ? -1 : Number(a) - Number(b),
    );
  }, [bosData]);

  // Processar dados para gráficos
  const processedData = useMemo(() => {
    if (!bosData?.data) return null;

    const bos: RegisterBo[] = bosData.data;
    const now = new Date();

    // Filtrar por período, datas, horário e tipo
    const filteredBos = bos.filter((bo) => {
      const boCreatedDate = new Date(bo.createdAt);
      const boEventDate = bo.date_and_time_of_event
        ? new Date(bo.date_and_time_of_event)
        : boCreatedDate;

      const diffTime = now.getTime() - boCreatedDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const inPeriod = (() => {
        switch (period) {
          case "week":
            return diffDays <= 7;
          case "month":
            return diffDays <= 30;
          case "quarter":
            return diffDays <= 90;
          case "year":
            return diffDays <= 365;
          default:
            return true;
        }
      })();

      if (!inPeriod) return false;

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);
        if (boEventDate < start) return false;
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`);
        if (boEventDate > end) return false;
      }

      const minutesOf = (time: string) => {
        const [h, m] = time.split(":").map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        return h * 60 + m;
      };

      const eventMinutes =
        boEventDate.getHours() * 60 + boEventDate.getMinutes();
      if (startTime) {
        const min = minutesOf(startTime);
        if (min !== null && eventMinutes < min) return false;
      }
      if (endTime) {
        const max = minutesOf(endTime);
        if (max !== null && eventMinutes > max) return false;
      }

      if (selectedTypes.length > 0) {
        const type = bo.type_of_occurrence || "Não especificado";
        if (!selectedTypes.includes(type)) return false;
      }

      return true;
    });

    // Dados mensais (por ano selecionado ou todos anos)
    const monthlyStats = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(now.getFullYear(), i, 1);
      const monthName = month.toLocaleDateString("pt-BR", { month: "short" });
      const count = filteredBos.filter((bo) => {
        const boDate = new Date(bo.createdAt);
        const matchesMonth = boDate.getMonth() === i;
        if (!matchesMonth) return false;

        if (chartYear === "all") return true;
        return boDate.getFullYear() === Number(chartYear);
      }).length;
      return { month: monthName, total: count };
    });

    // Dados por tipo
    const typeStats = filteredBos.reduce(
      (acc, bo) => {
        const type = bo.type_of_occurrence || "Não especificado";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const typeData = Object.entries(typeStats)
      .map(([name, value], index) => ({
        name,
        value,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    // Tendência semanal
    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    const dailyStats = weekDays.map((day, index) => {
      const count = filteredBos.filter((bo) => {
        const boDate = new Date(bo.createdAt);
        return boDate.getDay() === index;
      }).length;
      return { day, occurrences: count };
    });

    // Dados por horário
    const hourlyStats = Array.from({ length: 24 }, (_, hour) => {
      const count = filteredBos.filter((bo) => {
        const boDate = new Date(bo.date_and_time_of_event || bo.createdAt);
        return boDate.getHours() === hour;
      }).length;
      return { hour: `${hour}h`, count };
    });

    // Top localizações
    const locationStats = filteredBos.reduce(
      (acc, bo) => {
        const location = bo.place_of_the_fact || "Não especificado";
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topLocations = Object.entries(locationStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Estatísticas gerais
    const totalBos = filteredBos.length;
    const thisMonth = filteredBos.filter((bo) => {
      const boDate = new Date(bo.createdAt);
      return (
        boDate.getMonth() === now.getMonth() &&
        boDate.getFullYear() === now.getFullYear()
      );
    }).length;

    const lastYearToDate = filteredBos.filter((bo) => {
      const boDate = new Date(bo.createdAt);
      const sameDayLastYear =
        boDate.getFullYear() === now.getFullYear() - 1 &&
        (boDate.getMonth() < now.getMonth() ||
          (boDate.getMonth() === now.getMonth() &&
            boDate.getDate() <= now.getDate()));
      return sameDayLastYear;
    }).length;

    const thisYearToDate = filteredBos.filter((bo) => {
      const boDate = new Date(bo.createdAt);
      return (
        boDate.getFullYear() === now.getFullYear() &&
        (boDate.getMonth() < now.getMonth() ||
          (boDate.getMonth() === now.getMonth() &&
            boDate.getDate() <= now.getDate()))
      );
    }).length;

    const growth =
      lastYearToDate > 0
        ? ((thisYearToDate - lastYearToDate) / lastYearToDate) * 100
        : 0;

    return {
      monthlyData: monthlyStats,
      typeData,
      dailyTrendData: dailyStats,
      hourlyData: hourlyStats,
      topLocations,
      stats: {
        total: totalBos,
        thisMonth,
        thisYearToDate,
        lastYearToDate,
        growth: growth.toFixed(1),
        completed: Math.floor(totalBos * 0.75), // Simulando 75% de conclusão
      },
    };
  }, [
    bosData,
    period,
    startDate,
    endDate,
    startTime,
    endTime,
    selectedTypes,
    chartYear,
  ]);

  const handleExportPdf = () => {
    toast.success("Funcionalidade de exportação será implementada em breve!");
  };

  const clearFilters = () => {
    setPeriod("all");
    setStartDate("");
    setEndDate("");
    setStartTime("");
    setEndTime("");
    setSelectedTypes([]);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-piaui-yellow" />
              <h1 className="text-xl font-semibold text-gray-800">
                Relatórios
              </h1>
            </div>
            <div className="ml-auto">
              <NetworkStatusIndicator />
            </div>
          </header>

          <div className="flex-1 space-y-6 p-4 pt-6">
            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Configurações do Relatório
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Semana</SelectItem>
                      <SelectItem value="month">Mês</SelectItem>
                      <SelectItem value="quarter">Trimestre</SelectItem>
                      <SelectItem value="year">Ano</SelectItem>
                      <SelectItem value="all">Geral</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* <Select value={chartYear} onValueChange={setChartYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {allYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year === "all" ? "Todos os anos" : year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select> */}

                  <Button
                    className="bg-piaui-blue hover:bg-piaui-blue/90 text-white"
                    onClick={clearFilters}
                  >
                    Limpar filtros
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-2">
                  <label className="flex flex-col text-sm text-gray-700">
                    Data Início
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 rounded-md border border-gray-300 px-2 py-2"
                    />
                  </label>

                  <label className="flex flex-col text-sm text-gray-700">
                    Data Fim
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 rounded-md border border-gray-300 px-2 py-2"
                    />
                  </label>

                  <label className="flex flex-col text-sm text-gray-700">
                    Horário Início
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1 rounded-md border border-gray-300 px-2 py-2"
                    />
                  </label>

                  <label className="flex flex-col text-sm text-gray-700">
                    Horário Fim
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-1 rounded-md border border-gray-300 px-2 py-2"
                    />
                  </label>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-600">
                      Filtrar por Tipo
                    </p>
                    <button
                      onClick={() => setSelectedTypes([])}
                      className="text-xs font-semibold text-piaui-blue hover:text-piaui-blue/80 mr-1"
                      type="button"
                    >
                      Limpar tipos
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 max-h-44 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-white">
                    {allTypes.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        Sem tipos disponíveis
                      </p>
                    ) : (
                      allTypes.map((type) => {
                        const isActive = selectedTypes.includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setSelectedTypes((prev) =>
                                prev.includes(type)
                                  ? prev.filter((t) => t !== type)
                                  : [...prev, type],
                              );
                            }}
                            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                              isActive
                                ? "bg-piaui-blue text-white border-piaui-blue"
                                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {selectedTypes.length > 0 && (
                    <div className="mt-3 text-xs text-gray-500">
                      {selectedTypes.length} tipo(s) selecionado(s)
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cards de Estatísticas */}
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-piaui-blue" />
              </div>
            ) : error ? (
              <div className="text-red-500 text-center">
                Erro ao carregar os dados dos relatórios.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Total de B.O.s
                        </p>
                        <p className="text-2xl font-bold text-piaui-blue">
                          {processedData?.stats.total || 0}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-piaui-blue" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Este Mês -{" "}
                          {new Date()
                            .toLocaleDateString("pt-BR", { month: "long" })
                            .toUpperCase()}
                        </p>
                        <p className="text-2xl font-bold text-piaui-green">
                          {processedData?.stats.thisMonth || 0}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-piaui-green" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Crescimento (YTD vs ano anterior)
                        </p>
                        <p
                          className={`text-2xl font-bold ${
                            parseFloat(processedData?.stats.growth || "0") >= 0
                              ? "text-piaui-yellow"
                              : "text-red-500"
                          }`}
                        >
                          {parseFloat(processedData?.stats.growth || "0") >= 0
                            ? "+"
                            : ""}
                          {processedData?.stats.growth || "0"}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {processedData?.stats.thisYearToDate || 0} em{" "}
                          {new Date().getFullYear()},{" "}
                          {processedData?.stats.lastYearToDate || 0} em{" "}
                          {new Date().getFullYear() - 1}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-piaui-yellow" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Gráficos */}
            {processedData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Barras - Mensal */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-piaui-blue" />
                      B.O.s por Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MonthlyBosBarChart data={processedData.monthlyData} />
                  </CardContent>
                </Card>

                {/* Gráfico de Pizza - Por Tipo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-piaui-green" />
                      Distribuição por Tipo
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <TypeDistributionPieChart data={processedData.typeData} />
                  </CardContent>
                </Card>

                {/* Gráfico de Linha - Tendência Semanal */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-piaui-yellow" />
                      Tendência Semanal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WeeklyTrendLineChart data={processedData.dailyTrendData} />
                  </CardContent>
                </Card>

                {/* Novo Gráfico - Distribuição por Horário */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-purple-600" />
                      Ocorrências por Horário
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HourlyOccurrencesAreaChart data={processedData.hourlyData} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabela de Resumo */}
            {processedData && (
              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Resumo por Tipo de Ocorrência</span>
                    <span className="text-sm text-gray-500 font-normal">
                      Total:{" "}
                      {processedData.typeData.reduce(
                        (acc, curr) => acc + curr.value,
                        0,
                      )}
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  {processedData.typeData.length > 0 && (
                    <TypeSummaryBarChart data={processedData.typeData} />
                  )}
                  <div className="space-y-4">
                    {processedData.typeData.length > 0 ? (
                      processedData.typeData.map((item, index) => {
                        const total = processedData.typeData.reduce(
                          (acc, curr) => acc + curr.value,
                          0,
                        );
                        const percent = ((item.value / total) * 100).toFixed(1);

                        return (
                          <div
                            key={index}
                            className="p-4 rounded-xl bg-white border hover:shadow-md transition-all"
                          >
                            {/* Linha principal */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                {/* ranking */}
                                <span className="text-sm font-semibold text-gray-400 w-6">
                                  #{index + 1}
                                </span>

                                {/* bolinha */}
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                />

                                {/* nome */}
                                <span className="font-medium text-gray-700">
                                  {item.name}
                                </span>
                              </div>

                              {/* valores */}
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-gray-900">
                                  {item.value}
                                </span>

                                <span className="text-sm text-gray-500">
                                  {percent}%
                                </span>
                              </div>
                            </div>

                            {/* barra visual */}
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${percent}%`,
                                  backgroundColor: item.color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        Nenhum dado disponível para o período selecionado
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
