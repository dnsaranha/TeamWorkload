import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Gauge,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  BarChart2,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  format,
  parseISO,
  differenceInCalendarDays,
  addDays,
  isBefore,
  isAfter,
  startOfDay,
  min as minDate,
  max as maxDate,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { Task, Project, Employee } from "@/lib/supabaseClient";

interface BurndownBurnupViewProps {
  tasks: Task[];
  projects: Project[];
  employees: Employee[];
  selectedProjectId: string;
  selectedEmployeeId: string;
  onProjectChange: (id: string) => void;
  onEmployeeChange: (id: string) => void;
  dateRange?: { from?: Date; to?: Date };
}

export const BurndownBurnupView: React.FC<BurndownBurnupViewProps> = ({
  tasks,
  projects,
  employees,
  selectedProjectId,
  selectedEmployeeId,
  onProjectChange,
  onEmployeeChange,
  dateRange,
}) => {
  const [metricType, setMetricType] = useState<"hours" | "tasks">("hours");
  const [showExplanation, setShowExplanation] = useState(false);

  // Filter tasks based on selected project, employee and date range
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchProject =
        selectedProjectId === "all" || task.project_id === selectedProjectId;
      const matchEmployee =
        selectedEmployeeId === "all" ||
        task.assigned_employee_id === selectedEmployeeId;

      if (!matchProject || !matchEmployee) return false;

      if (dateRange?.from) {
        try {
          const taskStart = parseISO(task.start_date);
          const taskEnd = parseISO(task.end_date);
          const from = startOfDay(dateRange.from);
          const to = dateRange.to ? startOfDay(dateRange.to) : from;

          // Check overlap
          if (taskEnd < from || taskStart > to) {
            return false;
          }
        } catch {
          return true;
        }
      }

      return true;
    });
  }, [tasks, selectedProjectId, selectedEmployeeId, dateRange]);

  // Determine timeline boundary dates
  const timelineBounds = useMemo(() => {
    if (filteredTasks.length === 0) {
      const today = startOfDay(new Date());
      return {
        startDate: dateRange?.from ? startOfDay(dateRange.from) : today,
        endDate: dateRange?.to ? startOfDay(dateRange.to) : addDays(today, 14),
        totalDays: 15,
      };
    }

    const startDates: Date[] = [];
    const endDates: Date[] = [];

    filteredTasks.forEach((t) => {
      try {
        startDates.push(parseISO(t.start_date));
        endDates.push(parseISO(t.end_date));
      } catch {}
    });

    let earliest = startDates.length > 0 ? minDate(startDates) : new Date();
    let latest = endDates.length > 0 ? maxDate(endDates) : addDays(new Date(), 14);

    if (dateRange?.from) {
      earliest = minDate([earliest, startOfDay(dateRange.from)]);
    }
    if (dateRange?.to) {
      latest = maxDate([latest, startOfDay(dateRange.to)]);
    }

    // Ensure minimum span of 3 days
    if (differenceInCalendarDays(latest, earliest) < 3) {
      latest = addDays(earliest, 7);
    }

    const totalDays = Math.max(1, differenceInCalendarDays(latest, earliest) + 1);

    return {
      startDate: startOfDay(earliest),
      endDate: startOfDay(latest),
      totalDays,
    };
  }, [filteredTasks, dateRange]);

  // Today reference
  const today = useMemo(() => startOfDay(new Date()), []);

  // Compute EV, PV, AC and SPI metrics
  const spiMetrics = useMemo(() => {
    let totalScopeHours = 0;
    let totalScopeTasks = filteredTasks.length;
    let plannedValueHours = 0; // PV: Planned Value
    let plannedValueTasks = 0;
    let earnedValueHours = 0; // EV: Earned Value
    let earnedValueTasks = 0;
    let actualCostHours = 0; // AC: Actual Cost
    let completedHours = 0;
    let completedTasks = 0;

    filteredTasks.forEach((task) => {
      const estHours = Number(task.estimated_time) || 0;
      const actHours = Number(task.actual_time) || 0;
      totalScopeHours += estHours;
      actualCostHours += actHours;

      let taskStart = today;
      let taskEnd = today;
      try {
        taskStart = parseISO(task.start_date);
        taskEnd = parseISO(task.end_date);
      } catch {}

      // Calculate Planned Value (PV) up to today
      if (isBefore(taskEnd, today) || isSameDay(taskEnd, today)) {
        // Task should be 100% completed by today
        plannedValueHours += estHours;
        plannedValueTasks += 1;
      } else if (isBefore(taskStart, today)) {
        // Task is in progress according to schedule: proportional PV
        const totalDuration = Math.max(1, differenceInCalendarDays(taskEnd, taskStart) + 1);
        const elapsed = Math.max(0, differenceInCalendarDays(today, taskStart));
        const ratio = Math.min(1, elapsed / totalDuration);
        plannedValueHours += estHours * ratio;
        plannedValueTasks += ratio;
      } else {
        // Task starts in future
        plannedValueHours += 0;
      }

      // Calculate Earned Value (EV)
      if (task.status === "completed") {
        earnedValueHours += estHours;
        earnedValueTasks += 1;
        completedHours += estHours;
        completedTasks += 1;
      } else if (task.status === "in_progress") {
        // 50% credit or based on actual progress
        const partialCredit = 0.5;
        earnedValueHours += estHours * partialCredit;
        earnedValueTasks += partialCredit;
      }
    });

    // Schedule Performance Index (SPI = EV / PV)
    let spi = 1.0;
    if (plannedValueHours > 0) {
      spi = earnedValueHours / plannedValueHours;
    } else if (earnedValueHours > 0) {
      spi = 1.5; // Ahead of schedule if work earned before planned start
    } else {
      spi = 1.0; // Baseline
    }

    // Task-based SPI
    let spiTasks = 1.0;
    if (plannedValueTasks > 0) {
      spiTasks = earnedValueTasks / plannedValueTasks;
    } else if (earnedValueTasks > 0) {
      spiTasks = 1.5;
    }

    // Schedule Variance (SV = EV - PV)
    const svHours = Number((earnedValueHours - plannedValueHours).toFixed(1));
    const svTasks = Number((earnedValueTasks - plannedValueTasks).toFixed(1));

    // Cost Performance Index (CPI = EV / AC)
    let cpi = 1.0;
    if (actualCostHours > 0) {
      cpi = Number((earnedValueHours / actualCostHours).toFixed(2));
    }

    const remainingHours = Math.max(0, Number((totalScopeHours - completedHours).toFixed(1)));
    const remainingTasks = Math.max(0, totalScopeTasks - completedTasks);

    return {
      totalScopeHours: Number(totalScopeHours.toFixed(1)),
      totalScopeTasks,
      plannedValueHours: Number(plannedValueHours.toFixed(1)),
      plannedValueTasks: Number(plannedValueTasks.toFixed(1)),
      earnedValueHours: Number(earnedValueHours.toFixed(1)),
      earnedValueTasks: Number(earnedValueTasks.toFixed(1)),
      actualCostHours: Number(actualCostHours.toFixed(1)),
      completedHours: Number(completedHours.toFixed(1)),
      completedTasks,
      remainingHours,
      remainingTasks,
      spi: Number(spi.toFixed(2)),
      spiTasks: Number(spiTasks.toFixed(2)),
      svHours,
      svTasks,
      cpi,
    };
  }, [filteredTasks, today]);

  // Generate Daily Burndown and Burnup Data Points
  const chartData = useMemo(() => {
    const points: {
      dateStr: string;
      formattedDate: string;
      dayIndex: number;
      isPastOrToday: boolean;
      // Burndown
      idealRemaining: number;
      actualRemaining: number | null;
      projectedRemaining: number | null;
      // Burnup
      totalScope: number;
      plannedCumulative: number;
      actualCompleted: number | null;
      projectedCompleted: number | null;
    }[] = [];

    const { startDate, totalDays } = timelineBounds;
    const isHours = metricType === "hours";
    const totalScope = isHours ? spiMetrics.totalScopeHours : spiMetrics.totalScopeTasks;

    if (totalScope === 0 || totalDays === 0) {
      return points;
    }

    // Daily step for ideal burndown
    const idealStep = totalScope / Math.max(1, totalDays - 1);

    for (let i = 0; i < totalDays; i++) {
      const currentDate = addDays(startDate, i);
      const isPastOrToday = isBefore(currentDate, today) || isSameDay(currentDate, today);
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const formattedDate = format(currentDate, "dd/MM", { locale: ptBR });

      // 1. Ideal Burndown (Linear decrease from totalScope to 0)
      const idealRemaining = Math.max(0, Number((totalScope - i * idealStep).toFixed(1)));

      // 2. Planned Value cumulative up to currentDate
      let plannedCum = 0;
      filteredTasks.forEach((t) => {
        const val = isHours ? Number(t.estimated_time) || 0 : 1;
        try {
          const tEnd = parseISO(t.end_date);
          const tStart = parseISO(t.start_date);

          if (isBefore(tEnd, currentDate) || isSameDay(tEnd, currentDate)) {
            plannedCum += val;
          } else if (isBefore(tStart, currentDate)) {
            const span = Math.max(1, differenceInCalendarDays(tEnd, tStart) + 1);
            const passed = Math.max(0, differenceInCalendarDays(currentDate, tStart));
            plannedCum += val * Math.min(1, passed / span);
          }
        } catch {}
      });

      // 3. Actual Completed cumulative up to currentDate
      let actualComp: number | null = null;
      let actualRem: number | null = null;

      if (isPastOrToday) {
        let compToDate = 0;
        filteredTasks.forEach((t) => {
          const val = isHours ? Number(t.estimated_time) || 0 : 1;
          if (t.status === "completed") {
            try {
              const compDate = parseISO(t.end_date);
              // If completed and end_date is before or on this day
              if (isBefore(compDate, currentDate) || isSameDay(compDate, currentDate)) {
                compToDate += val;
              } else if (isPastOrToday && isSameDay(currentDate, today)) {
                // If it's today and completed, count it
                compToDate += val;
              }
            } catch {
              compToDate += val;
            }
          }
        });

        actualComp = Number(compToDate.toFixed(1));
        actualRem = Math.max(0, Number((totalScope - compToDate).toFixed(1)));
      }

      // 4. Projections for future days based on current SPI
      let projectedRem: number | null = null;
      let projectedComp: number | null = null;

      if (!isPastOrToday) {
        // Days ahead of today
        const daysFromToday = differenceInCalendarDays(currentDate, today);
        const dailyCurrentVelocity =
          today > startDate
            ? (isHours ? spiMetrics.completedHours : spiMetrics.completedTasks) /
              Math.max(1, differenceInCalendarDays(today, startDate))
            : idealStep;

        const projectedDelivery = (actualComp ?? (isHours ? spiMetrics.completedHours : spiMetrics.completedTasks)) + dailyCurrentVelocity * daysFromToday;

        projectedComp = Math.min(totalScope, Number(projectedDelivery.toFixed(1)));
        projectedRem = Math.max(0, Number((totalScope - projectedDelivery).toFixed(1)));
      } else if (isSameDay(currentDate, today)) {
        projectedRem = actualRem;
        projectedComp = actualComp;
      }

      points.push({
        dateStr,
        formattedDate,
        dayIndex: i,
        isPastOrToday,
        idealRemaining,
        actualRemaining: actualRem,
        projectedRemaining: projectedRem,
        totalScope,
        plannedCumulative: Math.min(totalScope, Number(plannedCum.toFixed(1))),
        actualCompleted: actualComp,
        projectedCompleted: projectedComp,
      });
    }

    return points;
  }, [timelineBounds, metricType, spiMetrics, filteredTasks, today]);

  // SPI Status info helper
  const activeSpi = metricType === "hours" ? spiMetrics.spi : spiMetrics.spiTasks;
  const spiStatus = useMemo(() => {
    if (activeSpi >= 1.05) {
      return {
        label: "Adiantado",
        color: "text-emerald-600 dark:text-emerald-400",
        badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        icon: TrendingUp,
        description: `Entregando ${Math.round((activeSpi - 1) * 100)}% acima do planejado. Ritmo acelerado!`,
        advice: "O cronograma está com folga positiva. Mantenha o ritmo atual para entregar antes do prazo.",
      };
    } else if (activeSpi >= 0.95) {
      return {
        label: "No Prazo",
        color: "text-blue-600 dark:text-blue-400",
        badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
        icon: CheckCircle2,
        description: "Ritmo perfeitamente alinhado com o cronograma planejado (100% de aderência).",
        advice: "Excelente sincronia entre esforço realizado e prazos estabelecidos.",
      };
    } else {
      return {
        label: "Atrasado / Atenção",
        color: "text-rose-600 dark:text-rose-400",
        badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
        icon: TrendingDown,
        description: `Entregando ${Math.round((1 - activeSpi) * 100)}% abaixo do planejado.`,
        advice: "Atenção necessária: o ritmo atual exigirá ajuste de escopo ou aumento de capacidade para não comprometer a entrega final.",
      };
    }
  }, [activeSpi]);

  const StatusIcon = spiStatus.icon;

  return (
    <div className="space-y-6">
      {/* 1. TOP FILTER & CONTROL BAR */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left Filter Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Filtros:</span>
          </div>

          {/* Project Selector */}
          <div className="w-48 sm:w-56">
            <Select value={selectedProjectId} onValueChange={onProjectChange}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Todos os Projetos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Projetos</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Collaborator Selector */}
          <div className="w-44 sm:w-52">
            <Select value={selectedEmployeeId} onValueChange={onEmployeeChange}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Todos os Colaboradores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Colaboradores</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Metric Toggle & Didactic Help */}
        <div className="flex items-center justify-between lg:justify-end gap-2">
          {/* Unit Toggle */}
          <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5 text-xs">
            <button
              onClick={() => setMetricType("hours")}
              className={`px-3 py-1 font-medium rounded-md transition-all ${
                metricType === "hours"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Em Horas (h)
            </button>
            <button
              onClick={() => setMetricType("tasks")}
              className={`px-3 py-1 font-medium rounded-md transition-all ${
                metricType === "tasks"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Por Tarefas (#)
            </button>
          </div>

          {/* Teacher Explanation Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExplanation(!showExplanation)}
            className="h-8 text-xs gap-1.5 border-dashed"
          >
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span>{showExplanation ? "Ocultar Guia" : "Didática & Fórmulas"}</span>
          </Button>
        </div>
      </div>

      {/* 2. DIDACTIC PROFESSOR GUIDE (Expandable) */}
      {showExplanation && (
        <Card className="border-primary/30 bg-primary/5 shadow-xs transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Guia Prático e Objetivo do Professor
            </CardTitle>
            <CardDescription className="text-xs">
              Como interpretar os indicadores ágeis de forma simples, clara e matemática:
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-background/80 p-3 rounded-lg border border-border/60 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <Gauge className="h-4 w-4" />
                <span>SPI (Índice de Desempenho de Prazo)</span>
              </div>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Fórmula:</strong>{" "}
                <code className="bg-muted px-1 py-0.5 rounded font-mono">SPI = EV / PV</code>
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong className="text-emerald-600 dark:text-emerald-400">SPI &gt; 1.0:</strong> Adiantado (entregando mais rápido que o previsto).</li>
                <li>• <strong className="text-blue-600 dark:text-blue-400">SPI = 1.0:</strong> Rigorosamente em dia.</li>
                <li>• <strong className="text-rose-600 dark:text-rose-400">SPI &lt; 1.0:</strong> Atrasado (entregando abaixo da velocidade esperada).</li>
              </ul>
            </div>

            <div className="bg-background/80 p-3 rounded-lg border border-border/60 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                <Flame className="h-4 w-4" />
                <span>Gráfico Burndown (Queima)</span>
              </div>
              <p className="text-muted-foreground">
                Mostra o <strong className="text-foreground">trabalho restante</strong> que ainda falta entregar até o fim do projeto.
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <span className="font-semibold text-foreground">Linha Ideal:</span> A meta reta decrescente de queima constante.</li>
                <li>• <span className="font-semibold text-foreground">Abaixo da Linha:</span> A equipe está adiantada!</li>
                <li>• <span className="font-semibold text-foreground">Acima da Linha:</span> Restam mais horas do que o planejado.</li>
              </ul>
            </div>

            <div className="bg-background/80 p-3 rounded-lg border border-border/60 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                <span>Gráfico Burnup (Acúmulo)</span>
              </div>
              <p className="text-muted-foreground">
                Mostra o <strong className="text-foreground">escopo total</strong> vs o <strong className="text-foreground">trabalho entregue</strong> subindo ao longo do tempo.
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• O projeto termina quando a linha verde de entregas encosta na linha do topo de escopo total.</li>
                <li>• Detecta instantaneamente se o escopo do projeto aumentou.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. KEY METRIC SCORECARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* SPI Main Card */}
        <Card className="border-border shadow-xs bg-card relative overflow-hidden">
          <div className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">SPI (Índice de Prazo)</span>
              <Badge variant="outline" className={`text-[10px] font-bold ${spiStatus.badgeBg}`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {spiStatus.label}
              </Badge>
            </div>

            <div className="my-2 flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold tracking-tight ${spiStatus.color}`}>
                {activeSpi.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                (Meta: 1.00)
              </span>
            </div>

            {/* Visual Gauge Bar */}
            <div className="space-y-1">
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
                <div
                  className={`h-full transition-all ${
                    activeSpi >= 1.0
                      ? "bg-emerald-500"
                      : activeSpi >= 0.85
                      ? "bg-blue-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, (activeSpi / 1.5) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground truncate" title={spiStatus.description}>
                {spiStatus.description}
              </p>
            </div>
          </div>
        </Card>

        {/* Earned Value (EV) Card */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">EV (Valor Agregado)</span>
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>

            <div className="my-2">
              <div className="text-2xl font-bold text-foreground">
                {metricType === "hours"
                  ? `${spiMetrics.earnedValueHours}h`
                  : `${spiMetrics.earnedValueTasks} tarefas`}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Trabalho entregue concluído
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                <span>Progresso do Escopo</span>
                <span>
                  {spiMetrics.totalScopeHours > 0
                    ? Math.round((spiMetrics.earnedValueHours / spiMetrics.totalScopeHours) * 100)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  spiMetrics.totalScopeHours > 0
                    ? (spiMetrics.earnedValueHours / spiMetrics.totalScopeHours) * 100
                    : 0
                }
                className="h-1.5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Planned Value (PV) Card */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">PV (Valor Planejado)</span>
              <div className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Calendar className="h-4 w-4" />
              </div>
            </div>

            <div className="my-2">
              <div className="text-2xl font-bold text-foreground">
                {metricType === "hours"
                  ? `${spiMetrics.plannedValueHours}h`
                  : `${spiMetrics.plannedValueTasks} tarefas`}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Meta planejada até hoje
              </p>
            </div>

            <div className="text-[11px] flex items-center justify-between pt-1 border-t border-border/50 text-muted-foreground">
              <span>Variação de Prazo (SV):</span>
              <span
                className={`font-bold font-mono ${
                  spiMetrics.svHours >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {spiMetrics.svHours >= 0 ? `+${spiMetrics.svHours}h` : `${spiMetrics.svHours}h`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Scope & Remaining Card */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Escopo & Restante</span>
              <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Flame className="h-4 w-4" />
              </div>
            </div>

            <div className="my-2">
              <div className="text-2xl font-bold text-foreground">
                {metricType === "hours"
                  ? `${spiMetrics.remainingHours}h`
                  : `${spiMetrics.remainingTasks} tarefas`}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Horas restantes a queimar
              </p>
            </div>

            <div className="text-[11px] flex items-center justify-between pt-1 border-t border-border/50 text-muted-foreground">
              <span>Escopo Total:</span>
              <span className="font-bold text-foreground">
                {metricType === "hours"
                  ? `${spiMetrics.totalScopeHours}h (${spiMetrics.totalScopeTasks} tarefas)`
                  : `${spiMetrics.totalScopeTasks} tarefas (${spiMetrics.totalScopeHours}h)`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. BURNDOWN & BURNUP CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BURNDOWN CHART */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Flame className="h-5 w-5 text-amber-500" />
                Gráfico Burndown (Trabalho Restante)
              </CardTitle>
              <CardDescription className="text-xs">
                Acompanhe a queima de horas restantes até o prazo final.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] bg-muted/50 font-mono">
              Meta: Chegar a 0h
            </Badge>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" vertical={false} />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 10 }}
                    stroke="#888888"
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#888888"
                    unit={metricType === "hours" ? "h" : ""}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-popover text-popover-foreground p-2.5 rounded-lg border border-border shadow-md text-xs space-y-1">
                          <p className="font-bold border-b border-border/60 pb-1 flex items-center justify-between gap-3">
                            <span>Data: {label}</span>
                          </p>
                          {payload.map((entry: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-4 text-[11px]"
                            >
                              <span style={{ color: entry.color }} className="flex items-center gap-1.5 font-medium">
                                <span
                                  className="w-2 h-2 rounded-full inline-block"
                                  style={{ backgroundColor: entry.color }}
                                />
                                {entry.name}:
                              </span>
                              <span className="font-bold font-mono">
                                {entry.value !== null ? `${entry.value}${metricType === "hours" ? "h" : ""}` : "-"}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: "11px" }}
                  />

                  {/* Reference Line for Today */}
                  <ReferenceLine
                    x={format(today, "dd/MM", { locale: ptBR })}
                    stroke="#3b82f6"
                    strokeDasharray="3 3"
                    label={{
                      value: "Hoje",
                      position: "top",
                      fill: "#3b82f6",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />

                  {/* 1. Ideal Burndown (Linear Target) */}
                  <Line
                    type="monotone"
                    dataKey="idealRemaining"
                    name="Linha Ideal (Meta)"
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={false}
                  />

                  {/* 2. Actual Burndown (Completed so far) */}
                  <Line
                    type="monotone"
                    dataKey="actualRemaining"
                    name="Restante Real"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#f59e0b" }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />

                  {/* 3. Projected Burndown (Forecast based on SPI) */}
                  <Line
                    type="monotone"
                    dataKey="projectedRemaining"
                    name="Projeção (Ritmo Atual)"
                    stroke="#a855f7"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Chart Key / Explanation Footer */}
            <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>Linha Real <strong>abaixo</strong> da Ideal = Adiantado</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                <span>Projeção calcula a data de término com o SPI atual</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* BURNUP CHART */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Gráfico Burnup (Escopo vs Entregas)
              </CardTitle>
              <CardDescription className="text-xs">
                Visualize o trabalho concluído subindo em direção ao teto de escopo.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] bg-muted/50 font-mono">
              Meta: Tocar o Escopo
            </Badge>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" vertical={false} />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 10 }}
                    stroke="#888888"
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#888888"
                    unit={metricType === "hours" ? "h" : ""}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-popover text-popover-foreground p-2.5 rounded-lg border border-border shadow-md text-xs space-y-1">
                          <p className="font-bold border-b border-border/60 pb-1 flex items-center justify-between gap-3">
                            <span>Data: {label}</span>
                          </p>
                          {payload.map((entry: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-4 text-[11px]"
                            >
                              <span style={{ color: entry.color }} className="flex items-center gap-1.5 font-medium">
                                <span
                                  className="w-2 h-2 rounded-full inline-block"
                                  style={{ backgroundColor: entry.color }}
                                />
                                {entry.name}:
                              </span>
                              <span className="font-bold font-mono">
                                {entry.value !== null ? `${entry.value}${metricType === "hours" ? "h" : ""}` : "-"}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: "11px" }}
                  />

                  {/* Reference Line for Today */}
                  <ReferenceLine
                    x={format(today, "dd/MM", { locale: ptBR })}
                    stroke="#3b82f6"
                    strokeDasharray="3 3"
                    label={{
                      value: "Hoje",
                      position: "top",
                      fill: "#3b82f6",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />

                  {/* 1. Total Scope Ceiling */}
                  <Line
                    type="stepAfter"
                    dataKey="totalScope"
                    name="Escopo Total"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />

                  {/* 2. Planned Cumulative (PV Curve) */}
                  <Line
                    type="monotone"
                    dataKey="plannedCumulative"
                    name="Planejado (PV)"
                    stroke="#3b82f6"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                  />

                  {/* 3. Actual Completed (EV Curve) */}
                  <Area
                    type="monotone"
                    dataKey="actualCompleted"
                    name="Entregue Real (EV)"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="#10b981"
                    fillOpacity={0.15}
                    dot={{ r: 3, fill: "#10b981" }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />

                  {/* 4. Projected Completed */}
                  <Line
                    type="monotone"
                    dataKey="projectedCompleted"
                    name="Projeção Entregas"
                    stroke="#a855f7"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Chart Key / Explanation Footer */}
            <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Entregue Real deve alcançar o Escopo Total</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                <span>Degraus na linha vermelha indicam aumento de escopo</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. DETAILED TASK CONTRIBUTION TABLE */}
      <Card className="border-border shadow-xs bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Layers className="h-5 w-5 text-primary" />
                Detalhamento de Tarefas e Impacto no Cronograma (SPI)
              </CardTitle>
              <CardDescription className="text-xs">
                {filteredTasks.length} tarefa(s) analisada(s) com base nos filtros selecionados.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                {filteredTasks.filter((t) => t.status === "completed").length} Concluídas
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                {filteredTasks.filter((t) => t.status === "in_progress").length} Em Andamento
              </Badge>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                {filteredTasks.filter((t) => t.status === "pending").length} Pendentes
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto border border-border/60 rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border/60">
                <tr>
                  <th className="px-3 py-2.5">Tarefa</th>
                  <th className="px-3 py-2.5">Projeto</th>
                  <th className="px-3 py-2.5">Responsável</th>
                  <th className="px-3 py-2.5">Início / Término</th>
                  <th className="px-3 py-2.5 text-right">Esforço (Est.)</th>
                  <th className="px-3 py-2.5 text-right">Realizado</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Impacto SPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      Nenhuma tarefa encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const project = projects.find((p) => p.id === task.project_id);
                    const employee = employees.find((e) => e.id === task.assigned_employee_id);
                    const isCompleted = task.status === "completed";
                    const isInProgress = task.status === "in_progress";

                    let taskEnd = today;
                    try {
                      taskEnd = parseISO(task.end_date);
                    } catch {}

                    const isOverdue = !isCompleted && isBefore(taskEnd, today);

                    return (
                      <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-foreground max-w-xs truncate" title={task.name}>
                          {task.name}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[120px]">
                          {project?.name || "Geral"}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[120px]">
                          {employee?.name || "Não atribuído"}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                          {task.start_date} <ArrowRight className="inline h-3 w-3 text-muted-foreground/60" /> {task.end_date}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground">
                          {task.estimated_time || 0}h
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {task.actual_time || 0}h
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {isCompleted ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0">
                              Concluída
                            </Badge>
                          ) : isInProgress ? (
                            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] py-0">
                              Em Andamento
                            </Badge>
                          ) : isOverdue ? (
                            <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] py-0">
                              Atrasada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0">
                              Pendente
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>+EV Agregado</span>
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>Pendente no PV</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              No cronograma
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BurndownBurnupView;
