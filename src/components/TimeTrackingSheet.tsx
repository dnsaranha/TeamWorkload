import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Play,
  Pause,
  Square,
  Clock,
  Plus,
  Trash2,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Calendar as CalendarIcon,
  FolderOpen,
  User,
  Users,
  Timer,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  ArrowUpDown,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { format, parseISO, startOfDay, isToday, isThisWeek, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  type TimeEntry,
  type TimeEntryInsert,
  type Task,
  type Project,
  type Employee,
  timeEntryService,
  taskService,
  projectService,
  employeeService,
} from "@/lib/supabaseClient";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useToast } from "./ui/use-toast";

interface TimeTrackingSheetProps {
  onDataChange?: () => void;
}

export const TimeTrackingSheet: React.FC<TimeTrackingSheetProps> = ({
  onDataChange,
}) => {
  const { toast } = useToast();

  // Data states
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("all");
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "today" | "week" | "month">("all");

  // Live Timer states
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerDescription, setTimerDescription] = useState("");
  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);
  const [timerProjectId, setTimerProjectId] = useState<string | null>(null);
  const [timerEmployeeId, setTimerEmployeeId] = useState<string | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial data
  useEffect(() => {
    loadAllData();
    loadActiveTimer();

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [fetchedEntries, fetchedTasks, fetchedProjects, fetchedEmployees] =
        await Promise.all([
          timeEntryService.getAll(),
          taskService.getAll(),
          projectService.getAll(),
          employeeService.getAll(),
        ]);

      setEntries(fetchedEntries);
      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
      setEmployees(fetchedEmployees);
    } catch (error) {
      console.error("Error loading time tracking data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveTimer = () => {
    const active = timeEntryService.getActive();
    if (active) {
      setTimerDescription(active.description || "");
      setTimerTaskId(active.taskId || null);
      setTimerProjectId(active.projectId || null);
      setTimerEmployeeId(active.employeeId || null);

      if (active.isRunning && active.startTime) {
        const elapsed = Math.floor((Date.now() - active.startTime) / 1000) + (active.elapsedSeconds || 0);
        setTimerSeconds(elapsed);
        setIsTimerRunning(true);
      } else {
        setTimerSeconds(active.elapsedSeconds || 0);
        setIsTimerRunning(false);
      }
    }
  };

  // Timer Tick
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          const next = prev + 1;
          timeEntryService.saveActive({
            isRunning: true,
            startTime: Date.now() - next * 1000,
            elapsedSeconds: next,
            taskId: timerTaskId,
            taskName: tasks.find((t) => t.id === timerTaskId)?.name || "",
            projectId: timerProjectId,
            employeeId: timerEmployeeId,
            description: timerDescription,
          });
          return next;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, timerTaskId, timerProjectId, timerEmployeeId, timerDescription, tasks]);

  const handleStartTimer = () => {
    setIsTimerRunning(true);
    timeEntryService.saveActive({
      isRunning: true,
      startTime: Date.now() - timerSeconds * 1000,
      elapsedSeconds: timerSeconds,
      taskId: timerTaskId,
      taskName: tasks.find((t) => t.id === timerTaskId)?.name || "",
      projectId: timerProjectId,
      employeeId: timerEmployeeId,
      description: timerDescription,
    });
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
    timeEntryService.saveActive({
      isRunning: false,
      startTime: null,
      elapsedSeconds: timerSeconds,
      taskId: timerTaskId,
      taskName: tasks.find((t) => t.id === timerTaskId)?.name || "",
      projectId: timerProjectId,
      employeeId: timerEmployeeId,
      description: timerDescription,
    });
  };

  const handleStopAndSaveTimer = async () => {
    if (timerSeconds < 5 && !timerDescription) {
      toast({
        title: "Tempo muito curto",
        description: "O tempo registrado foi muito curto para ser apontado.",
      });
      return;
    }

    const matchedTask = tasks.find((t) => t.id === timerTaskId);
    const matchedProject = projects.find((p) => p.id === timerProjectId);
    const matchedEmployee = employees.find((e) => e.id === timerEmployeeId);

    const now = new Date();
    const startTime = new Date(now.getTime() - timerSeconds * 1000).toISOString();
    const endTime = now.toISOString();

    const newEntry: TimeEntryInsert = {
      task_id: timerTaskId || null,
      task_name: matchedTask?.name || timerDescription || "Atividade avulsa",
      project_id: timerProjectId || matchedTask?.project_id || null,
      project_name: matchedProject?.name || null,
      employee_id: timerEmployeeId || null,
      employee_name: matchedEmployee?.name || null,
      description: timerDescription || matchedTask?.name || "Registro de tempo",
      start_time: startTime,
      end_time: endTime,
      duration_seconds: timerSeconds,
    };

    const saved = await timeEntryService.create(newEntry);
    setEntries((prev) => [saved, ...prev]);

    // Reset timer
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setTimerDescription("");
    setTimerTaskId(null);
    timeEntryService.clearActive();

    toast({
      title: "Horas Apontadas!",
      description: `Registrado com sucesso: ${formatHours(timerSeconds)}`,
    });

    onDataChange?.();
  };

  // Add a new blank row for direct inline editing (like Grade)
  const handleAddNewRow = async () => {
    const now = new Date();
    const startIso = now.toISOString();
    const defaultDurationHours = 1;
    const endIso = new Date(now.getTime() + defaultDurationHours * 3600 * 1000).toISOString();

    const firstEmp = employees[0];
    const firstProj = projects[0];

    const newEntryInsert: TimeEntryInsert = {
      task_id: null,
      task_name: "",
      project_id: firstProj?.id || null,
      project_name: firstProj?.name || null,
      employee_id: firstEmp?.id || null,
      employee_name: firstEmp?.name || null,
      description: "Nova atividade",
      start_time: startIso,
      end_time: endIso,
      duration_seconds: defaultDurationHours * 3600,
    };

    const created = await timeEntryService.create(newEntryInsert);
    setEntries((prev) => [created, ...prev]);
    toast({
      title: "Nova Linha Criada",
      description: "Digite diretamente nos campos para registrar suas horas.",
    });
    onDataChange?.();
  };

  // Direct In-Cell Update Handler (Grade style)
  const handleUpdateCell = async (id: string, updates: Partial<TimeEntry>) => {
    // Optimistic UI update
    setEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

    // Save to Firestore and local database
    await timeEntryService.update(id, updates);
    onDataChange?.();
  };

  // Direct duration hours typing handler
  const handleHoursChange = (id: string, hoursStr: string, currentStartTime: string) => {
    const hoursNum = parseFloat(hoursStr) || 0;
    const durationSeconds = Math.max(0, Math.round(hoursNum * 3600));

    // Calculate new end time based on start time
    let newEndTime = currentStartTime;
    try {
      const start = new Date(currentStartTime);
      newEndTime = new Date(start.getTime() + durationSeconds * 1000).toISOString();
    } catch {}

    handleUpdateCell(id, {
      duration_seconds: durationSeconds,
      end_time: newEndTime,
    });
  };

  // Direct start/end time typing handler
  const handleTimeChange = (id: string, field: "start_time" | "end_time", timeVal: string, entry: TimeEntry) => {
    try {
      const baseDate = entry.start_time ? new Date(entry.start_time) : new Date();
      const [h, m] = timeVal.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const updatedDate = new Date(baseDate);
        updatedDate.setHours(h, m, 0, 0);
        const iso = updatedDate.toISOString();

        if (field === "start_time") {
          const currentEnd = entry.end_time ? new Date(entry.end_time) : updatedDate;
          const diffSeconds = Math.max(0, Math.round((currentEnd.getTime() - updatedDate.getTime()) / 1000));
          handleUpdateCell(id, {
            start_time: iso,
            duration_seconds: diffSeconds > 0 ? diffSeconds : entry.duration_seconds,
          });
        } else {
          const currentStart = entry.start_time ? new Date(entry.start_time) : updatedDate;
          const diffSeconds = Math.max(0, Math.round((updatedDate.getTime() - currentStart.getTime()) / 1000));
          handleUpdateCell(id, {
            end_time: iso,
            duration_seconds: diffSeconds,
          });
        }
      }
    } catch (e) {
      console.warn("Time parse error:", e);
    }
  };

  // Delete row
  const handleDeleteRow = async (id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
    await timeEntryService.delete(id);
    toast({
      title: "Registro Excluído",
      description: "O apontamento foi removido com sucesso.",
    });
    onDataChange?.();
  };

  // Start timer from existing row
  const handleStartTimerFromRow = (entry: TimeEntry) => {
    setTimerDescription(entry.description || entry.task_name || "");
    setTimerTaskId(entry.task_id || null);
    setTimerProjectId(entry.project_id || null);
    setTimerEmployeeId(entry.employee_id || null);
    setTimerSeconds(0);
    setIsTimerRunning(true);
    toast({
      title: "Timer Iniciado",
      description: `Rastreando: ${entry.description || entry.task_name}`,
    });
  };

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Format seconds to decimal hours (e.g. 2.5h)
  const formatHours = (seconds: number) => {
    const hours = seconds / 3600;
    return `${hours.toFixed(1)}h`;
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = (entry.description || "").toLowerCase().includes(query);
        const matchesTask = (entry.task_name || "").toLowerCase().includes(query);
        const matchesProj = (entry.project_name || "").toLowerCase().includes(query);
        const matchesEmp = (entry.employee_name || "").toLowerCase().includes(query);
        if (!matchesDesc && !matchesTask && !matchesProj && !matchesEmp) {
          return false;
        }
      }

      // Project filter
      if (selectedProjectFilter !== "all" && entry.project_id !== selectedProjectFilter) {
        return false;
      }

      // Employee filter
      if (selectedEmployeeFilter !== "all" && entry.employee_id !== selectedEmployeeFilter) {
        return false;
      }

      // Date range filter
      if (dateRangeFilter !== "all" && entry.start_time) {
        const date = new Date(entry.start_time);
        if (dateRangeFilter === "today" && !isToday(date)) return false;
        if (dateRangeFilter === "week" && !isThisWeek(date, { weekStartsOn: 1 })) return false;
        if (dateRangeFilter === "month" && !isThisMonth(date)) return false;
      }

      return true;
    });
  }, [entries, searchQuery, selectedProjectFilter, selectedEmployeeFilter, dateRangeFilter]);

  // Metric KPIs
  const totalHoursFiltered = useMemo(() => {
    const totalSecs = filteredEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
    return (totalSecs / 3600).toFixed(1);
  }, [filteredEntries]);

  const hoursToday = useMemo(() => {
    const todaySecs = entries
      .filter((e) => e.start_time && isToday(new Date(e.start_time)))
      .reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
    return (todaySecs / 3600).toFixed(1);
  }, [entries]);

  const hoursThisWeek = useMemo(() => {
    const weekSecs = entries
      .filter((e) => e.start_time && isThisWeek(new Date(e.start_time), { weekStartsOn: 1 }))
      .reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
    return (weekSecs / 3600).toFixed(1);
  }, [entries]);

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (filteredEntries.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há registros correspondentes aos filtros atuais.",
      });
      return;
    }

    const exportRows = filteredEntries.map((e, idx) => ({
      "#": idx + 1,
      Data: e.start_time ? format(new Date(e.start_time), "yyyy-MM-dd") : "",
      Colaborador: e.employee_name || "Não informado",
      Projeto: e.project_name || "Avulso",
      Tarefa: e.task_name || "-",
      "Descrição / Atividade": e.description || "",
      "Início": e.start_time ? format(new Date(e.start_time), "HH:mm") : "",
      "Término": e.end_time ? format(new Date(e.end_time), "HH:mm") : "",
      "Horas Apontadas (h)": ((e.duration_seconds || 0) / 3600).toFixed(2),
      "Duração Formatada": formatTime(e.duration_seconds || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Apontamentos");
    XLSX.writeFile(workbook, `Apontamento_Horas_${format(new Date(), "yyyy-MM-dd")}.xlsx`);

    toast({
      title: "Planilha Gerada!",
      description: "O arquivo Excel com o histórico de horas foi baixado com sucesso.",
    });
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground select-none overflow-hidden">
      {/* Top Banner & Live Timer Header */}
      <div className="p-3 sm:p-4 border-b border-border bg-card shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold tracking-tight flex items-center gap-2">
                Apontamento de Horas
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary">
                  Edição Direta (Grade)
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Inicie o timer ao vivo ou digite diretamente nos campos para registrar e ajustar horas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Exportar Excel</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleAddNewRow}
              className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Nova Linha</span>
            </Button>
          </div>
        </div>

        {/* Live Timer Control Bar */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border flex flex-wrap items-center justify-between gap-3">
          {/* Digital Clock */}
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1.5 rounded-lg bg-background border border-border font-mono text-lg sm:text-xl font-black tracking-wider text-foreground shadow-2xs">
              {formatTime(timerSeconds)}
            </div>

            {isTimerRunning ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePauseTimer}
                className="h-9 px-3 gap-1.5 border-amber-500/50 text-amber-600 hover:bg-amber-500/10 font-bold text-xs"
              >
                <Pause className="h-3.5 w-3.5" />
                <span>Pausar</span>
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartTimer}
                className="h-9 px-3 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs shadow-xs"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{timerSeconds > 0 ? "Retomar" : "Iniciar Timer"}</span>
              </Button>
            )}

            {(isTimerRunning || timerSeconds > 0) && (
              <Button
                variant="default"
                size="sm"
                onClick={handleStopAndSaveTimer}
                className="h-9 px-3 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Salvar Apontamento</span>
              </Button>
            )}
          </div>

          {/* Activity Description & Selectors */}
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <Input
              placeholder="No que você está trabalhando agora? (Ex: Refatorando tela de grade...)"
              value={timerDescription}
              onChange={(e) => setTimerDescription(e.target.value)}
              className="h-9 text-xs bg-background flex-1"
            />

            <Select
              value={timerProjectId || "none"}
              onValueChange={(val) => setTimerProjectId(val === "none" ? null : val)}
            >
              <SelectTrigger className="w-36 h-9 text-xs bg-background shrink-0">
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem Projeto</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={timerTaskId || "none"}
              onValueChange={(val) => {
                const taskId = val === "none" ? null : val;
                setTimerTaskId(taskId);
                const task = tasks.find((t) => t.id === taskId);
                if (task) {
                  if (!timerDescription) setTimerDescription(task.name);
                  if (task.project_id) setTimerProjectId(task.project_id);
                  if (task.assigned_employee_id) setTimerEmployeeId(task.assigned_employee_id);
                }
              }}
            >
              <SelectTrigger className="w-40 h-9 text-xs bg-background shrink-0">
                <SelectValue placeholder="Vincular Tarefa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem Tarefa</SelectItem>
                {tasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPI Cards & Filter Bar */}
      <div className="p-3 sm:px-4 border-b border-border bg-card/60 flex flex-col gap-3">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Card className="shadow-2xs bg-card/90">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Hoje Apontado</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{hoursToday}h</p>
              </div>
              <Clock className="h-4 w-4 text-emerald-500/70" />
            </CardContent>
          </Card>

          <Card className="shadow-2xs bg-card/90">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Esta Semana</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{hoursThisWeek}h</p>
              </div>
              <CalendarIcon className="h-4 w-4 text-blue-500/70" />
            </CardContent>
          </Card>

          <Card className="shadow-2xs bg-card/90">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Total Filtrado</p>
                <p className="text-lg font-bold text-primary">{totalHoursFiltered}h</p>
              </div>
              <Sparkles className="h-4 w-4 text-primary/70" />
            </CardContent>
          </Card>

          <Card className="shadow-2xs bg-card/90">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Lançamentos</p>
                <p className="text-lg font-bold">{filteredEntries.length}</p>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, tarefa, projeto ou colaborador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
            <button
              onClick={() => setDateRangeFilter("all")}
              className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                dateRangeFilter === "all" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setDateRangeFilter("today")}
              className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                dateRangeFilter === "today" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setDateRangeFilter("week")}
              className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                dateRangeFilter === "week" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setDateRangeFilter("month")}
              className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                dateRangeFilter === "month" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Este Mês
            </button>
          </div>

          {/* Project Filter */}
          <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
            <SelectTrigger className="w-36 h-8 text-xs bg-background">
              <SelectValue placeholder="Filtrar Projeto" />
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

          {/* Employee Filter */}
          <Select value={selectedEmployeeFilter} onValueChange={setSelectedEmployeeFilter}>
            <SelectTrigger className="w-36 h-8 text-xs bg-background">
              <SelectValue placeholder="Filtrar Colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda a Equipe</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || selectedProjectFilter !== "all" || selectedEmployeeFilter !== "all" || dateRangeFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedProjectFilter("all");
                setSelectedEmployeeFilter("all");
                setDateRangeFilter("all");
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Main Interactive Editable Table (Grade Dynamics) */}
      <div className="flex-1 overflow-auto bg-card">
        <table className="w-full border-collapse text-left text-xs">
          {/* Table Header */}
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b border-border z-10 font-bold text-muted-foreground">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center">#</th>
              <th className="py-2.5 px-3 w-32">Data</th>
              <th className="py-2.5 px-3 w-40">Colaborador</th>
              <th className="py-2.5 px-3 w-44">Projeto</th>
              <th className="py-2.5 px-3 w-48">Tarefa Vinculada</th>
              <th className="py-2.5 px-3 min-w-[220px]">Descrição / Atividade</th>
              <th className="py-2.5 px-3 w-20 text-center">Início</th>
              <th className="py-2.5 px-3 w-20 text-center">Fim</th>
              <th className="py-2.5 px-3 w-28 text-center bg-primary/5">Horas (h)</th>
              <th className="py-2.5 px-3 w-24 text-center">Ações</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border/60">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Clock className="h-8 w-8 text-muted-foreground/40" />
                    <p className="font-medium text-sm">Nenhum apontamento encontrado</p>
                    <p className="text-xs text-muted-foreground">
                      Clique em "+ Nova Linha" ou use o cronômetro para registrar horas
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddNewRow}
                      className="text-xs mt-2"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Primeiro Apontamento
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry, index) => {
                const dateStr = entry.start_time
                  ? format(new Date(entry.start_time), "yyyy-MM-dd")
                  : format(new Date(), "yyyy-MM-dd");
                const startTimeStr = entry.start_time
                  ? format(new Date(entry.start_time), "HH:mm")
                  : "09:00";
                const endTimeStr = entry.end_time
                  ? format(new Date(entry.end_time), "HH:mm")
                  : "18:00";
                const hoursVal = ((entry.duration_seconds || 0) / 3600).toFixed(2);

                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-muted/30 transition-colors group focus-within:bg-primary/5"
                  >
                    {/* Index */}
                    <td className="py-2 px-3 text-center text-muted-foreground font-mono text-[11px]">
                      {index + 1}
                    </td>

                    {/* Date (direct edit) */}
                    <td className="py-1.5 px-2">
                      <Input
                        type="date"
                        value={dateStr}
                        onChange={(e) => {
                          const newDateVal = e.target.value;
                          if (newDateVal) {
                            try {
                              const [y, m, d] = newDateVal.split("-").map(Number);
                              const cur = entry.start_time ? new Date(entry.start_time) : new Date();
                              cur.setFullYear(y, m - 1, d);
                              const updatedStart = cur.toISOString();
                              const updatedEnd = new Date(cur.getTime() + (entry.duration_seconds || 0) * 1000).toISOString();
                              handleUpdateCell(entry.id, {
                                start_time: updatedStart,
                                end_time: updatedEnd,
                              });
                            } catch {}
                          }
                        }}
                        className="h-7 text-xs px-2 bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background"
                      />
                    </td>

                    {/* Employee select */}
                    <td className="py-1.5 px-2">
                      <Select
                        value={entry.employee_id || "none"}
                        onValueChange={(val) => {
                          const empId = val === "none" ? null : val;
                          const emp = employees.find((e) => e.id === empId);
                          handleUpdateCell(entry.id, {
                            employee_id: empId,
                            employee_name: emp?.name || null,
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background">
                          <SelectValue placeholder="Colaborador" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem Colaborador</SelectItem>
                          {employees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Project select */}
                    <td className="py-1.5 px-2">
                      <Select
                        value={entry.project_id || "none"}
                        onValueChange={(val) => {
                          const projId = val === "none" ? null : val;
                          const proj = projects.find((p) => p.id === projId);
                          handleUpdateCell(entry.id, {
                            project_id: projId,
                            project_name: proj?.name || null,
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background truncate">
                          <SelectValue placeholder="Projeto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem Projeto</SelectItem>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Task select */}
                    <td className="py-1.5 px-2">
                      <Select
                        value={entry.task_id || "none"}
                        onValueChange={(val) => {
                          const taskId = val === "none" ? null : val;
                          const task = tasks.find((t) => t.id === taskId);
                          handleUpdateCell(entry.id, {
                            task_id: taskId,
                            task_name: task?.name || null,
                            project_id: task?.project_id || entry.project_id,
                            project_name: projects.find((p) => p.id === task?.project_id)?.name || entry.project_name,
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background truncate">
                          <SelectValue placeholder="Tarefa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem Tarefa</SelectItem>
                          {tasks.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Description (direct text typing) */}
                    <td className="py-1.5 px-2">
                      <Input
                        value={entry.description || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEntries((prev) =>
                            prev.map((item) =>
                              item.id === entry.id ? { ...item, description: val } : item
                            )
                          );
                        }}
                        onBlur={(e) => {
                          handleUpdateCell(entry.id, { description: e.target.value });
                        }}
                        placeholder="Descreva a atividade..."
                        className="h-7 text-xs bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background"
                      />
                    </td>

                    {/* Start Time */}
                    <td className="py-1.5 px-1.5 text-center">
                      <Input
                        type="time"
                        value={startTimeStr}
                        onChange={(e) =>
                          handleTimeChange(entry.id, "start_time", e.target.value, entry)
                        }
                        className="h-7 text-xs px-1 text-center font-mono bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background"
                      />
                    </td>

                    {/* End Time */}
                    <td className="py-1.5 px-1.5 text-center">
                      <Input
                        type="time"
                        value={endTimeStr}
                        onChange={(e) =>
                          handleTimeChange(entry.id, "end_time", e.target.value, entry)
                        }
                        className="h-7 text-xs px-1 text-center font-mono bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background"
                      />
                    </td>

                    {/* Duration in Hours (typing directly recalculates seconds) */}
                    <td className="py-1.5 px-2 text-center bg-primary/5">
                      <div className="flex items-center justify-center space-x-1">
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          max="24"
                          value={hoursVal}
                          onChange={(e) =>
                            handleHoursChange(entry.id, e.target.value, entry.start_time)
                          }
                          className="h-7 w-18 text-xs font-mono font-bold text-center bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background"
                        />
                        <span className="text-[11px] font-semibold text-muted-foreground">h</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-1.5 px-2 text-center">
                      <div className="flex items-center justify-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartTimerFromRow(entry)}
                          className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10 rounded"
                          title="Continuar timer nesta tarefa"
                        >
                          <Play className="h-3 w-3 fill-current" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRow(entry.id)}
                          className="h-6 w-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded"
                          title="Excluir este apontamento"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Summary Bar */}
      <div className="p-2 sm:px-4 border-t border-border bg-muted/40 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-2">
          <span>Mostrando <strong>{filteredEntries.length}</strong> de <strong>{entries.length}</strong> apontamentos</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Total de Horas: <strong className="text-foreground">{totalHoursFiltered} horas</strong></span>
        </div>
      </div>
    </div>
  );
};

export default TimeTrackingSheet;
