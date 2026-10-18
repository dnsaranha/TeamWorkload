import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Square,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Folder,
  User,
  History,
  Timer,
  Sparkles,
  Flame,
  ArrowRight,
  Maximize2,
  Minimize2,
  GripVertical,
  Move,
  EyeOff,
  Eye,
  ExternalLink,
} from "lucide-react";
import {
  Task,
  Project,
  Employee,
  TimeEntry,
  timeEntryService,
  taskService,
  projectService,
  employeeService,
} from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FloatingTimeTrackerProps {
  onTimeLogged?: () => void;
  onOpenTimesheet?: () => void;
}

export const FloatingTimeTracker: React.FC<FloatingTimeTrackerProps> = ({
  onTimeLogged,
  onOpenTimesheet,
}) => {
  // Widget Open/Expanded state
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem("crono_pulse_tracker_hidden") === "true";
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState<"timer" | "manual" | "history">("timer");

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [startTime, setStartTime] = useState<string | null>(null);

  // Selected details
  const [description, setDescription] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Manual entry state
  const [manualHours, setManualHours] = useState("1");
  const [manualMinutes, setManualMinutes] = useState("0");
  const [manualDesc, setManualDesc] = useState("");
  const [manualTaskId, setManualTaskId] = useState<string | null>(null);
  const [manualProjectId, setManualProjectId] = useState<string | null>(null);

  // Data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);

  // Draggable position state (remembered across sessions)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem("crono_pulse_fab_pos");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          return parsed;
        }
      }
    } catch {}
    return {
      x: 24,
      y: typeof window !== "undefined" ? Math.max(100, window.innerHeight - 100) : 600,
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    moved: boolean;
  }>({ startX: 0, startY: 0, initialPosX: 0, initialPosY: 0, moved: false });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep inside screen bounds on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(Math.max(10, prev.x), Math.max(10, window.innerWidth - (isOpen ? 430 : 220))),
        y: Math.min(Math.max(10, prev.y), Math.max(10, window.innerHeight - (isOpen ? 450 : 80))),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  const handlePointerDown = (clientX: number, clientY: number) => {
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialPosX: position.x,
      initialPosY: position.y,
      moved: false,
    };
    setIsDragging(true);

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const curX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const curY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const deltaX = curX - dragStartRef.current.startX;
      const deltaY = curY - dragStartRef.current.startY;

      if (Math.hypot(deltaX, deltaY) > 4) {
        dragStartRef.current.moved = true;
      }

      const rawNewX = dragStartRef.current.initialPosX + deltaX;
      const rawNewY = dragStartRef.current.initialPosY + deltaY;

      const maxW = isOpen ? 430 : 240;
      const maxH = isOpen ? 460 : 70;

      const clampedX = Math.min(Math.max(8, rawNewX), Math.max(8, window.innerWidth - maxW));
      const clampedY = Math.min(Math.max(8, rawNewY), Math.max(8, window.innerHeight - maxH));

      setPosition({ x: clampedX, y: clampedY });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);

      setPosition((curr) => {
        try {
          localStorage.setItem("crono_pulse_fab_pos", JSON.stringify(curr));
        } catch {}
        return curr;
      });
    };

    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);
  };

  // Load active timer from storage on mount
  useEffect(() => {
    loadData();
    const savedActive = timeEntryService.getActive();
    if (savedActive) {
      setIsRunning(savedActive.isRunning);
      setSelectedTaskId(savedActive.taskId);
      setSelectedProjectId(savedActive.projectId);
      setSelectedEmployeeId(savedActive.employeeId);
      setDescription(savedActive.description || "");

      if (savedActive.isRunning && savedActive.startTime) {
        const elapsedSinceStart = Math.floor(
          (Date.now() - savedActive.startTime) / 1000
        );
        setSeconds((savedActive.elapsedSeconds || 0) + elapsedSinceStart);
      } else {
        setSeconds(savedActive.elapsedSeconds || 0);
      }
    }

    // Global listener for starting task tracking from any other component
    const handleGlobalStart = (e: CustomEvent) => {
      const { taskId, taskName, projectId, employeeId } = e.detail || {};
      if (taskId) {
        setSelectedTaskId(taskId);
        if (taskName) setDescription(taskName);
        if (projectId) setSelectedProjectId(projectId);
        if (employeeId) setSelectedEmployeeId(employeeId);
        setIsOpen(true);
        startTimer();
      }
    };

    window.addEventListener(
      "crono_pulse_start_tracking" as any,
      handleGlobalStart as any
    );

    return () => {
      window.removeEventListener(
        "crono_pulse_start_tracking" as any,
        handleGlobalStart as any
      );
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadData = async () => {
    try {
      const [tList, pList, eList, entryList] = await Promise.all([
        taskService.getAll(),
        projectService.getAll(),
        employeeService.getAll(),
        timeEntryService.getAll(),
      ]);
      setTasks(tList || []);
      setProjects(pList || []);
      setEmployees(eList || []);
      setRecentEntries(Array.isArray(entryList) ? entryList : []);
    } catch (e) {
      console.error("Error loading time tracker data:", e);
    }
  };

  // Timer Tick effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Persist timer state
  useEffect(() => {
    if (isRunning || seconds > 0) {
      timeEntryService.saveActive({
        isRunning,
        startTime: isRunning ? Date.now() : null,
        elapsedSeconds: seconds,
        taskId: selectedTaskId,
        taskName: description,
        projectId: selectedProjectId,
        employeeId: selectedEmployeeId,
        description,
      });
    } else {
      timeEntryService.clearActive();
    }
  }, [isRunning, seconds, selectedTaskId, selectedProjectId, selectedEmployeeId, description]);

  const startTimer = () => {
    if (!startTime) {
      setStartTime(new Date().toISOString());
    }
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const stopAndSaveTimer = async () => {
    if (seconds < 5 && !description.trim()) {
      // Too short, just reset
      resetTimer();
      return;
    }

    const task = tasks.find((t) => t.id === selectedTaskId);
    const project = projects.find((p) => p.id === selectedProjectId) || task?.project;
    const employee = employees.find((e) => e.id === selectedEmployeeId) || task?.assigned_employee;

    const durationHrs = Number((seconds / 3600).toFixed(2));
    const now = new Date().toISOString();

    // 1. Create time entry
    const entry: TimeEntry = await timeEntryService.create({
      task_id: selectedTaskId,
      task_name: description || task?.name || "Atividade Avulsa",
      project_id: project?.id || null,
      project_name: project?.name || null,
      employee_id: employee?.id || null,
      employee_name: employee?.name || null,
      description: description || task?.name || "Execução rastreada",
      start_time: startTime || now,
      end_time: now,
      duration_seconds: seconds,
    });

    // 2. If task selected, accumulate actual_time
    if (selectedTaskId) {
      try {
        const currentActual = task?.actual_time || 0;
        const newActual = Number((currentActual + durationHrs).toFixed(2));
        await taskService.update(selectedTaskId, {
          actual_time: newActual,
          status: task?.status === "pending" ? "in_progress" : task?.status,
        });
      } catch (err) {
        console.error("Error updating task actual_time:", err);
      }
    }

    // Refresh entries
    const freshEntries = await timeEntryService.getAll();
    setRecentEntries(Array.isArray(freshEntries) ? freshEntries : []);
    resetTimer();
    if (onTimeLogged) onTimeLogged();
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSeconds(0);
    setStartTime(null);
    setDescription("");
    setSelectedTaskId(null);
    setSelectedProjectId(null);
    setSelectedEmployeeId(null);
    timeEntryService.clearActive();
  };

  const handleSaveManualEntry = async () => {
    const totalSecs = (Number(manualHours) || 0) * 3600 + (Number(manualMinutes) || 0) * 60;
    if (totalSecs <= 0) return;

    const task = tasks.find((t) => t.id === manualTaskId);
    const project = projects.find((p) => p.id === manualProjectId) || task?.project;
    const now = new Date().toISOString();

    await timeEntryService.create({
      task_id: manualTaskId,
      task_name: manualDesc || task?.name || "Registro Manual",
      project_id: project?.id || null,
      project_name: project?.name || null,
      employee_id: task?.assigned_employee_id || null,
      employee_name: task?.assigned_employee?.name || null,
      description: manualDesc || task?.name || "Tempo apontado manualmente",
      start_time: now,
      end_time: now,
      duration_seconds: totalSecs,
    });

    if (manualTaskId) {
      try {
        const durationHrs = Number((totalSecs / 3600).toFixed(2));
        const currentActual = task?.actual_time || 0;
        await taskService.update(manualTaskId, {
          actual_time: Number((currentActual + durationHrs).toFixed(2)),
        });
      } catch (e) {
        console.error(e);
      }
    }

    const freshEntries = await timeEntryService.getAll();
    setRecentEntries(Array.isArray(freshEntries) ? freshEntries : []);
    setManualDesc("");
    setManualTaskId(null);
    setManualProjectId(null);
    setManualHours("1");
    setManualMinutes("0");
    if (onTimeLogged) onTimeLogged();
  };

  const handleDeleteEntry = async (id: string) => {
    await timeEntryService.delete(id);
    const freshEntries = await timeEntryService.getAll();
    setRecentEntries(Array.isArray(freshEntries) ? freshEntries : []);
    if (onTimeLogged) onTimeLogged();
  };

  // Format seconds to HH:MM:SS
  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Compute total tracked time today safely
  const safeRecentEntries = Array.isArray(recentEntries) ? recentEntries : [];
  const todayEntries = safeRecentEntries.filter((entry) => {
    try {
      const entryDate = format(new Date(entry.start_time), "yyyy-MM-dd");
      const todayStr = format(new Date(), "yyyy-MM-dd");
      return entryDate === todayStr;
    } catch {
      return false;
    }
  });

  const totalTrackedSecondsToday = todayEntries.reduce(
    (sum, e) => sum + (e.duration_seconds || 0),
    0
  );

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || selectedTask?.project;

  return (
    <>
      {/* FLOATING TRIGGER BUTTON / COMPACT CAPSULE (DRAGGABLE) */}
      {!isOpen && !isHidden && (
        <div
          style={{
            position: "fixed",
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 9999,
            touchAction: "none",
          }}
          className={`pointer-events-auto select-none flex items-center gap-1.5 ${isDragging ? "cursor-grabbing opacity-90 scale-105" : "cursor-grab"}`}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            handlePointerDown(e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            const touch = e.touches[0];
            handlePointerDown(touch.clientX, touch.clientY);
          }}
        >
          <div
            onClick={(e) => {
              if (dragStartRef.current.moved) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              setIsOpen(true);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-2xl border transition-all ${
              isRunning
                ? "bg-primary text-primary-foreground border-primary shadow-primary/30 animate-pulse"
                : seconds > 0
                ? "bg-amber-600 text-white border-amber-700 shadow-amber-600/30"
                : "bg-card text-foreground hover:bg-card/90 border-border hover:border-primary/50 shadow-lg"
            }`}
            title="Arraste para mover • Clique para abrir Rastreador (Clockify)"
          >
            {/* Drag Handle Icon */}
            <div className="opacity-60 hover:opacity-100 flex items-center pr-0.5">
              <GripVertical className="h-3.5 w-3.5" />
            </div>

            <div className="flex items-center gap-1.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isRunning
                    ? "bg-emerald-400 animate-ping"
                    : seconds > 0
                    ? "bg-amber-300"
                    : "bg-primary"
                }`}
              />
              <Clock className="h-4 w-4" />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs sm:text-sm">
                {formatTime(seconds)}
              </span>
              {description ? (
                <span className="text-xs max-w-[110px] sm:max-w-[150px] truncate opacity-90 hidden sm:inline">
                  • {description}
                </span>
              ) : isRunning ? (
                <span className="text-xs opacity-90 hidden sm:inline">• Gravando</span>
              ) : (
                <span className="text-xs font-semibold hidden sm:inline">Rastrear</span>
              )}
            </div>

            {/* Quick Play/Pause in capsule */}
            {isRunning ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  pauseTimer();
                }}
                className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                title="Pausar"
              >
                <Pause className="h-3 w-3" />
              </button>
            ) : seconds > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startTimer();
                }}
                className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                title="Retomar"
              >
                <Play className="h-3 w-3 fill-current" />
              </button>
            ) : null}
          </div>

          {/* Button next to floating tracker to hide it */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsHidden(true);
              try {
                localStorage.setItem("crono_pulse_tracker_hidden", "true");
              } catch {}
            }}
            className="p-1.5 rounded-full bg-card/90 hover:bg-card text-muted-foreground hover:text-foreground border border-border shadow-md transition-all hover:scale-105"
            title="Ocultar rastreador flutuante"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Floating edge chip when tracker is hidden */}
      {isHidden && (
        <button
          type="button"
          onClick={() => {
            setIsHidden(false);
            try {
              localStorage.setItem("crono_pulse_tracker_hidden", "false");
            } catch {}
          }}
          className="fixed bottom-3 right-4 z-40 bg-card/95 hover:bg-card text-foreground border border-border shadow-xl rounded-full px-3 py-1.5 flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition-all hover:scale-105"
          title="Exibir Rastreador de Tempo"
        >
          <Timer className="h-3.5 w-3.5 text-primary" />
          <span>Rastreador</span>
          {seconds > 0 && (
            <span className="font-mono text-[11px] font-bold text-primary">
              {formatTime(seconds)}
            </span>
          )}
          {isRunning && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          )}
          <Eye className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
        </button>
      )}

      {/* FULL EXPANDED CLOCKIFY-STYLE WIDGET MODAL / POPUP (DRAGGABLE) */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 9999,
          }}
          className="w-[92vw] max-w-[420px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header (Draggable Handle) */}
          <div
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).closest("button")) return;
              handlePointerDown(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              if ((e.target as HTMLElement).closest("button")) return;
              const touch = e.touches[0];
              handlePointerDown(touch.clientX, touch.clientY);
            }}
            className={`p-3.5 bg-muted/60 border-b border-border flex items-center justify-between select-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            title="Arraste pelo cabeçalho para posicionar onde desejar"
          >
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md text-muted-foreground hover:text-foreground">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Timer className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  Rastreador de Tempo
                  <Badge
                    variant="outline"
                    className={`text-[9px] h-4 font-semibold ${
                      isRunning
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : seconds > 0
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isRunning ? "Gravando" : seconds > 0 ? "Pausado" : "Pronto"}
                  </Badge>
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Hoje rastreado:{" "}
                  <strong className="text-foreground">
                    {formatTime(totalTrackedSecondsToday)}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenTimesheet && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenTimesheet();
                  }}
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  title="Abrir Grade de Apontamento de Horas"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsOpen(false);
                  setIsHidden(true);
                  try {
                    localStorage.setItem("crono_pulse_tracker_hidden", "true");
                  } catch {}
                }}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Ocultar rastreador flutuante"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Minimizar para botão flutuante"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-border bg-muted/20 px-3 pt-1 gap-2 text-xs">
            <button
              onClick={() => setActiveTab("timer")}
              className={`pb-2 px-2 font-semibold transition-colors border-b-2 ${
                activeTab === "timer"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Cronômetro Ao Vivo
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`pb-2 px-2 font-semibold transition-colors border-b-2 ${
                activeTab === "manual"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Apontar Manual
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`pb-2 px-2 font-semibold transition-colors border-b-2 flex items-center gap-1 ${
                activeTab === "history"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Histórico ({todayEntries.length})
            </button>
          </div>

          {/* TAB 1: LIVE CLOCKIFY TIMER */}
          {activeTab === "timer" && (
            <div className="p-4 space-y-3.5">
              {/* Big Digital Timer Display */}
              <div className="bg-muted/40 rounded-xl p-3 border border-border flex flex-col items-center justify-center relative overflow-hidden">
                <div className="text-3xl sm:text-4xl font-mono font-extrabold tracking-wider text-foreground">
                  {formatTime(seconds)}
                </div>
                {isRunning && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Tempo real sendo contabilizado
                  </div>
                )}
              </div>

              {/* Task Title / Description input */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                  <span>No que você está trabalhando?</span>
                  {selectedTask && (
                    <span className="text-[10px] text-primary">Tarefa vinculada</span>
                  )}
                </label>
                <div className="relative">
                  <Input
                    placeholder="Ex: Refatorando componente de calendário..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-xs h-8 bg-background"
                  />
                </div>
              </div>

              {/* Task Selector & Project Selector */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Select Task Dropdown */}
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="w-full h-8 px-2 rounded-lg bg-muted/60 hover:bg-muted border border-border flex items-center justify-between text-left transition-colors"
                      >
                        <span className="truncate text-[11px]">
                          {selectedTask ? selectedTask.name : "Selecionar Tarefa"}
                        </span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="!z-[99999] w-64 max-h-56 overflow-y-auto bg-popover text-popover-foreground border-border shadow-2xl">
                      <DropdownMenuLabel className="text-xs">Vincular a Tarefa</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedTaskId(null);
                        }}
                        className="text-xs text-muted-foreground"
                      >
                        Nenhuma (Trabalho Avulso)
                      </DropdownMenuItem>
                      {tasks.map((t) => (
                        <DropdownMenuItem
                          key={t.id}
                          onClick={() => {
                            setSelectedTaskId(t.id);
                            setDescription(t.name);
                            if (t.project_id) setSelectedProjectId(t.project_id);
                            if (t.assigned_employee_id) setSelectedEmployeeId(t.assigned_employee_id);
                          }}
                          className="text-xs flex items-center justify-between gap-1"
                        >
                          <span className="truncate">{t.name}</span>
                          {t.estimated_time && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              ({t.estimated_time}h)
                            </span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Select Project Dropdown */}
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="w-full h-8 px-2 rounded-lg bg-muted/60 hover:bg-muted border border-border flex items-center justify-between text-left transition-colors"
                      >
                        <span className="truncate text-[11px]">
                          {selectedProject ? selectedProject.name : "Projeto"}
                        </span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="!z-[99999] w-56 max-h-56 overflow-y-auto bg-popover text-popover-foreground border-border shadow-2xl">
                      <DropdownMenuLabel className="text-xs">Vincular Projeto</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setSelectedProjectId(null)}
                        className="text-xs text-muted-foreground"
                      >
                        Nenhum
                      </DropdownMenuItem>
                      {projects.map((p) => (
                        <DropdownMenuItem
                          key={p.id}
                          onClick={() => setSelectedProjectId(p.id)}
                          className="text-xs truncate"
                        >
                          {p.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Main Play / Pause / Stop Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {!isRunning ? (
                  <Button
                    onClick={startTimer}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 gap-2 shadow-md shadow-primary/20"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>{seconds > 0 ? "Retomar" : "Iniciar Timer"}</span>
                  </Button>
                ) : (
                  <Button
                    onClick={pauseTimer}
                    variant="outline"
                    className="flex-1 border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 font-bold h-10 gap-2"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Pausar</span>
                  </Button>
                )}

                {(isRunning || seconds > 0) && (
                  <Button
                    onClick={stopAndSaveTimer}
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4 gap-1.5 shadow-md shadow-emerald-600/20"
                    title="Concluir e salvar no histórico"
                  >
                    <Square className="h-4 w-4 fill-current" />
                    <span>Salvar</span>
                  </Button>
                )}

                {seconds > 0 && !isRunning && (
                  <Button
                    onClick={resetTimer}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground hover:text-destructive"
                    title="Descartar timer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL TIME ENTRY */}
          {activeTab === "manual" && (
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Descrição da Atividade
                </label>
                <Input
                  placeholder="Ex: Reunião de alinhamento com cliente..."
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              {/* Time inputs: Hours & Minutes */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Horas
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                    className="text-xs h-8 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Minutos
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                    className="text-xs h-8 font-mono"
                  />
                </div>
              </div>

              {/* Select Task */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Vincular a Tarefa (Opcional)
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="w-full h-8 px-2 rounded-lg bg-muted/60 hover:bg-muted border border-border flex items-center justify-between text-left text-xs transition-colors"
                    >
                      <span className="truncate">
                        {tasks.find((t) => t.id === manualTaskId)?.name || "Selecione uma tarefa..."}
                      </span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="!z-[99999] w-72 max-h-56 overflow-y-auto bg-popover text-popover-foreground border-border shadow-2xl">
                    <DropdownMenuItem
                      onClick={() => setManualTaskId(null)}
                      className="text-xs text-muted-foreground"
                    >
                      Nenhuma
                    </DropdownMenuItem>
                    {tasks.map((t) => (
                      <DropdownMenuItem
                        key={t.id}
                        onClick={() => {
                          setManualTaskId(t.id);
                          if (!manualDesc) setManualDesc(t.name);
                        }}
                        className="text-xs"
                      >
                        {t.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button
                onClick={handleSaveManualEntry}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 gap-1.5"
              >
                <Plus className="h-4 w-4" /> Salvar Apontamento Manual
              </Button>
            </div>
          )}

          {/* TAB 3: TODAY'S LOGGED HISTORY */}
          {activeTab === "history" && (
            <div className="p-3 max-h-72 overflow-y-auto space-y-2">
              {todayEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-1">
                  <History className="h-8 w-8 mx-auto opacity-40 mb-1" />
                  <p className="text-xs font-medium">Nenhum tempo apontado hoje</p>
                  <p className="text-[10px] text-muted-foreground/80">
                    Use o cronômetro para iniciar seu primeiro rastreamento
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-1 border-b border-border">
                    <span>Sessões de Hoje</span>
                    <span className="font-bold text-foreground">
                      Total: {formatTime(totalTrackedSecondsToday)}
                    </span>
                  </div>

                  {todayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="font-semibold text-foreground truncate">
                          {entry.task_name || entry.description}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {entry.project_name && (
                            <span className="flex items-center gap-0.5 text-primary font-medium">
                              <Folder className="h-2.5 w-2.5" />
                              {entry.project_name}
                            </span>
                          )}
                          <span>
                            {format(new Date(entry.start_time), "HH:mm")}
                            {entry.end_time && ` - ${format(new Date(entry.end_time), "HH:mm")}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="secondary"
                          className="font-mono text-[11px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20"
                        >
                          {formatTime(entry.duration_seconds)}
                        </Badge>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                          title="Excluir apontamento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingTimeTracker;
