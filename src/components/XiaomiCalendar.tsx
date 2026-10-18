import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreVertical,
  CheckCircle2,
  Circle,
  Clock,
  User,
  Folder,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  CalendarDays,
  Sparkles,
  Layers,
  Filter,
  Check,
  X,
  Trash2,
  Edit2,
  Pencil,
  AlertTriangle,
  Flame,
  Activity,
  Users,
  LayoutList,
  Clock3,
  UserCheck,
  UserPlus,
  Briefcase,
  SlidersHorizontal,
  Play,
  Timer,
  Lock,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  getWeek,
  differenceInCalendarDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  type Task,
  type Employee,
  type Project,
  taskService,
  employeeService,
  projectService,
} from "@/lib/supabaseClient";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { ThemeToggleButton } from "@/lib/theme";

export type XiaomiCalendarViewMode = "standard" | "expanded" | "week";

interface XiaomiCalendarProps {
  onTaskChange?: () => void;
}

export const XiaomiCalendar: React.FC<XiaomiCalendarProps> = ({ onTaskChange }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<XiaomiCalendarViewMode>("standard");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>("all");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");

  // Quick note / task state
  const [quickNoteText, setQuickNoteText] = useState<string>("");
  const [quickNotes, setQuickNotes] = useState<{
    [dateKey: string]: { id: string; text: string; done: boolean }[];
  }>(() => {
    try {
      const saved = localStorage.getItem("xiaomi_calendar_quick_notes");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Task start hours mapping (persisted in localStorage)
  const [taskStartHours, setTaskStartHours] = useState<{ [taskId: string]: number }>(() => {
    try {
      const saved = localStorage.getItem("xiaomi_calendar_task_start_hours");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveTaskStartHours = (map: { [taskId: string]: number }) => {
    setTaskStartHours(map);
    try {
      localStorage.setItem("xiaomi_calendar_task_start_hours", JSON.stringify(map));
    } catch {}
  };

  // Modal creation state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskHours, setNewTaskHours] = useState(2);
  const [newTaskStartHour, setNewTaskStartHour] = useState<number>(8);
  const [newTaskIsAllDay, setNewTaskIsAllDay] = useState<boolean>(false);
  const [newTaskProjectId, setNewTaskProjectId] = useState<string>("none");
  const [newTaskEmployeeId, setNewTaskEmployeeId] = useState<string>("none");

  // Agenda sub-view toggle: 'cards' or 'hourly'
  const [agendaViewMode, setAgendaViewMode] = useState<"cards" | "hourly">("cards");
  const [inlineEditingTaskId, setInlineEditingTaskId] = useState<string | null>(null);
  const [inlineTitleValue, setInlineTitleValue] = useState<string>("");

  // Modal editing state (Task Edit Card requirement)
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskHours, setEditTaskHours] = useState(2);
  const [editTaskStartHour, setEditTaskStartHour] = useState<number>(8);
  const [editTaskIsAllDay, setEditTaskIsAllDay] = useState<boolean>(false);
  const [editTaskStartDate, setEditTaskStartDate] = useState("");
  const [editTaskEndDate, setEditTaskEndDate] = useState("");
  const [editTaskProjectId, setEditTaskProjectId] = useState<string>("none");
  const [editTaskEmployeeId, setEditTaskEmployeeId] = useState<string>("none");
  const [editTaskStatus, setEditTaskStatus] = useState<string>("pending");
  const [editTaskSpecialMarker, setEditTaskSpecialMarker] = useState<string>("none");

  // Drag interaction state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [liveHeight, setLiveHeight] = useState<number | null>(null);
  const dragStartYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const calendarBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, eData, pData] = await Promise.all([
        taskService.getAll(),
        employeeService.getAll(),
        projectService.getAll(),
      ]);
      setTasks(tData || []);
      setEmployees(eData || []);
      setProjects(pData || []);
    } catch (err) {
      console.error("Error loading calendar data:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveQuickNotes = (updated: typeof quickNotes) => {
    setQuickNotes(updated);
    try {
      localStorage.setItem("xiaomi_calendar_quick_notes", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddQuickNote = () => {
    if (!quickNoteText.trim()) return;
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    const existing = quickNotes[dateKey] || [];
    const newNote = {
      id: "note-" + Date.now(),
      text: quickNoteText.trim(),
      done: false,
    };
    const updated = { ...quickNotes, [dateKey]: [newNote, ...existing] };
    saveQuickNotes(updated);
    setQuickNoteText("");
  };

  const handleToggleQuickNote = (noteId: string) => {
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    const existing = quickNotes[dateKey] || [];
    const updatedNotes = existing.map((n) =>
      n.id === noteId ? { ...n, done: !n.done } : n
    );
    const updated = { ...quickNotes, [dateKey]: updatedNotes };
    saveQuickNotes(updated);
  };

  const handleDeleteQuickNote = (noteId: string) => {
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    const existing = quickNotes[dateKey] || [];
    const updatedNotes = existing.filter((n) => n.id !== noteId);
    const updated = { ...quickNotes, [dateKey]: updatedNotes };
    saveQuickNotes(updated);
  };

  // Helper to calculate exact daily planned hours for a task on a specific date
  const getTaskDailyHours = (task: Task, date: Date): number => {
    if (task.hours_per_day && task.hours_per_day > 0) {
      return task.hours_per_day;
    }
    if (task.repeats_weekly) {
      const repeatDays = task.repeat_days || [];
      const count = Math.max(1, repeatDays.length);
      return Math.round((task.estimated_time || 8) / count) || (task.hours_per_day || 8);
    }
    if (task.start_date && task.end_date && task.start_date.split("T")[0] !== task.end_date.split("T")[0]) {
      const startD = new Date(task.start_date.split("T")[0] + "T00:00:00");
      const endD = new Date(task.end_date.split("T")[0] + "T00:00:00");
      const dayOfWeekNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const taskEmp = employees.find((e) => e.id === task.assigned_employee_id);
      const empWorkingDays =
        taskEmp?.dias_de_trabalho && taskEmp.dias_de_trabalho.length > 0
          ? taskEmp.dias_de_trabalho
          : ["monday", "tuesday", "wednesday", "thursday", "friday"];
      let workingDays = 0;
      const cur = new Date(startD);
      while (cur <= endD) {
        if (empWorkingDays.includes(dayOfWeekNames[cur.getDay()])) {
          workingDays++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      const days = Math.max(1, workingDays);
      return Math.max(1, Math.round((task.estimated_time || 8) / days));
    }
    return Math.max(1, Math.round(task.estimated_time || 8));
  };

  const handleCreateNewTask = async () => {
    if (!newTaskTitle.trim()) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const finalHours = newTaskIsAllDay ? 8 : (Number(newTaskHours) || 2);
    try {
      const created = await taskService.create({
        name: newTaskTitle.trim(),
        description: newTaskDesc.trim() || null,
        estimated_time: finalHours,
        start_date: dateStr,
        end_date: dateStr,
        project_id: newTaskProjectId !== "none" ? newTaskProjectId : null,
        assigned_employee_id:
          newTaskEmployeeId !== "none"
            ? newTaskEmployeeId
            : selectedEmployeeFilter !== "all"
            ? selectedEmployeeFilter
            : null,
        status: "pending",
        special_marker: newTaskIsAllDay ? "all_day" : null,
      });

      if (created && created.id) {
        saveTaskStartHours({
          ...taskStartHours,
          [created.id]: newTaskStartHour,
        });
      }

      setIsNewTaskOpen(false);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskHours(2);
      setNewTaskIsAllDay(false);
      setNewTaskStartHour(8);
      await loadData();
      if (onTaskChange) onTaskChange();
    } catch (e) {
      console.error(e);
    }
  };

  // Open Edit Task dialog with existing data
  const handleOpenEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.name);
    setEditTaskDesc(task.description || "");
    const dailyH = getTaskDailyHours(task, selectedDate);
    setEditTaskHours(dailyH);
    setEditTaskIsAllDay(dailyH >= 7.5 || task.special_marker === "all_day");
    setEditTaskStartHour(taskStartHours[task.id] || 8);
    setEditTaskStartDate(task.start_date ? task.start_date.split("T")[0] : format(selectedDate, "yyyy-MM-dd"));
    setEditTaskEndDate(task.end_date ? task.end_date.split("T")[0] : format(selectedDate, "yyyy-MM-dd"));
    setEditTaskProjectId(task.project_id || "none");
    setEditTaskEmployeeId(task.assigned_employee_id || "none");
    setEditTaskStatus(task.status || "pending");
    setEditTaskSpecialMarker(task.special_marker || "none");
    setIsEditTaskOpen(true);
  };

  // Save edited task
  const handleSaveEditedTask = async () => {
    if (!editingTaskId || !editTaskTitle.trim()) return;
    try {
      const finalHours = editTaskIsAllDay ? 8 : (Number(editTaskHours) || 2);
      await taskService.update(editingTaskId, {
        name: editTaskTitle.trim(),
        description: editTaskDesc.trim() || null,
        estimated_time: finalHours,
        start_date: editTaskStartDate,
        end_date: editTaskEndDate || editTaskStartDate,
        project_id: editTaskProjectId !== "none" ? editTaskProjectId : null,
        assigned_employee_id: editTaskEmployeeId !== "none" ? editTaskEmployeeId : null,
        status: editTaskStatus,
        special_marker: editTaskIsAllDay ? "all_day" : (editTaskSpecialMarker !== "none" ? editTaskSpecialMarker : null),
        completion_date: editTaskStatus === "completed" ? new Date().toISOString() : null,
      });

      // Save start hour mapping
      saveTaskStartHours({
        ...taskStartHours,
        [editingTaskId]: editTaskStartHour,
      });

      setIsEditTaskOpen(false);
      setEditingTaskId(null);
      await loadData();
      if (onTaskChange) onTaskChange();
    } catch (e) {
      console.error("Error saving task:", e);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await taskService.delete(taskId);
      if (isEditTaskOpen && editingTaskId === taskId) {
        setIsEditTaskOpen(false);
        setEditingTaskId(null);
      }
      await loadData();
      if (onTaskChange) onTaskChange();
    } catch (e) {
      console.error("Error deleting task:", e);
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "completed" ? "in_progress" : "completed";
    try {
      await taskService.update(task.id, {
        status: newStatus,
        completion_date: newStatus === "completed" ? new Date().toISOString() : null,
      });
      await loadData();
      if (onTaskChange) onTaskChange();
    } catch (e) {
      console.error(e);
    }
  };

  // Helper: Get employee initials
  const getEmployeeInitials = (name?: string | null) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper: Distinct colorful background for collaborator avatar
  const getEmployeeAvatarBg = (name?: string | null) => {
    if (!name) return "bg-muted text-muted-foreground border border-border";
    const colors = [
      "bg-blue-600 text-white",
      "bg-emerald-600 text-white",
      "bg-violet-600 text-white",
      "bg-amber-600 text-white",
      "bg-rose-600 text-white",
      "bg-indigo-600 text-white",
      "bg-teal-600 text-white",
      "bg-cyan-600 text-white",
      "bg-fuchsia-600 text-white",
      "bg-sky-600 text-white",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // Direct Inline Update without opening modal
  const handleInlineUpdateTask = async (taskId: string, partial: Partial<Task>) => {
    try {
      // Optimistic state update
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const updated = { ...t, ...partial };
          if (partial.assigned_employee_id !== undefined) {
            updated.assigned_employee =
              employees.find((e) => e.id === partial.assigned_employee_id) || null;
          }
          if (partial.project_id !== undefined) {
            updated.project =
              projects.find((p) => p.id === partial.project_id) || null;
          }
          return updated;
        })
      );
      await taskService.update(taskId, partial as any);
      await loadData();
      if (onTaskChange) onTaskChange();
    } catch (e) {
      console.error("Error updating task inline:", e);
      loadData();
    }
  };

  // Start inline title editing
  const handleStartInlineEditTitle = (task: Task) => {
    setInlineEditingTaskId(task.id);
    setInlineTitleValue(task.name);
  };

  // Save inline title editing
  const handleSaveInlineTitle = async (taskId: string) => {
    if (!inlineTitleValue.trim()) {
      setInlineEditingTaskId(null);
      return;
    }
    const title = inlineTitleValue.trim();
    setInlineEditingTaskId(null);
    await handleInlineUpdateTask(taskId, { name: title });
  };

  // Trigger Clockify time tracking for task
  const handleStartTrackingTask = (task: Task) => {
    window.dispatchEvent(
      new CustomEvent("crono_pulse_start_tracking", {
        detail: {
          taskId: task.id,
          taskName: task.name,
          projectId: task.project_id,
          employeeId: task.assigned_employee_id,
        },
      })
    );
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedEmployeeFilter !== "all" && t.assigned_employee_id !== selectedEmployeeFilter) {
        return false;
      }
      if (selectedProjectFilter !== "all" && t.project_id !== selectedProjectFilter) {
        return false;
      }
      return true;
    });
  }, [tasks, selectedEmployeeFilter, selectedProjectFilter]);

  // Tasks mapped by Date key 'yyyy-MM-dd'
  const tasksByDate = useMemo(() => {
    const map: { [dateStr: string]: Task[] } = {};
    const dayOfWeekNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    filteredTasks.forEach((task) => {
      if (!task.start_date) return;
      const start = new Date(task.start_date + "T00:00:00");
      const end = task.end_date ? new Date(task.end_date + "T00:00:00") : start;

      const taskEmp = employees.find((e) => e.id === task.assigned_employee_id);
      const workingDays = taskEmp?.dias_de_trabalho && taskEmp.dias_de_trabalho.length > 0
        ? taskEmp.dias_de_trabalho
        : ["monday", "tuesday", "wednesday", "thursday", "friday"];

      const curr = new Date(start);
      while (curr <= end) {
        const dayName = dayOfWeekNames[curr.getDay()];
        // Respeita os dias de trabalho do colaborador responsável (não exibe em finais de semana a menos que trabalhe neles)
        if (workingDays.includes(dayName)) {
          const key = format(curr, "yyyy-MM-dd");
          if (!map[key]) map[key] = [];
          if (!map[key].some((t) => t.id === task.id)) {
            map[key].push(task);
          }
        }
        curr.setDate(curr.getDate() + 1);
      }
    });
    return map;
  }, [filteredTasks, employees]);

  // Daily Workload % calculation for selected collaborator(s)
  const getDayWorkload = (date: Date) => {
    const dayOfWeekNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayName = dayOfWeekNames[date.getDay()];
    const dateStr = format(date, "yyyy-MM-dd");

    // 1. Identify target employees
    const targetEmployees =
      selectedEmployeeFilter === "all"
        ? employees
        : employees.filter((e) => e.id === selectedEmployeeFilter);

    if (targetEmployees.length === 0) {
      return { allocatedHours: 0, capacityHours: 0, percentage: 0 };
    }

    // 2. Compute total daily capacity for the target employees on this weekday
    let totalCapacityHours = 0;
    targetEmployees.forEach((emp) => {
      const workingDays = emp.dias_de_trabalho && emp.dias_de_trabalho.length > 0
        ? emp.dias_de_trabalho
        : ["monday", "tuesday", "wednesday", "thursday", "friday"];

      if (workingDays.includes(dayName)) {
        const dailyCap = (emp.weekly_hours || 40) / Math.max(1, workingDays.length);
        totalCapacityHours += dailyCap;
      }
    });

    // 3. Compute allocated task hours on this date for the target employees
    let totalAllocatedHours = 0;
    const targetEmpIds = new Set(targetEmployees.map((e) => e.id));

    tasks.forEach((task) => {
      if (!task.assigned_employee_id || !targetEmpIds.has(task.assigned_employee_id)) {
        return;
      }

      const taskEmp = employees.find((e) => e.id === task.assigned_employee_id);
      const empWorkingDays = taskEmp?.dias_de_trabalho && taskEmp.dias_de_trabalho.length > 0
        ? taskEmp.dias_de_trabalho
        : ["monday", "tuesday", "wednesday", "thursday", "friday"];

      // Se este dia não é um dia de trabalho do colaborador, não há horas alocadas
      if (!empWorkingDays.includes(dayName)) {
        return;
      }

      // Check if task is active on this day
      if (task.repeats_weekly) {
        const repeatDays = task.repeat_days || [];
        if (repeatDays.includes(dayName)) {
          const taskStart = task.start_date ? task.start_date.split("T")[0] : "";
          const taskEnd = task.end_date ? task.end_date.split("T")[0] : "";
          if ((!taskStart || dateStr >= taskStart) && (!taskEnd || dateStr <= taskEnd)) {
            const h = task.hours_per_day || (task.estimated_time / Math.max(1, repeatDays.length || 5));
            totalAllocatedHours += h;
          }
        }
      } else {
        const taskStart = task.start_date ? task.start_date.split("T")[0] : "";
        const taskEnd = task.end_date ? task.end_date.split("T")[0] : taskStart;
        if (taskStart && dateStr >= taskStart && dateStr <= taskEnd) {
          const startD = new Date(taskStart + "T00:00:00");
          const endD = new Date(taskEnd + "T00:00:00");
          // Contar apenas dias de trabalho válidos no intervalo
          let countWorkingDays = 0;
          const curD = new Date(startD);
          while (curD <= endD) {
            const dName = dayOfWeekNames[curD.getDay()];
            if (empWorkingDays.includes(dName)) {
              countWorkingDays++;
            }
            curD.setDate(curD.getDate() + 1);
          }
          const validWorkingDays = Math.max(1, countWorkingDays);
          const h = task.hours_per_day || (task.estimated_time / validWorkingDays);
          totalAllocatedHours += h;
        }
      }
    });

    // 4. Calculate Percentage
    let percentage = 0;
    if (totalCapacityHours > 0) {
      percentage = Math.round((totalAllocatedHours / totalCapacityHours) * 100);
    } else if (totalAllocatedHours > 0) {
      percentage = 100;
    }

    return {
      allocatedHours: Number(totalAllocatedHours.toFixed(1)),
      capacityHours: Number(totalCapacityHours.toFixed(1)),
      percentage,
    };
  };

  // Helper for rendering workload percentage badge styling
  const renderWorkloadBadge = (percentage: number, isCurrentMonth: boolean = true) => {
    if (!isCurrentMonth) {
      return (
        <span className="text-[9px] font-medium text-muted-foreground/40">
          {percentage > 0 ? `${percentage}%` : ""}
        </span>
      );
    }

    if (percentage === 0) {
      return (
        <span className="text-[9px] font-medium text-muted-foreground/60">
          0%
        </span>
      );
    }

    if (percentage <= 80) {
      return (
        <span className="text-[9px] sm:text-[10px] font-semibold px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          {percentage}%
        </span>
      );
    }

    if (percentage <= 100) {
      return (
        <span className="text-[9px] sm:text-[10px] font-semibold px-1 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          {percentage}%
        </span>
      );
    }

    return (
      <span className="text-[9px] sm:text-[10px] font-bold px-1 py-0.2 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
        {percentage}%
      </span>
    );
  };

  // Calendar dates matrix
  const calendarWeeks = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const start = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 }); // Sunday start
    const end = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start, end });
    const weeks: { weekNumber: number; days: Date[] }[] = [];

    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7);
      const weekNum = getWeek(weekDays[0], { weekStartsOn: 0 });
      weeks.push({ weekNumber: weekNum, days: weekDays });
    }

    return weeks;
  }, [currentDate]);

  // Single week matrix for week view
  const currentWeekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });
    const weekNum = getWeek(days[0], { weekStartsOn: 0 });
    return { weekNumber: weekNum, days };
  }, [selectedDate]);

  // Selected date tasks & workload
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDateTasks = tasksByDate[selectedDateKey] || [];
  const selectedDateNotes = quickNotes[selectedDateKey] || [];
  const selectedDateWorkload = getDayWorkload(selectedDate);

  const selectedDateTotalHours = useMemo(() => {
    return selectedDateTasks.reduce((sum, t) => sum + getTaskDailyHours(t, selectedDate), 0);
  }, [selectedDateTasks, selectedDate, employees]);

  const selectedDateCompletedHours = useMemo(() => {
    return selectedDateTasks
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + getTaskDailyHours(t, selectedDate), 0);
  }, [selectedDateTasks, selectedDate, employees]);

  // All-day tasks (tasks spanning 7.5h+ or marked as all day)
  const allDayTasks = useMemo(() => {
    return selectedDateTasks.filter((t) => {
      const h = getTaskDailyHours(t, selectedDate);
      return h >= 7.5 || t.special_marker === "all_day";
    });
  }, [selectedDateTasks, selectedDate, employees]);

  // Hourly schedule calculation (07:00 to 20:00) with continuous multi-hour extensions closing the agenda
  const hourlySchedule = useMemo(() => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 to 20:00

    interface ScheduledItem {
      task: Task;
      startHour: number;
      duration: number;
      endHour: number;
      isAllDay: boolean;
    }

    const scheduledList: ScheduledItem[] = [];
    let currentHourOffset = 8; // Default workday starts at 08:00

    // Sort tasks: explicit startHour first, then all-day tasks, then others
    const sortedTasks = [...selectedDateTasks].sort((a, b) => {
      const aStart = taskStartHours[a.id];
      const bStart = taskStartHours[b.id];
      if (aStart !== undefined && bStart !== undefined) return aStart - bStart;
      if (aStart !== undefined) return -1;
      if (bStart !== undefined) return 1;
      const aH = getTaskDailyHours(a, selectedDate);
      const bH = getTaskDailyHours(b, selectedDate);
      return bH - aH;
    });

    sortedTasks.forEach((task) => {
      const dailyH = getTaskDailyHours(task, selectedDate);
      const isAllDay = dailyH >= 7.5 || task.special_marker === "all_day";
      const duration = isAllDay
        ? Math.max(8, Math.min(10, Math.round(dailyH)))
        : Math.max(1, Math.min(8, Math.round(dailyH)));

      let startH: number;
      if (taskStartHours[task.id] !== undefined) {
        startH = Math.max(7, Math.min(20, taskStartHours[task.id]));
      } else if (isAllDay) {
        startH = 8; // Full day shifts start at 08:00
      } else {
        startH = currentHourOffset;
        if (startH > 19) startH = 8;
      }

      const endH = Math.min(21, startH + duration);

      scheduledList.push({
        task,
        startHour: startH,
        duration,
        endHour: endH,
        isAllDay,
      });

      // Advance default hour offset for next unpinned task
      currentHourOffset = endH;
      if (currentHourOffset >= 20) currentHourOffset = 8;
    });

    // Populate every hour slot: slots within [startHour, endHour - 1] are OCCUPIED
    const schedule = hours.map((h) => {
      const covering = scheduledList.filter((item) => h >= item.startHour && h < item.endHour);

      const tasksForSlot = covering.map((item) => ({
        task: item.task,
        startHour: item.startHour,
        endHour: item.endHour,
        duration: item.duration,
        isStart: h === item.startHour,
        isContinuation: h > item.startHour,
        hourIndex: h - item.startHour,
        isAllDay: item.isAllDay,
      }));

      return {
        hour: h,
        timeLabel: `${h.toString().padStart(2, "0")}:00`,
        isOccupied: tasksForSlot.length > 0,
        tasks: tasksForSlot,
      };
    });

    return schedule;
  }, [selectedDateTasks, selectedDate, employees, taskStartHours]);

  const selectedDateOccupiedHoursCount = useMemo(() => {
    return hourlySchedule.filter((s) => s.isOccupied).length;
  }, [hourlySchedule]);

  // Drag handle logic with real-time continuous gesture tracking
  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    dragStartYRef.current = e.clientY;
    const initialH = calendarBodyRef.current
      ? calendarBodyRef.current.getBoundingClientRect().height
      : viewMode === "week"
      ? 80
      : viewMode === "standard"
      ? 280
      : 520;

    startHeightRef.current = initialH;
    setIsDragging(true);
    setLiveHeight(initialH);
  };

  const handleDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaY = e.clientY - dragStartYRef.current;
    const newH = Math.max(70, Math.min(850, startHeightRef.current + deltaY));
    setLiveHeight(newH);
  };

  const handleDragPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const target = e.currentTarget;
    try {
      target.releasePointerCapture(e.pointerId);
    } catch {}

    const deltaY = e.clientY - dragStartYRef.current;
    const finalH = startHeightRef.current + deltaY;

    setIsDragging(false);
    setLiveHeight(null);

    // If minimal movement (< 6px), it was a tap -> toggle mode
    if (Math.abs(deltaY) < 6) {
      toggleViewMode();
      return;
    }

    // Determine target snap based on final height
    if (finalH < 150) {
      setViewMode("week");
    } else if (finalH < 350) {
      setViewMode("standard");
    } else {
      setViewMode("expanded");
    }
  };

  const toggleViewMode = () => {
    if (viewMode === "week") setViewMode("standard");
    else if (viewMode === "standard") setViewMode("expanded");
    else setViewMode("week");
  };

  const jumpToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const nextPeriod = () => {
    const activeMode =
      isDragging && liveHeight !== null
        ? liveHeight < 150
          ? "week"
          : liveHeight < 350
          ? "standard"
          : "expanded"
        : viewMode;

    if (activeMode === "week") {
      const nextWeek = addWeeks(selectedDate, 1);
      setSelectedDate(nextWeek);
      setCurrentDate(nextWeek);
    } else {
      const nextMonth = addMonths(currentDate, 1);
      setCurrentDate(nextMonth);
    }
  };

  const prevPeriod = () => {
    const activeMode =
      isDragging && liveHeight !== null
        ? liveHeight < 150
          ? "week"
          : liveHeight < 350
          ? "standard"
          : "expanded"
        : viewMode;

    if (activeMode === "week") {
      const prevWeek = subWeeks(selectedDate, 1);
      setSelectedDate(prevWeek);
      setCurrentDate(prevWeek);
    } else {
      const prevMonth = subMonths(currentDate, 1);
      setCurrentDate(prevMonth);
    }
  };

  // Color generator for project tag pills matching Xiaomi Calendar style
  const getProjectTagColor = (projectId: string | null) => {
    if (!projectId) return "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium";
    const colors = [
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium",
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium",
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium",
      "bg-purple-500/15 text-purple-600 dark:text-purple-400 font-medium",
      "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-medium",
      "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-medium",
    ];
    let hash = 0;
    for (let i = 0; i < projectId.length; i++) {
      hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const weekdayNames = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."];
  const todayDayNumber = new Date().getDate();

  const selectedEmployeeName =
    selectedEmployeeFilter === "all"
      ? "Todos os Colaboradores"
      : employees.find((e) => e.id === selectedEmployeeFilter)?.name || "Colaborador";

  return (
    <div className="w-full max-w-4xl mx-auto rounded-none sm:rounded-2xl bg-card text-card-foreground shadow-2xl border border-border flex flex-col overflow-hidden select-none font-sans h-full max-h-full flex-1 relative transition-colors duration-200">
      {/* Top Header matching Xiaomi Calendar with App-wide Theme support */}
      <div className="flex-shrink-0 px-3 sm:px-4 pt-3 pb-2 flex items-center justify-between border-b border-border/80 bg-card">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="flex items-baseline space-x-1.5 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {currentDate.getFullYear()}{" "}
              <span className="capitalize font-medium text-muted-foreground">
                {format(currentDate, "MMM", { locale: ptBR })}
              </span>
            </h1>
          </div>

          {/* Month/Week Prev & Next */}
          <div className="flex items-center space-x-0.5 bg-muted/60 border border-border rounded-lg p-0.5 flex-shrink-0">
            <button
              onClick={prevPeriod}
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextPeriod}
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Action icons, Employee Selector & Theme Toggle */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          {/* Employee Capacity Filter Dropdown */}
          <div className="flex items-center">
            <Select
              value={selectedEmployeeFilter}
              onValueChange={setSelectedEmployeeFilter}
            >
              <SelectTrigger className="h-8 px-2 text-xs bg-muted/50 border-border max-w-[140px] sm:max-w-[180px] truncate">
                <Users className="h-3.5 w-3.5 mr-1 text-primary flex-shrink-0" />
                <SelectValue placeholder="Colaborador" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="all">Todos os Colaboradores</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({Math.round((emp.weekly_hours || 40) / 5)}h/dia)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View mode toggle pills */}
          <div className="hidden sm:flex items-center bg-muted/60 p-0.5 rounded-lg border border-border text-xs">
            <button
              onClick={() => setViewMode("week")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === "week"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode("standard")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === "standard"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewMode("expanded")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === "expanded"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Expandido
            </button>
          </div>

          {/* Jump to Today icon button */}
          <button
            onClick={jumpToToday}
            className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Ir para hoje"
          >
            <CalendarIcon className="h-5 w-5" />
            <span className="absolute inset-0 flex items-center justify-center pt-1 text-[9px] font-bold text-primary">
              {todayDayNumber}
            </span>
          </button>

          {/* App Light/Dark Theme Switcher */}
          <ThemeToggleButton variant="ghost" size="icon" className="h-8 w-8" />
        </div>
      </div>

      {/* Collaborator Active Capacity Sub-bar */}
      <div className="px-3 sm:px-4 py-1.5 bg-muted/30 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 truncate">
          <Activity className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <span className="truncate">
            Carga de: <strong className="text-foreground">{selectedEmployeeName}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> ≤80%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> 81-100%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> &gt;100%
          </span>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="flex-shrink-0 grid grid-cols-[24px_repeat(7,minmax(0,1fr))] sm:grid-cols-[36px_repeat(7,minmax(0,1fr))] px-1.5 pt-2 text-center text-xs font-semibold border-b border-border/50">
        <div className="text-[11px] text-muted-foreground/60 flex items-center justify-center">#</div>
        {weekdayNames.map((day, idx) => (
          <div
            key={day}
            className={`py-1 ${
              idx === 0 ? "text-rose-500" : idx === 6 ? "text-muted-foreground" : "text-muted-foreground"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* CALENDAR BODY */}
      <div
        ref={calendarBodyRef}
        style={{
          ...(isDragging && liveHeight !== null
            ? {
                height: `${liveHeight}px`,
                maxHeight: `${liveHeight}px`,
                overflowY:
                  (liveHeight < 150 ? "week" : liveHeight < 350 ? "standard" : "expanded") === "expanded"
                    ? "auto"
                    : "hidden",
                transition: "none",
              }
            : viewMode === "week"
            ? {
                height: "72px",
                maxHeight: "72px",
                overflowY: "hidden",
                transition: "height 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
              }
            : viewMode === "standard"
            ? {
                height: "276px",
                maxHeight: "276px",
                overflowY: "hidden",
                transition: "height 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
              }
            : {
                flex: "1 1 0%",
                minHeight: "360px",
                maxHeight: "100%",
                overflowY: "auto",
                transition: "all 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
              }),
        }}
        className="p-1.5 sm:p-2 select-none"
      >
        {/* VIEW MODE 1: WEEK VIEW */}
        {(isDragging && liveHeight !== null
          ? liveHeight < 150
            ? "week"
            : liveHeight < 350
            ? "standard"
            : "expanded"
          : viewMode) === "week" && (
          <div className="grid grid-cols-[24px_repeat(7,minmax(0,1fr))] sm:grid-cols-[36px_repeat(7,minmax(0,1fr))] gap-1">
            <div className="flex items-center justify-center text-xs font-semibold text-muted-foreground">
              {currentWeekDays.weekNumber}
            </div>
            {currentWeekDays.days.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const isTodayDate = isSameDay(date, new Date());
              const isSunday = date.getDay() === 0;
              const isSaturday = date.getDay() === 6;
              const dateKey = format(date, "yyyy-MM-dd");
              const dayTasks = tasksByDate[dateKey] || [];
              const dayNotes = quickNotes[dateKey] || [];
              const hasItems = dayTasks.length > 0 || dayNotes.length > 0;
              const workload = getDayWorkload(date);

              return (
                <button
                  key={dateKey}
                  onClick={() => {
                    setSelectedDate(date);
                    setCurrentDate(date);
                  }}
                  className={`min-w-0 relative flex flex-col items-center justify-center py-2 rounded-xl transition-all ${
                    isSelected
                      ? "ring-2 ring-primary bg-accent/80 text-foreground"
                      : "hover:bg-accent/40"
                  }`}
                >
                  <span
                    className={`text-sm sm:text-base font-semibold leading-none ${
                      isTodayDate
                        ? "text-primary font-bold"
                        : isSunday
                        ? "text-rose-500"
                        : isSaturday
                        ? "text-foreground/80"
                        : "text-foreground"
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  {/* Workload % badge for the week day */}
                  <div className="mt-1 flex items-center justify-center">
                    {renderWorkloadBadge(workload.percentage, true)}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* VIEW MODE 2: STANDARD MONTH VIEW */}
        {(isDragging && liveHeight !== null
          ? liveHeight < 150
            ? "week"
            : liveHeight < 350
            ? "standard"
            : "expanded"
          : viewMode) === "standard" && (
          <div className="space-y-1">
            {calendarWeeks.map((week, wIdx) => (
              <div
                key={wIdx}
                className="grid grid-cols-[24px_repeat(7,minmax(0,1fr))] sm:grid-cols-[36px_repeat(7,minmax(0,1fr))] gap-1 items-center"
              >
                <div className="flex items-center justify-center text-xs font-medium text-muted-foreground/60">
                  {week.weekNumber}
                </div>
                {week.days.map((date) => {
                  const isCurrentMonth = isSameMonth(date, currentDate);
                  const isSelected = isSameDay(date, selectedDate);
                  const isTodayDate = isSameDay(date, new Date());
                  const isSunday = date.getDay() === 0;
                  const isSaturday = date.getDay() === 6;
                  const dateKey = format(date, "yyyy-MM-dd");
                  const dayTasks = tasksByDate[dateKey] || [];
                  const dayNotes = quickNotes[dateKey] || [];
                  const hasItems = dayTasks.length > 0 || dayNotes.length > 0;
                  const workload = getDayWorkload(date);

                  return (
                    <button
                      key={dateKey}
                      onClick={() => {
                        setSelectedDate(date);
                        if (!isCurrentMonth) setCurrentDate(date);
                      }}
                      className={`min-w-0 relative flex flex-col items-center justify-center py-1.5 sm:py-2 rounded-xl transition-all ${
                        isSelected
                          ? "ring-2 ring-primary bg-accent/90 text-foreground font-bold shadow-sm"
                          : "hover:bg-accent/40"
                      }`}
                    >
                      <span
                        className={`text-xs sm:text-sm font-semibold leading-none ${
                          !isCurrentMonth
                            ? "text-muted-foreground/40"
                            : isTodayDate
                            ? "text-primary font-bold"
                            : isSunday
                            ? "text-rose-500"
                            : isSaturday
                            ? "text-foreground/80"
                            : "text-foreground"
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {/* Workload % badge on each day */}
                      <div className="mt-1 flex items-center justify-center">
                        {renderWorkloadBadge(workload.percentage, isCurrentMonth)}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* VIEW MODE 3: EXPANDED MONTH VIEW WITH EVENT TAGS & WORKLOAD % */}
        {(isDragging && liveHeight !== null
          ? liveHeight < 150
            ? "week"
            : liveHeight < 350
            ? "standard"
            : "expanded"
          : viewMode) === "expanded" && (
          <div className="space-y-1 sm:space-y-1.5">
            {calendarWeeks.map((week, wIdx) => (
              <div
                key={wIdx}
                className="grid grid-cols-[24px_repeat(7,minmax(0,1fr))] sm:grid-cols-[36px_repeat(7,minmax(0,1fr))] gap-1 items-stretch"
              >
                <div className="flex items-center justify-center text-xs font-semibold text-muted-foreground/60 pt-1">
                  {week.weekNumber}
                </div>
                {week.days.map((date) => {
                  const isCurrentMonth = isSameMonth(date, currentDate);
                  const isSelected = isSameDay(date, selectedDate);
                  const isTodayDate = isSameDay(date, new Date());
                  const isSunday = date.getDay() === 0;
                  const isSaturday = date.getDay() === 6;
                  const dateKey = format(date, "yyyy-MM-dd");
                  const dayTasks = tasksByDate[dateKey] || [];
                  const dayNotes = quickNotes[dateKey] || [];
                  const totalCount = dayTasks.length + dayNotes.length;
                  const workload = getDayWorkload(date);

                  return (
                    <div
                      key={dateKey}
                      onClick={() => {
                        setSelectedDate(date);
                        if (!isCurrentMonth) setCurrentDate(date);
                      }}
                      className={`min-w-0 w-full overflow-hidden min-h-[76px] sm:min-h-[96px] md:min-h-[118px] p-1 rounded-lg border transition-all cursor-pointer flex flex-col justify-start gap-0.5 ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary"
                          : isCurrentMonth
                          ? "border-border/80 bg-card hover:bg-accent/40"
                          : "border-border/40 bg-muted/20 opacity-40"
                      }`}
                    >
                      {/* Top Day Header: Date number + % Workload badge + extra tag counter */}
                      <div className="flex items-center justify-between px-0.5">
                        <span
                          className={`text-xs sm:text-sm font-bold leading-none ${
                            !isCurrentMonth
                              ? "text-muted-foreground/50"
                              : isTodayDate
                              ? "text-primary"
                              : isSunday
                              ? "text-rose-500"
                              : "text-foreground"
                          }`}
                        >
                          {date.getDate()}
                        </span>

                        <div className="flex items-center gap-0.5">
                          {renderWorkloadBadge(workload.percentage, isCurrentMonth)}
                          {totalCount > 3 && (
                            <span className="text-[8px] font-bold text-muted-foreground bg-muted px-0.5 rounded">
                              +{totalCount - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mini pills inside the expanded day cell */}
                      <div className="space-y-0.5 overflow-hidden flex-1 min-w-0 w-full flex flex-col">
                        {dayTasks.slice(0, 3).map((t) => (
                          <div
                            key={t.id}
                            className={`min-w-0 w-full truncate block text-[8px] sm:text-[9px] px-1 py-0.5 rounded leading-tight text-center ${getProjectTagColor(
                              t.project_id
                            )}`}
                            title={`${t.name} (${t.estimated_time}h)`}
                          >
                            {t.name}
                          </div>
                        ))}
                        {dayNotes.slice(0, Math.max(0, 3 - dayTasks.length)).map((n) => (
                          <div
                            key={n.id}
                            className="min-w-0 w-full truncate block text-[8px] sm:text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground leading-tight text-center"
                            title={n.text}
                          >
                            • {n.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DRAG HANDLE BAR `_` (Interactive Xiaomi Style with real-time gesture feedback) */}
      <div
        className="flex-shrink-0 w-full flex flex-col items-center justify-center py-2.5 cursor-row-resize touch-none select-none hover:bg-muted/60 active:bg-muted transition-colors border-t border-b border-border group"
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerUp}
        onPointerCancel={handleDragPointerUp}
        title="Arraste para cima/baixo para expandir ou recolher o calendário"
      >
        <div
          className={`h-1 rounded-full transition-all duration-200 ${
            isDragging
              ? "w-16 bg-primary scale-110 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
              : "w-12 bg-muted-foreground/60 group-hover:bg-foreground/60"
          }`}
        />
      </div>

      {/* BOTTOM AGENDA / TASKS & NOTES CARD */}
      <div className="flex-1 min-h-0 p-3 sm:p-4 bg-muted/20 overflow-y-auto space-y-3 relative pb-20">
        {/* Daily Capacity Overview Banner for Selected Date */}
        <div className="p-3 rounded-xl border border-border bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                Carga do Dia: {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {selectedEmployeeName}:{" "}
              <strong className="text-foreground">
                {selectedDateWorkload.allocatedHours}h alocadas
              </strong>{" "}
              de{" "}
              <strong className="text-foreground">
                {selectedDateWorkload.capacityHours}h capacidade
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-28 sm:w-36 bg-muted rounded-full h-2.5 overflow-hidden border border-border">
              <div
                className={`h-full transition-all duration-300 ${
                  selectedDateWorkload.percentage <= 80
                    ? "bg-emerald-500"
                    : selectedDateWorkload.percentage <= 100
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(100, selectedDateWorkload.percentage)}%` }}
              />
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                selectedDateWorkload.percentage <= 80
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : selectedDateWorkload.percentage <= 100
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
              }`}
            >
              {selectedDateWorkload.percentage}%
            </span>
          </div>
        </div>

        {/* Selected Day Header & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground px-1">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-foreground capitalize">
              Tarefas Agendadas
            </span>
            <Badge variant="outline" className="text-[10px]">
              {selectedDateTasks.length} tarefa(s)
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Cards vs Hourly */}
            <div className="flex items-center p-0.5 rounded-lg bg-muted border border-border">
              <button
                type="button"
                onClick={() => setAgendaViewMode("cards")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  agendaViewMode === "cards"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visualização em Cards com Edição Direta"
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setAgendaViewMode("hourly")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  agendaViewMode === "hourly"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visualização por Horários do Dia"
              >
                <Clock3 className="h-3.5 w-3.5 text-primary" />
                <span>Horas do Dia</span>
              </button>
            </div>

            <button
              onClick={() => setIsNewTaskOpen(true)}
              className="text-primary hover:underline text-xs font-semibold flex items-center gap-1 ml-1"
            >
              <Plus className="h-3.5 w-3.5" /> Nova Tarefa
            </button>
          </div>
        </div>

        {/* VIEW 1: CARDS VIEW (WITH INLINE EDITING & 2-CLICK FULL MODAL) */}
        {agendaViewMode === "cards" && (
          <div className="space-y-2.5">
            {selectedDateTasks.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-border rounded-xl bg-card/40">
                <CalendarDays className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">
                  Nenhuma tarefa para este dia
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Toque no botão + ou digite abaixo para adicionar
                </p>
              </div>
            ) : (
              <>
                {selectedDateTasks.map((task) => {
                  const isCompleted = task.status === "completed";
                  const isInProgress = task.status === "in_progress";
                  const isEditingInline = inlineEditingTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      onDoubleClick={() => handleOpenEditTask(task)}
                      className={`p-3 rounded-xl border transition-all space-y-2.5 group cursor-default select-none ${
                        isCompleted
                          ? "bg-card/40 border-border opacity-80"
                          : "bg-card border-border hover:border-primary/50 shadow-sm"
                      }`}
                      title="Dê 2 cliques para abrir modal completo de edição"
                    >
                      {/* Top Row: Checkbox, Title (inline editable) & Fast Action buttons */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          {/* Checkbox toggle status */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTaskStatus(task);
                            }}
                            className="mt-0.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                            title={isCompleted ? "Marcar como pendente" : "Concluir tarefa"}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <Circle className="h-5 w-5" />
                            )}
                          </button>

                          {/* Task Title & Inline Editing input */}
                          <div className="flex-1 min-w-0">
                            {isEditingInline ? (
                              <div
                                className="flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Input
                                  value={inlineTitleValue}
                                  onChange={(e) => setInlineTitleValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveInlineTitle(task.id);
                                    if (e.key === "Escape") setInlineEditingTaskId(null);
                                  }}
                                  autoFocus
                                  className="h-7 text-xs font-semibold bg-background py-1"
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                                  onClick={() => handleSaveInlineTitle(task.id)}
                                  title="Salvar título"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground"
                                  onClick={() => setInlineEditingTaskId(null)}
                                  title="Cancelar"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4
                                  className={`text-sm font-semibold leading-snug break-words ${
                                    isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                                  }`}
                                >
                                  {task.name}
                                </h4>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartInlineEditTitle(task);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-0.5 rounded"
                                  title="Editar título diretamente"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                {task.special_marker && task.special_marker !== "none" && (
                                  <Badge className="text-[9px] h-4 bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-300">
                                    {task.special_marker.replace("_", " ")}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {task.description && !isEditingInline && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Fast Edit, Track & Delete Action Buttons */}
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {/* Quick Clockify Track Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTrackingTask(task);
                            }}
                            className="h-7 px-2 text-xs font-semibold text-primary hover:bg-primary/10 gap-1"
                            title="Iniciar rastreamento de tempo (Clockify)"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span className="hidden sm:inline text-[11px]">Rastrear</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditTask(task);
                            }}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                            title="Abrir modal completo (ou dê 2 cliques no card)"
                          >
                            <Pencil className="h-3 w-3" />
                            <span className="hidden sm:inline text-[11px]">Modal</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task.id);
                            }}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Excluir tarefa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Bottom Row: Direct Inline Controls (Responsible, Project, Hours, Status) */}
                      <div
                        className="flex items-center justify-between gap-2 pt-1 border-t border-border/60 flex-wrap text-[11px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* 1. Responsável Identificado com Avatar + Seletor Direto Inline */}
                        <div className="flex items-center gap-1.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/60 hover:bg-muted border border-border transition-colors text-left group/emp"
                                title="Clique para alterar o responsável diretamente"
                              >
                                {task.assigned_employee ? (
                                  <>
                                    <div
                                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${getEmployeeAvatarBg(
                                        task.assigned_employee.name
                                      )}`}
                                    >
                                      {getEmployeeInitials(task.assigned_employee.name)}
                                    </div>
                                    <span className="font-medium text-foreground max-w-[120px] truncate">
                                      {task.assigned_employee.name}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground italic">Sem responsável</span>
                                  </>
                                )}
                                <ChevronDown className="h-2.5 w-2.5 text-muted-foreground group-hover/emp:text-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 bg-popover border-border">
                              <DropdownMenuLabel className="text-xs">Atribuir Responsável</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleInlineUpdateTask(task.id, { assigned_employee_id: null })
                                }
                                className="text-xs flex items-center justify-between"
                              >
                                <span className="text-muted-foreground">Nenhum (Sem responsável)</span>
                                {!task.assigned_employee_id && <Check className="h-3.5 w-3.5 text-primary" />}
                              </DropdownMenuItem>
                              {employees.map((emp) => {
                                const isCurrent = task.assigned_employee_id === emp.id;
                                return (
                                  <DropdownMenuItem
                                    key={emp.id}
                                    onClick={() =>
                                      handleInlineUpdateTask(task.id, { assigned_employee_id: emp.id })
                                    }
                                    className="text-xs flex items-center justify-between gap-2"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div
                                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${getEmployeeAvatarBg(
                                          emp.name
                                        )}`}
                                      >
                                        {getEmployeeInitials(emp.name)}
                                      </div>
                                      <span className="truncate">{emp.name}</span>
                                    </div>
                                    {isCurrent && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* 2. Projeto Seletor Direto Inline */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 hover:bg-muted border border-border transition-colors text-left"
                                title="Clique para alterar o projeto diretamente"
                              >
                                <Folder className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground max-w-[100px] truncate">
                                  {task.project ? task.project.name : "Sem projeto"}
                                </span>
                                <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 bg-popover border-border">
                              <DropdownMenuLabel className="text-xs">Vincular a Projeto</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleInlineUpdateTask(task.id, { project_id: null })}
                                className="text-xs flex items-center justify-between"
                              >
                                <span className="text-muted-foreground">Nenhum</span>
                                {!task.project_id && <Check className="h-3.5 w-3.5 text-primary" />}
                              </DropdownMenuItem>
                              {projects.map((proj) => {
                                const isCurrent = task.project_id === proj.id;
                                return (
                                  <DropdownMenuItem
                                    key={proj.id}
                                    onClick={() => handleInlineUpdateTask(task.id, { project_id: proj.id })}
                                    className="text-xs flex items-center justify-between gap-2"
                                  >
                                    <span className="truncate">{proj.name}</span>
                                    {isCurrent && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* 3. Horas (Duration Stepper) & Status Selector */}
                        <div className="flex items-center gap-2">
                          {/* Stepper de Horas */}
                          <div
                            className="flex items-center bg-muted/60 border border-border rounded-md px-1 py-0.5"
                            title="Ajustar horas estimadas diretamente"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const nextH = Math.max(1, (task.estimated_time || 2) - 1);
                                handleInlineUpdateTask(task.id, { estimated_time: nextH });
                              }}
                              className="h-4 w-4 flex items-center justify-center rounded hover:bg-card text-muted-foreground hover:text-foreground text-xs font-bold"
                            >
                              -
                            </button>
                            <span className="font-semibold text-foreground px-1.5 flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5 text-primary" />
                              {task.estimated_time || 2}h
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const nextH = Math.min(24, (task.estimated_time || 2) + 1);
                                handleInlineUpdateTask(task.id, { estimated_time: nextH });
                              }}
                              className="h-4 w-4 flex items-center justify-center rounded hover:bg-card text-muted-foreground hover:text-foreground text-xs font-bold"
                            >
                              +
                            </button>
                          </div>

                          {/* Seletor Rápido de Status */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={`px-2 py-0.5 rounded-md font-semibold text-[10px] flex items-center gap-1 border transition-colors ${
                                  isCompleted
                                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                    : isInProgress
                                    ? "bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400"
                                    : "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                }`}
                                title="Alterar status diretamente"
                              >
                                <span>
                                  {isCompleted
                                    ? "Concluída"
                                    : isInProgress
                                    ? "Em Andamento"
                                    : "Pendente"}
                                </span>
                                <ChevronDown className="h-2.5 w-2.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36 bg-popover border-border text-xs">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleInlineUpdateTask(task.id, {
                                    status: "pending",
                                    completion_date: null,
                                  })
                                }
                                className="flex items-center justify-between text-amber-600 dark:text-amber-400"
                              >
                                <span>Pendente</span>
                                {task.status === "pending" && <Check className="h-3 w-3" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleInlineUpdateTask(task.id, {
                                    status: "in_progress",
                                    completion_date: null,
                                  })
                                }
                                className="flex items-center justify-between text-blue-600 dark:text-blue-400"
                              >
                                <span>Em Andamento</span>
                                {task.status === "in_progress" && <Check className="h-3 w-3" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleInlineUpdateTask(task.id, {
                                    status: "completed",
                                    completion_date: new Date().toISOString(),
                                  })
                                }
                                className="flex items-center justify-between text-emerald-600 dark:text-emerald-400"
                              >
                                <span>Concluída</span>
                                {task.status === "completed" && <Check className="h-3 w-3" />}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* VIEW 2: HOURLY SCHEDULE VIEW (Visão por Horas do Dia - Google Agenda Style) */}
        {agendaViewMode === "hourly" && (
          <div className="space-y-3 border border-border rounded-xl bg-card/60 p-3.5 shadow-xs">
            {/* Google Agenda Header for the Selected Day */}
            <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex flex-col items-center justify-center font-bold text-sm shadow-sm ${
                    isSameDay(selectedDate, new Date())
                      ? "bg-primary text-primary-foreground shadow-primary/30"
                      : "bg-muted text-foreground border border-border"
                  }`}
                >
                  <span className="leading-none">{format(selectedDate, "d")}</span>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {format(selectedDate, "EEEE", { locale: ptBR })}
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {format(selectedDate, "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </div>
                </div>
              </div>

              {/* Total Hours Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-xs font-semibold px-2.5 py-1 bg-muted/60 border-border text-foreground flex items-center gap-1.5"
                >
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>{selectedDateTotalHours}h planejadas</span>
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 ${
                    selectedDateOccupiedHoursCount >= 8
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-primary/10 border-primary/20 text-primary"
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>{selectedDateOccupiedHoursCount}h ocupadas</span>
                  {selectedDateOccupiedHoursCount >= 8 && (
                    <span className="hidden sm:inline font-bold">• Agenda Fechada</span>
                  )}
                </Badge>
                {selectedDateCompletedHours > 0 && (
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{selectedDateCompletedHours}h concluídas</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* All-Day Tasks Banner (Google Agenda Style) */}
            {allDayTasks.length > 0 && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-2 mb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1 shadow-xs">
                      <CalendarDays className="h-3.5 w-3.5" />
                      O Dia Todo
                    </Badge>
                    <span className="text-xs font-bold text-foreground">
                      {allDayTasks.length === 1
                        ? "1 tarefa ocupa o dia inteiro"
                        : `${allDayTasks.length} tarefas ocupam o dia inteiro`}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Lock className="h-3 w-3 text-primary" />
                    Fechando a agenda ao longo do expediente (08:00 às 16:00/17:00)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allDayTasks.map((task) => {
                    const isCompleted = task.status === "completed";
                    const dailyH = getTaskDailyHours(task, selectedDate);
                    return (
                      <div
                        key={task.id}
                        onDoubleClick={() => handleOpenEditTask(task)}
                        className="p-2.5 rounded-lg bg-card/90 border border-border flex items-center justify-between gap-2 shadow-xs cursor-pointer hover:border-primary transition-all"
                        title="Dê 2 cliques para editar"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTaskStatus(task);
                            }}
                            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p
                              className={`text-xs font-bold truncate ${
                                isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                              }`}
                            >
                              {task.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {task.project?.name || "Sem projeto"} •{" "}
                              {task.assigned_employee?.name || "Sem responsável"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 shrink-0 font-mono font-semibold"
                        >
                          08:00 - 16:00 ({dailyH}h)
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hourly Grid Rows */}
            <div className="divide-y divide-border/60 relative">
              {hourlySchedule.map((slot) => {
                const isCurrentHour =
                  isSameDay(selectedDate, new Date()) &&
                  new Date().getHours() === slot.hour;

                return (
                  <div
                    key={slot.hour}
                    className={`py-2 flex items-start gap-3 group/hour transition-colors rounded-lg px-2 relative ${
                      isCurrentHour ? "bg-primary/5" : "hover:bg-muted/30"
                    }`}
                  >
                    {/* Time Label */}
                    <div className="w-14 flex-shrink-0 pt-1 text-right">
                      <span
                        className={`text-xs font-bold transition-colors ${
                          isCurrentHour
                            ? "text-red-500 font-extrabold"
                            : slot.isOccupied
                            ? "text-foreground font-bold"
                            : "text-muted-foreground group-hover/hour:text-primary"
                        }`}
                      >
                        {slot.timeLabel}
                      </span>
                    </div>

                    {/* Task Slots or Empty Slot */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Current Time Indicator Line if in current hour */}
                      {isCurrentHour && (
                        <div className="flex items-center gap-1.5 my-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm animate-pulse shrink-0" />
                          <div className="h-[2px] bg-red-500/80 flex-1 rounded-full" />
                          <span className="text-[10px] font-mono font-bold text-red-500 shrink-0">
                            {format(new Date(), "HH:mm")}
                          </span>
                        </div>
                      )}

                      {slot.isOccupied ? (
                        slot.tasks.map((taskSlot) => {
                          const { task, startHour, duration, endHour, isStart, isContinuation, hourIndex, isAllDay } = taskSlot;
                          const isCompleted = task.status === "completed";

                          // CASE 1: START OF TASK CARD
                          if (isStart) {
                            return (
                              <div
                                key={`${task.id}-start`}
                                onDoubleClick={() => handleOpenEditTask(task)}
                                className={`p-2.5 rounded-xl border border-l-4 transition-all flex flex-col justify-between gap-2 cursor-pointer select-none ${
                                  isCompleted
                                    ? "bg-muted/40 border-border border-l-emerald-500 opacity-80"
                                    : "bg-card border-border border-l-primary hover:border-primary/60 shadow-xs hover:shadow-md"
                                }`}
                                title="Dê 2 cliques para abrir modal de edição"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleTaskStatus(task);
                                      }}
                                      className="text-muted-foreground hover:text-primary flex-shrink-0 transition-colors"
                                      title={isCompleted ? "Marcar como pendente" : "Concluir tarefa"}
                                    >
                                      {isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                      ) : (
                                        <Circle className="h-4 w-4" />
                                      )}
                                    </button>

                                    <div className="min-w-0 flex-1 space-y-0.5">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                          className={`text-xs font-bold ${
                                            isCompleted
                                              ? "line-through text-muted-foreground"
                                              : "text-foreground"
                                          }`}
                                        >
                                          {task.name}
                                        </span>
                                        <Badge
                                          variant="secondary"
                                          className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 font-mono font-semibold"
                                        >
                                          {startHour.toString().padStart(2, "0")}:00 -{" "}
                                          {endHour.toString().padStart(2, "0")}:00 ({duration}h)
                                        </Badge>
                                        {isAllDay && (
                                          <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-primary/30 font-semibold flex items-center gap-1">
                                            <Lock className="h-2.5 w-2.5" />
                                            O Dia Todo
                                          </Badge>
                                        )}
                                        {task.actual_time && task.actual_time > 0 ? (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono"
                                            title="Tempo real rastreado"
                                          >
                                            Executado: {task.actual_time}h
                                          </Badge>
                                        ) : null}
                                      </div>
                                      {task.project && (
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                          <Folder className="h-2.5 w-2.5 text-primary" />
                                          {task.project.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Assignee and Action Buttons */}
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {task.assigned_employee ? (
                                      <div
                                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] font-medium"
                                        title={`Responsável: ${task.assigned_employee.name}`}
                                      >
                                        <div
                                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${getEmployeeAvatarBg(
                                            task.assigned_employee.name
                                          )}`}
                                        >
                                          {getEmployeeInitials(task.assigned_employee.name)}
                                        </div>
                                        <span className="truncate max-w-[90px]">
                                          {task.assigned_employee.name}
                                        </span>
                                      </div>
                                    ) : null}

                                    {/* Quick Shift Start Hour Dropdown */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={(e) => e.stopPropagation()}
                                          className="h-6 px-1.5 rounded bg-muted/60 hover:bg-muted text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border flex items-center gap-0.5"
                                          title="Alterar horário de início da tarefa"
                                        >
                                          <Clock className="h-2.5 w-2.5 text-primary" />
                                          <span>{startHour.toString().padStart(2, "0")}h</span>
                                          <ChevronDown className="h-2.5 w-2.5" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-36 max-h-48 overflow-y-auto">
                                        <DropdownMenuLabel className="text-xs">Mudar Início</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {Array.from({ length: 14 }, (_, i) => i + 7).map((h) => (
                                          <DropdownMenuItem
                                            key={h}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              saveTaskStartHours({
                                                ...taskStartHours,
                                                [task.id]: h,
                                              });
                                            }}
                                            className="text-xs flex items-center justify-between"
                                          >
                                            <span>{h.toString().padStart(2, "0")}:00</span>
                                            {h === startHour && <Check className="h-3.5 w-3.5 text-primary" />}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Quick Play / Track in Clockify */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartTrackingTask(task);
                                      }}
                                      className="h-6 px-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 gap-1"
                                      title="Iniciar rastreamento (Clockify)"
                                    >
                                      <Play className="h-3 w-3 fill-current" />
                                      <span className="hidden sm:inline">Rastrear</span>
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditTask(task);
                                      }}
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                      title="Editar tarefa"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Continuous Extension Indicator at bottom of start card if multi-hour */}
                                {duration > 1 && (
                                  <div className="flex items-center justify-between text-[10px] text-primary pt-1.5 border-t border-border/50 font-medium bg-primary/5 -mx-2.5 -mb-2.5 px-3 py-1 rounded-b-xl">
                                    <div className="flex items-center gap-1.5">
                                      <ChevronDown className="h-3 w-3 animate-pulse" />
                                      <span>
                                        Estende-se por {duration} horas até às{" "}
                                        {endHour.toString().padStart(2, "0")}:00 fechando a agenda
                                      </span>
                                    </div>
                                    <span className="text-muted-foreground font-mono">
                                      1 de {duration}h
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // CASE 2: CONTINUATION OF MULTI-HOUR / ALL-DAY TASK (OCCUPIED SLOT)
                          if (isContinuation) {
                            const isLastHour = hourIndex === duration - 1;
                            return (
                              <div
                                key={`${task.id}-cont-${slot.hour}`}
                                onDoubleClick={() => handleOpenEditTask(task)}
                                className={`px-3 py-1.5 border border-l-4 transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none bg-primary/5 dark:bg-primary/10 border-r border-t-0 hover:bg-primary/10 ${
                                  isCompleted
                                    ? "border-l-emerald-500/70"
                                    : "border-l-primary/70"
                                } ${
                                  isLastHour
                                    ? "rounded-b-xl border-b border-border/70"
                                    : "border-b border-border/30"
                                }`}
                                title={`Horário ocupado por "${task.name}". Dê 2 cliques para editar.`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <span
                                    className={`text-xs font-semibold truncate ${
                                      isCompleted
                                        ? "line-through text-muted-foreground"
                                        : "text-foreground"
                                    }`}
                                  >
                                    ↳ {task.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                                    • Horário Ocupado ({startHour.toString().padStart(2, "0")}:00 às{" "}
                                    {endHour.toString().padStart(2, "0")}:00)
                                  </span>
                                  {isAllDay && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1 py-0 h-3.5 bg-primary/15 text-primary border-primary/20 shrink-0 font-medium"
                                    >
                                      Dia Todo
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] px-1.5 py-0 h-3.5 font-mono text-muted-foreground shrink-0"
                                  >
                                    {hourIndex + 1} de {duration}h
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {task.assigned_employee && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-background/80 border border-border/60 text-[10px]">
                                      <div
                                        className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold ${getEmployeeAvatarBg(
                                          task.assigned_employee.name
                                        )}`}
                                      >
                                        {getEmployeeInitials(task.assigned_employee.name)}
                                      </div>
                                      <span className="truncate max-w-[70px] text-muted-foreground">
                                        {task.assigned_employee.name}
                                      </span>
                                    </div>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditTask(task);
                                    }}
                                    className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                                  >
                                    Editar
                                  </Button>
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })
                      ) : (
                        <div
                          onClick={() => {
                            setNewTaskStartHour(slot.hour);
                            setNewTaskHours(1);
                            setNewTaskIsAllDay(false);
                            setIsNewTaskOpen(true);
                          }}
                          className="h-7 border border-dashed border-border/70 rounded-md flex items-center px-3 text-[11px] text-muted-foreground/60 hover:text-primary hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-all gap-1.5"
                          title={`Clique para agendar nova tarefa às ${slot.timeLabel}`}
                        >
                          <Plus className="h-3 w-3 opacity-60" />
                          <span>Disponível • Agendar às {slot.timeLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Notes / Anotações Card (Xiaomi Style) */}
        <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>Anotações Rápidas do Dia</span>
            <span className="text-[10px] text-muted-foreground">
              {selectedDateNotes.length} anotação(ões)
            </span>
          </div>

          {/* Existing Quick Notes list */}
          {selectedDateNotes.length > 0 && (
            <div className="space-y-1.5 pb-1">
              {selectedDateNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between gap-2 text-xs bg-muted/40 p-2 rounded-lg border border-border"
                >
                  <div
                    onClick={() => handleToggleQuickNote(note.id)}
                    className="flex items-center space-x-2 flex-1 cursor-pointer"
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        note.done
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-muted-foreground"
                      }`}
                    >
                      {note.done && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                    <span
                      className={
                        note.done ? "line-through text-muted-foreground" : "text-foreground"
                      }
                    >
                      {note.text}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteQuickNote(note.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick task note input */}
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Toque para adicionar uma nota rápida..."
              value={quickNoteText}
              onChange={(e) => setQuickNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddQuickNote();
              }}
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={handleAddQuickNote}
              disabled={!quickNoteText.trim()}
              className="text-xs bg-primary hover:bg-primary/90 disabled:opacity-30 text-primary-foreground px-2.5 py-1 rounded-md font-medium transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING ACTION BUTTONS (Matching Xiaomi Fig 1 & Fig 3) */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center space-x-3 z-30 pointer-events-auto">
        {/* Today Badge Button */}
        <button
          onClick={jumpToToday}
          className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base flex items-center justify-center shadow-xl shadow-primary/30 transition-transform active:scale-95"
          title="Ir para o dia de hoje"
        >
          {todayDayNumber}
        </button>

        {/* Create Task Plus Button */}
        <button
          onClick={() => setIsNewTaskOpen(true)}
          className="w-12 h-12 rounded-full bg-card hover:bg-accent border border-border text-foreground flex items-center justify-center shadow-xl transition-transform active:scale-95"
          title="Criar nova tarefa"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* DIALOG: CREATE NEW TASK */}
      <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
        <DialogContent className="max-w-md bg-card border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Nova Tarefa</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Agendada para {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="task-title">Título da Tarefa *</Label>
              <Input
                id="task-title"
                placeholder="Ex: Refatoração do Módulo, Documentação..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-desc">Descrição (opcional)</Label>
              <Textarea
                id="task-desc"
                placeholder="Detalhes adicionais e objetivos..."
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="bg-background border-border h-16"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Projeto</Label>
                <Select value={newTaskProjectId} onValueChange={setNewTaskProjectId}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Responsável</Label>
                <Select value={newTaskEmployeeId} onValueChange={setNewTaskEmployeeId}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="none">Nenhum</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="task-start-hour">Horário de Início</Label>
                <Select
                  value={newTaskStartHour.toString()}
                  onValueChange={(val) => setNewTaskStartHour(Number(val))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Início..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-48">
                    {Array.from({ length: 14 }, (_, i) => i + 7).map((h) => (
                      <SelectItem key={h} value={h.toString()}>
                        {h.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="task-hours">Horas</Label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !newTaskIsAllDay;
                      setNewTaskIsAllDay(next);
                      if (next) {
                        setNewTaskHours(8);
                        setNewTaskStartHour(8);
                      }
                    }}
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                      newTaskIsAllDay
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {newTaskIsAllDay ? "✓ Dia Todo (8h)" : "Dia Todo (8h)"}
                  </button>
                </div>
                <Input
                  id="task-hours"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={newTaskHours}
                  disabled={newTaskIsAllDay}
                  onChange={(e) => setNewTaskHours(Number(e.target.value))}
                  className="bg-background border-border"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsNewTaskOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateNewTask}
              disabled={!newTaskTitle.trim()}
              className="bg-primary text-primary-foreground"
            >
              Adicionar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDIT EXISTING TASK (Requirement: Card de Tarefas Editável) */}
      <Dialog open={isEditTaskOpen} onOpenChange={setIsEditTaskOpen}>
        <DialogContent className="max-w-md bg-card border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Editar Tarefa
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Atualize as informações, responsável e carga horária da tarefa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="edit-task-title">Título da Tarefa *</Label>
              <Input
                id="edit-task-title"
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-task-desc">Descrição</Label>
              <Textarea
                id="edit-task-desc"
                value={editTaskDesc}
                onChange={(e) => setEditTaskDesc(e.target.value)}
                className="bg-background border-border h-16"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Projeto</Label>
                <Select value={editTaskProjectId} onValueChange={setEditTaskProjectId}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Responsável</Label>
                <Select value={editTaskEmployeeId} onValueChange={setEditTaskEmployeeId}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="none">Nenhum</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-task-start-hour">Horário de Início</Label>
                <Select
                  value={editTaskStartHour.toString()}
                  onValueChange={(val) => setEditTaskStartHour(Number(val))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Início..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-48">
                    {Array.from({ length: 14 }, (_, i) => i + 7).map((h) => (
                      <SelectItem key={h} value={h.toString()}>
                        {h.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-task-hours">Horas</Label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !editTaskIsAllDay;
                      setEditTaskIsAllDay(next);
                      if (next) {
                        setEditTaskHours(8);
                        setEditTaskStartHour(8);
                      }
                    }}
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                      editTaskIsAllDay
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {editTaskIsAllDay ? "✓ Dia Todo (8h)" : "Dia Todo (8h)"}
                  </button>
                </div>
                <Input
                  id="edit-task-hours"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={editTaskHours}
                  disabled={editTaskIsAllDay}
                  onChange={(e) => setEditTaskHours(Number(e.target.value))}
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={editTaskStatus} onValueChange={setEditTaskStatus}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Status..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Marcador Especial</Label>
                <Select value={editTaskSpecialMarker} onValueChange={setEditTaskSpecialMarker}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Marcador..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="major_release">Lançamento Principal</SelectItem>
                    <SelectItem value="major_deployment">Deploy Importante</SelectItem>
                    <SelectItem value="major_theme">Tema Estratégico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-task-start">Data Início</Label>
                <Input
                  id="edit-task-start"
                  type="date"
                  value={editTaskStartDate}
                  onChange={(e) => setEditTaskStartDate(e.target.value)}
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-task-end">Data Término</Label>
                <Input
                  id="edit-task-end"
                  type="date"
                  value={editTaskEndDate}
                  onChange={(e) => setEditTaskEndDate(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 justify-between">
            {editingTaskId && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteTask(editingTaskId)}
                className="mr-auto"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditTaskOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEditedTask}
                disabled={!editTaskTitle.trim()}
                className="bg-primary text-primary-foreground"
              >
                Salvar Alterações
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default XiaomiCalendar;
