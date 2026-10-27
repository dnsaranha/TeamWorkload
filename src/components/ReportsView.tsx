import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Search,
  Calendar as CalendarIcon,
  BarChart3,
  FolderOpen,
  ListTodo,
  Layers,
  AlertTriangle,
  FileSpreadsheet,
  Scale,
  Hourglass,
  ArrowUpDown,
  Check,
  Flame,
  Filter,
  X,
} from "lucide-react";
import {
  projectService,
  taskService,
  employeeService,
  timeEntryService,
  type Project,
  type Task,
  type Employee,
  type TimeEntry,
} from "@/lib/supabaseClient";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { DatePickerWithRange } from "./ui/date-picker-with-range";
import { DateRange } from "react-day-picker";
import WorkloadSummary from "./WorkloadSummary";
import { BurndownBurnupView } from "./BurndownBurnupView";

export const ReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"burndown" | "comparison" | "overview" | "workload" | "timeline">("burndown");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [taskTrackedHours, setTaskTrackedHours] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    loadData();

    const handleTimeEntriesUpdated = () => {
      loadData();
    };
    window.addEventListener("time_entries_updated", handleTimeEntriesUpdated);
    return () => {
      window.removeEventListener("time_entries_updated", handleTimeEntriesUpdated);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, tasksData, employeesData, timeEntriesData] = await Promise.all([
        projectService.getAll(),
        taskService.getAll(),
        employeeService.getAll(),
        timeEntryService.getAll(),
      ]);

      const trackedMap = timeEntryService.getTrackedHoursMap(timeEntriesData);
      setTaskTrackedHours(trackedMap);
      setProjects(projectsData);
      setTasks(tasksData as Task[]);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error loading reports data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .map((t) => {
        const tracked = taskTrackedHours[t.id];
        const actualHours =
          tracked !== undefined && tracked > 0
            ? Number(tracked.toFixed(1))
            : Number((t.actual_time || 0).toFixed(1));
        return { ...t, actual_time: actualHours };
      })
      .filter((task) => {
        const searchMatch =
          !searchTerm ||
          searchTerm
            .toLowerCase()
            .split(" ")
            .every((word) => {
              const project = projects.find((p) => p.id === task.project_id);
              const employee = employees.find(
                (e) => e.id === task.assigned_employee_id,
              );
              const taskText = `
              ${task.name}
              ${task.description || ""}
              ${project?.name || ""}
              ${employee?.name || ""}
            `.toLowerCase();
              return taskText.includes(word);
            });

        const projectMatch =
          selectedProjectId === "all" || task.project_id === selectedProjectId;

        const employeeMatch =
          selectedEmployeeId === "all" ||
          task.assigned_employee_id === selectedEmployeeId;

        const dateMatch =
          !dateRange ||
          !dateRange.from ||
          (new Date(task.start_date) >= dateRange.from &&
            (!dateRange.to || new Date(task.end_date) <= dateRange.to));

        return searchMatch && projectMatch && employeeMatch && dateMatch;
      });
  }, [tasks, taskTrackedHours, searchTerm, selectedProjectId, selectedEmployeeId, dateRange, projects, employees]);

  // Overall metrics calculation
  const totalTasksCount = filteredTasks.length;
  const completedTasksCount = filteredTasks.filter((t) => t.status === "completed").length;
  const inProgressTasksCount = filteredTasks.filter((t) => t.status === "in_progress").length;
  const pendingTasksCount = filteredTasks.filter((t) => t.status === "pending").length;
  const totalEstimatedHours = Number(filteredTasks.reduce((sum, t) => sum + (t.estimated_time || 0), 0).toFixed(1));
  const totalActualHours = Number(filteredTasks.reduce((sum, t) => sum + (t.actual_time || 0), 0).toFixed(1));
  const totalVarianceHours = Number((totalActualHours - totalEstimatedHours).toFixed(1));
  const executionAdherence = totalEstimatedHours > 0 ? Math.round((totalActualHours / totalEstimatedHours) * 100) : 0;
  const completionPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Comparison by Project
  const projectComparisonData = useMemo(() => {
    return projects.map((project) => {
      const pTasks = filteredTasks.filter((t) => t.project_id === project.id);
      const estimated = Number(pTasks.reduce((sum, t) => sum + (t.estimated_time || 0), 0).toFixed(1));
      const actual = Number(pTasks.reduce((sum, t) => sum + (t.actual_time || 0), 0).toFixed(1));
      const variance = Number((actual - estimated).toFixed(1));
      const adherence = estimated > 0 ? Math.round((actual / estimated) * 100) : 0;
      return {
        id: project.id,
        name: project.name,
        estimated,
        actual,
        variance,
        adherence,
        taskCount: pTasks.length,
      };
    }).filter((p) => p.taskCount > 0 || !searchTerm);
  }, [projects, filteredTasks, searchTerm]);

  // Comparison by Employee
  const employeeComparisonData = useMemo(() => {
    return employees.map((emp) => {
      const eTasks = filteredTasks.filter((t) => t.assigned_employee_id === emp.id);
      const estimated = Number(eTasks.reduce((sum, t) => sum + (t.estimated_time || 0), 0).toFixed(1));
      const actual = Number(eTasks.reduce((sum, t) => sum + (t.actual_time || 0), 0).toFixed(1));
      const variance = Number((actual - estimated).toFixed(1));
      const adherence = estimated > 0 ? Math.round((actual / estimated) * 100) : 0;
      return {
        id: emp.id,
        name: emp.name,
        estimated,
        actual,
        variance,
        adherence,
        taskCount: eTasks.length,
      };
    }).filter((e) => e.taskCount > 0 || !searchTerm);
  }, [employees, filteredTasks, searchTerm]);

  // Project Hours Distribution
  const projectStats = useMemo(() => {
    return projects.map((project) => {
      const pTasks = filteredTasks.filter((t) => t.project_id === project.id);
      const totalHours = pTasks.reduce((sum, t) => sum + (t.estimated_time || 0), 0);
      const completed = pTasks.filter((t) => t.status === "completed").length;
      return {
        id: project.id,
        name: project.name,
        totalHours,
        taskCount: pTasks.length,
        completedCount: completed,
        progress: pTasks.length > 0 ? Math.round((completed / pTasks.length) * 100) : 0,
      };
    }).filter((p) => p.taskCount > 0 || !searchTerm);
  }, [projects, filteredTasks, searchTerm]);

  // Employee Workload Distribution
  const workloadData = useMemo(() => {
    return employees.map((employee) => {
      const eTasks = filteredTasks.filter((t) => t.assigned_employee_id === employee.id);
      const totalHours = eTasks.reduce((sum, t) => sum + (t.estimated_time || 0), 0);
      const weeklyCapacity = employee.weekly_hours || 40;
      const utilization = weeklyCapacity > 0 ? Math.round((totalHours / weeklyCapacity) * 100) : 0;

      return {
        id: employee.id,
        name: employee.name,
        role: employee.role || "Colaborador",
        totalHours,
        weeklyCapacity,
        utilization,
        taskCount: eTasks.length,
      };
    });
  }, [employees, filteredTasks]);

  // Task Status Distribution for Pie Chart
  const statusDistribution = useMemo(() => {
    const counts = {
      completed: 0,
      in_progress: 0,
      pending: 0,
    };
    filteredTasks.forEach((t) => {
      if (t.status === "completed") counts.completed++;
      else if (t.status === "in_progress") counts.in_progress++;
      else counts.pending++;
    });

    return [
      { name: "Concluídas", value: counts.completed, color: "#10b981" },
      { name: "Em Andamento", value: counts.in_progress, color: "#3b82f6" },
      { name: "Pendentes", value: counts.pending, color: "#f59e0b" },
    ].filter((item) => item.value > 0);
  }, [filteredTasks]);

  // Monthly Timeline Data
  const timelineData = useMemo(() => {
    const monthlyMap: Record<string, { month: string; tasks: number; hours: number; rawDate: Date }> = {};

    filteredTasks.forEach((task) => {
      const d = new Date(task.start_date || new Date());
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthLabel,
          tasks: 0,
          hours: 0,
          rawDate: new Date(d.getFullYear(), d.getMonth(), 1),
        };
      }
      monthlyMap[monthKey].tasks += 1;
      monthlyMap[monthKey].hours += task.estimated_time || 0;
    });

    return Object.values(monthlyMap)
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
      .map(({ month, tasks, hours }) => ({ month, tasks, hours }));
  }, [filteredTasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Title, Search and Date Range */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              Relatórios e Indicadores
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Análise executiva e ágil com Curva Burndown, Burnup, Índice SPI, carga de trabalho e cronograma.
            </p>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="bg-card border border-border rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mr-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Filtros:</span>
            </div>

            {/* Project Filter */}
            <div className="w-44 sm:w-48">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
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

            {/* Collaborator Filter */}
            <div className="w-44 sm:w-48">
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
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

            {/* Date Range Picker */}
            <DatePickerWithRange onDateChange={setDateRange} />

            {/* Search Input */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 h-8 text-xs bg-background"
              />
            </div>

            {/* Reset Filters button */}
            {(selectedProjectId !== "all" ||
              selectedEmployeeId !== "all" ||
              dateRange?.from ||
              searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedProjectId("all");
                  setSelectedEmployeeId("all");
                  setDateRange(undefined);
                  setSearchTerm("");
                }}
                className="h-8 text-xs text-muted-foreground hover:text-foreground px-2 gap-1"
                title="Limpar todos os filtros"
              >
                <X className="h-3.5 w-3.5" />
                <span>Limpar</span>
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground font-medium">
            <span className="font-bold text-foreground">{filteredTasks.length}</span> tarefa(s) encontrada(s)
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="border-b border-border pb-2">
          <TabsList className="bg-muted/60 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="burndown" className="text-xs sm:text-sm font-medium gap-1.5 data-[state=active]:bg-background">
              <Flame className="h-4 w-4 text-amber-500" />
              <span>Burndown, Burnup & SPI</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="text-xs sm:text-sm font-medium gap-1.5 data-[state=active]:bg-background">
              <Scale className="h-4 w-4 text-primary" />
              <span>Estimado vs Realizado</span>
            </TabsTrigger>
            <TabsTrigger value="overview" className="text-xs sm:text-sm font-medium gap-1.5 data-[state=active]:bg-background">
              <FolderOpen className="h-4 w-4" />
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="workload" className="text-xs sm:text-sm font-medium gap-1.5 data-[state=active]:bg-background">
              <Users className="h-4 w-4" />
              <span>Carga da Equipe</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs sm:text-sm font-medium gap-1.5 data-[state=active]:bg-background">
              <Clock className="h-4 w-4" />
              <span>Cronograma & Prazos</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 0. BURNDOWN, BURNUP & SPI TAB */}
        <TabsContent value="burndown" className="mt-4 space-y-6">
          <BurndownBurnupView
            tasks={filteredTasks}
            projects={projects}
            employees={employees}
            selectedProjectId={selectedProjectId}
            selectedEmployeeId={selectedEmployeeId}
            onProjectChange={setSelectedProjectId}
            onEmployeeChange={setSelectedEmployeeId}
            dateRange={dateRange}
          />
        </TabsContent>

        {/* 1. VISÃO GERAL TAB */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="shadow-xs border-border bg-card">
              <CardContent className="p-4 flex items-center">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3 shrink-0">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Projetos Ativos</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{projects.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border bg-card">
              <CardContent className="p-4 flex items-center">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mr-3 shrink-0">
                  <ListTodo className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Total de Tarefas</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{totalTasksCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border bg-card">
              <CardContent className="p-4 flex items-center">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mr-3 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Horas Planejadas</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{totalEstimatedHours}h</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border bg-card">
              <CardContent className="p-4 flex items-center">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mr-3 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Taxa de Conclusão</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{completionPercentage}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Hours Chart */}
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-semibold">Distribuição de Horas por Projeto</CardTitle>
                <CardDescription className="text-xs">Volume de esforço estimado acumulado em cada projeto.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectStats} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis
                        dataKey="name"
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        height={50}
                        tick={{ fontSize: 11, fill: "currentColor" }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="totalHours" name="Horas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Task Status Distribution */}
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-semibold">Distribuição de Status de Tarefas</CardTitle>
                <CardDescription className="text-xs">Proporção de tarefas concluídas, em andamento e pendentes.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full flex items-center justify-center">
                  {statusDistribution.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma tarefa encontrada no período.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Breakdown Table */}
          <Card className="shadow-xs border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold">Resumo Detalhado dos Projetos</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="px-4 py-2.5">Projeto</th>
                      <th className="px-4 py-2.5 text-center">Tarefas</th>
                      <th className="px-4 py-2.5 text-center">Concluídas</th>
                      <th className="px-4 py-2.5 text-center">Horas Estimadas</th>
                      <th className="px-4 py-2.5">Progresso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {projectStats.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{p.taskCount}</td>
                        <td className="px-4 py-3 text-center text-emerald-600 font-semibold">{p.completedCount}</td>
                        <td className="px-4 py-3 text-center font-mono">{p.totalHours}h</td>
                        <td className="px-4 py-3 w-48">
                          <div className="flex items-center gap-2">
                            <Progress value={p.progress} className="h-2 flex-1" />
                            <span className="font-mono text-[11px] font-semibold w-10 text-right">{p.progress}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. CARGA DA EQUIPE TAB */}
        <TabsContent value="workload" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workload Utilization Chart */}
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-semibold">Taxa de Utilização da Equipe (%)</CardTitle>
                <CardDescription className="text-xs">Percentual de ocupação em relação à capacidade semanal contratada.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workloadData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis
                        dataKey="name"
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        height={50}
                        tick={{ fontSize: 11, fill: "currentColor" }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="utilization" name="Utilização %" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Hours Comparison Chart */}
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-semibold">Horas Alocadas vs Capacidade</CardTitle>
                <CardDescription className="text-xs">Comparativo direto entre horas estimadas de tarefas e limite semanal.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workloadData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis
                        dataKey="name"
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        height={50}
                        tick={{ fontSize: 11, fill: "currentColor" }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="totalHours" name="Horas Alocadas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="weeklyCapacity" name="Capacidade Semanal" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Workload Table Breakdown */}
          <Card className="shadow-xs border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold">Quadro de Carga dos Colaboradores</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="px-4 py-2.5">Colaborador</th>
                      <th className="px-4 py-2.5">Cargo</th>
                      <th className="px-4 py-2.5 text-center">Tarefas</th>
                      <th className="px-4 py-2.5 text-center">Horas Alocadas</th>
                      <th className="px-4 py-2.5 text-center">Capacidade Semanal</th>
                      <th className="px-4 py-2.5">Utilização</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {workloadData.map((emp) => {
                      const isOverloaded = emp.utilization > 100;
                      return (
                        <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{emp.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{emp.role}</td>
                          <td className="px-4 py-3 text-center font-semibold">{emp.taskCount}</td>
                          <td className="px-4 py-3 text-center font-mono">{emp.totalHours}h</td>
                          <td className="px-4 py-3 text-center font-mono text-muted-foreground">{emp.weeklyCapacity}h</td>
                          <td className="px-4 py-3 w-48">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={Math.min(emp.utilization, 100)}
                                className={`h-2 flex-1 ${isOverloaded ? "bg-rose-200 dark:bg-rose-950" : ""}`}
                              />
                              <Badge
                                variant={isOverloaded ? "destructive" : emp.utilization > 80 ? "default" : "secondary"}
                                className="text-[10px] font-mono px-1.5 py-0"
                              >
                                {emp.utilization}%
                              </Badge>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Integrated Detailed Workload Summary Component */}
          <div className="pt-2">
            <h3 className="text-sm sm:text-base font-semibold mb-3">Detalhamento Analítico de Capacidade</h3>
            <WorkloadSummary showCharts={true} />
          </div>
        </TabsContent>

        {/* 3. CRONOGRAMA & PRAZOS TAB */}
        <TabsContent value="timeline" className="mt-4 space-y-6">
          <Card className="shadow-xs border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base font-semibold">Evolução Mensal do Cronograma</CardTitle>
              <CardDescription className="text-xs">Distribuição de novas tarefas e esforço previsto (horas) ao longo dos meses.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full pt-2">
                {timelineData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Sem dados temporais para exibir.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "currentColor" }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "currentColor" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px" }} />
                      <Bar yAxisId="left" dataKey="tasks" name="Quantidade de Tarefas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="hours"
                        name="Horas Alocadas"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* 4. ESTIMADO VS REALIZADO TAB */}
        <TabsContent value="comparison" className="mt-4 space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="shadow-xs border-border bg-card">
              <CardContent className="p-4 flex items-center">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3 shrink-0">
                  <Hourglass className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Horas Estimadas (Total)</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{totalEstimatedHours}h</p>
                  <span className="text-[10px] text-muted-foreground">Planejamento previsto</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border bg-card">
              <CardContent className="p-4 flex items-center">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mr-3 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Horas Registradas (Acompanhamento)</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{totalActualHours}h</p>
                  <span className="text-[10px] text-muted-foreground">Tempo real registrado no apontamento</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border bg-card">
              <CardContent className="p-4 flex items-center">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 shrink-0 ${
                    totalVarianceHours > 0
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : totalVarianceHours < 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  <Scale className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Desvio / Saldo de Horas</p>
                  <p
                    className={`text-xl sm:text-2xl font-bold ${
                      totalVarianceHours > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : totalVarianceHours < 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground"
                    }`}
                  >
                    {totalVarianceHours > 0 ? `+${totalVarianceHours}h` : `${totalVarianceHours}h`}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {totalVarianceHours > 0
                      ? "Horas extrapoladas"
                      : totalVarianceHours < 0
                      ? "Economia de horas"
                      : "Precisão exata"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border bg-card">
              <CardContent className="p-4 flex items-center">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mr-3 shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Taxa de Aderência Real</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{executionAdherence}%</p>
                  <span className="text-[10px] text-muted-foreground">Realizado / Estimado</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row: Project & Employee Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Comparison Chart */}
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center justify-between">
                  <span>Horas por Projeto (Estimado vs Realizado)</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {projectComparisonData.length} projetos
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Comparativo direto de horas estimadas vs tempo realmente rastreado em cada projeto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full pt-2">
                  {projectComparisonData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      Sem projetos para comparar.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projectComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "currentColor" }} />
                        <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(value: any, name: any) => [
                            `${value}h`,
                            name === "estimated" ? "Horas Estimadas" : "Horas Realizadas",
                          ]}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="estimated" name="Estimado (h)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="actual" name="Realizado (h)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Employee Comparison Chart */}
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center justify-between">
                  <span>Horas por Colaborador (Estimado vs Realizado)</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {employeeComparisonData.length} membros
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Acompanhe a dedicação e precisão das estimativas por membro da equipe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full pt-2">
                  {employeeComparisonData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      Sem colaboradores para comparar.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={employeeComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "currentColor" }} />
                        <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(value: any, name: any) => [
                            `${value}h`,
                            name === "estimated" ? "Horas Estimadas" : "Horas Realizadas",
                          ]}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="estimated" name="Estimado (h)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="actual" name="Realizado (h)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Itemized Task Comparison Table */}
          <Card className="shadow-xs border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    Comparativo Detalhado por Tarefa
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Lista completa de tarefas com conferência de horas planejadas, horas reais executadas e desvio.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs w-fit">
                  {filteredTasks.length} tarefas listadas
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground text-left">
                      <th className="py-2.5 px-3 font-semibold">Tarefa</th>
                      <th className="py-2.5 px-3 font-semibold">Projeto</th>
                      <th className="py-2.5 px-3 font-semibold">Responsável</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Esf. Estimado</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Horas Registradas</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Desvio (Saldo)</th>
                      <th className="py-2.5 px-3 font-semibold">Progresso Real</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-muted-foreground">
                          Nenhuma tarefa encontrada para os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => {
                        const proj = projects.find((p) => p.id === task.project_id);
                        const emp = employees.find((e) => e.id === task.assigned_employee_id);
                        const est = task.estimated_time || 0;
                        const act = task.actual_time || 0;
                        const diff = Number((act - est).toFixed(1));
                        const pct = est > 0 ? Math.round((act / est) * 100) : act > 0 ? 100 : 0;

                        return (
                          <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 font-medium text-foreground">
                              {task.name}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {proj?.name || <span className="italic">Geral</span>}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {emp?.name || <span className="italic">Não atribuído</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold text-foreground">
                              {est}h
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              <span className="inline-flex items-center gap-1 justify-center">
                                <Clock className="w-3 h-3 opacity-70" />
                                <span>{act}h</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {diff === 0 ? (
                                <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground">
                                  0.0h (Exato)
                                </Badge>
                              ) : diff > 0 ? (
                                <Badge className="text-[10px] bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20">
                                  +{diff}h (Extrapolou)
                                </Badge>
                              ) : (
                                <Badge className="text-[10px] bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20">
                                  {diff}h (Economia)
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3 min-w-[120px]">
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={Math.min(100, pct)}
                                  className={`h-1.5 flex-1 ${
                                    diff > 0
                                      ? "bg-rose-100 dark:bg-rose-950/40 [&>div]:bg-rose-500"
                                      : "bg-emerald-100 dark:bg-emerald-950/40 [&>div]:bg-emerald-500"
                                  }`}
                                />
                                <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                                  {pct}%
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  task.status === "completed"
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                    : task.status === "in_progress"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                }`}
                              >
                                {task.status === "completed"
                                  ? "Concluída"
                                  : task.status === "in_progress"
                                  ? "Em Andamento"
                                  : "Pendente"}
                              </Badge>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsView;
