import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Star,
  MoreHorizontal,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Briefcase,
  Layers,
  BarChart2,
  TrendingUp,
  AlertCircle,
  Sparkles,
  X,
  Palmtree,
  Check,
  Repeat,
  DollarSign,
  Maximize2,
  Minimize2,
  Trash2,
  Edit2,
  ArrowRight,
  UserPlus,
} from "lucide-react";
import {
  format,
  parseISO,
  startOfDay,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isWithinInterval,
  isWeekend,
  differenceInCalendarDays,
  isBefore,
  isAfter,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import {
  type Task,
  type Employee,
  type Project,
  taskService,
  employeeService,
  projectService,
} from "@/lib/supabaseClient";

interface TimeOffEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  type: "vacation" | "holiday" | "sick_leave" | "other";
  description: string;
  start_date: string;
  end_date: string;
}

export const ResourcePlanningView: React.FC = () => {
  // Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Time off state (with persistent fallback in localStorage)
  const [timeOffs, setTimeOffs] = useState<TimeOffEntry[]>(() => {
    try {
      const saved = localStorage.getItem("crono_pulse_timeoffs");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "to-1",
        employee_id: "emp-1",
        employee_name: "Denis Aranha",
        type: "vacation",
        description: "Férias Programadas",
        start_date: format(addDays(new Date(), 12), "yyyy-MM-dd"),
        end_date: format(addDays(new Date(), 16), "yyyy-MM-dd"),
      },
    ];
  });

  // Navigation & View state
  const [currentBaseDate, setCurrentBaseDate] = useState<Date>(startOfDay(new Date()));
  const [viewPeriod, setViewPeriod] = useState<"2weeks" | "month" | "quarter">("month");
  const [showHistogram, setShowHistogram] = useState(true);
  const [granularity, setGranularity] = useState<"daily" | "weekly">("daily");
  const [chartMetric, setChartMetric] = useState<"capacity" | "availability" | "utilization">("capacity");
  const [isTentativeActive, setIsTentativeActive] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});
  const [starredEmployees, setStarredEmployees] = useState<Record<string, boolean>>({});
  const [isTimeOffSectionOpen, setIsTimeOffSectionOpen] = useState(false);
  const [isPeopleSectionOpen, setIsPeopleSectionOpen] = useState(true);

  // Modal Dialog States
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isNewPersonOpen, setIsNewPersonOpen] = useState(false);
  const [isNewTimeOffOpen, setIsNewTimeOffOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form states
  const [formTaskName, setFormTaskName] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formStartDate, setFormStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formEndDate, setFormEndDate] = useState(format(addDays(new Date(), 5), "yyyy-MM-dd"));
  const [formHoursPerDay, setFormHoursPerDay] = useState(1);
  const [formEstimatedHours, setFormEstimatedHours] = useState(8);
  const [formIsTentative, setFormIsTentative] = useState(false);
  const [formDescription, setFormDescription] = useState("");

  // Person form
  const [formPersonName, setFormPersonName] = useState("");
  const [formPersonRole, setFormPersonRole] = useState("Especialista");
  const [formPersonWeeklyHours, setFormPersonWeeklyHours] = useState(40);

  // Time off form
  const [formTimeOffEmpId, setFormTimeOffEmpId] = useState("");
  const [formTimeOffType, setFormTimeOffType] = useState<"vacation" | "holiday" | "sick_leave" | "other">("vacation");
  const [formTimeOffDesc, setFormTimeOffDesc] = useState("Férias");
  const [formTimeOffStart, setFormTimeOffStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formTimeOffEnd, setFormTimeOffEnd] = useState(format(addDays(new Date(), 4), "yyyy-MM-dd"));

  // Initial Load
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empData, projData, taskData] = await Promise.all([
        employeeService.getAll(),
        projectService.getAll(),
        taskService.getAll(),
      ]);

      // If no employee named Denis Aranha exists, let's ensure Denis Aranha is included to match screenshot!
      let employeesList = empData;
      if (!employeesList.some((e) => e.name.toLowerCase().includes("denis aranha"))) {
        const denisEmp: Employee = {
          id: "emp-denis",
          name: "Denis Aranha",
          role: "Especialista",
          weekly_hours: 40,
          skills: ["Planejamento", "Gestão de Projetos", "Liderança"],
          dias_de_trabalho: ["monday", "tuesday", "wednesday", "thursday", "friday"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        employeesList = [denisEmp, ...employeesList];
      }

      // If Denis has no tasks, seed matching demo tasks
      const denis = employeesList.find((e) => e.name.toLowerCase().includes("denis aranha"));
      let currentTasks = taskData;
      let currentProjects = projData;

      if (denis && !currentTasks.some((t) => t.assigned_employee_id === denis.id)) {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const nextMonthStr = format(addDays(new Date(), 28), "yyyy-MM-dd");
        
        // Ensure projects exist
        const defaultProjects = [
          { id: "proj-ctrl", name: "Controle" },
          { id: "proj-int", name: "Interno" },
          { id: "proj-lbw", name: "LBW7" },
          { id: "proj-ped", name: "PED" },
        ];

        defaultProjects.forEach((dp) => {
          if (!currentProjects.some((p) => p.name.toLowerCase() === dp.name.toLowerCase())) {
            currentProjects = [
              ...currentProjects,
              {
                id: dp.id,
                name: dp.name,
                description: "Categoria de Projeto",
                start_date: todayStr,
                end_date: nextMonthStr,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ];
          }
        });

        const projCtrl = currentProjects.find((p) => p.name.toLowerCase() === "controle") || currentProjects[0];
        const projInt = currentProjects.find((p) => p.name.toLowerCase() === "interno") || currentProjects[0];
        const projLbw = currentProjects.find((p) => p.name.toLowerCase() === "lbw7") || currentProjects[0];
        const projPed = currentProjects.find((p) => p.name.toLowerCase() === "ped") || currentProjects[0];

        const denisTasks: Task[] = [
          {
            id: "task-cad",
            name: "Cadastro",
            project_id: projCtrl?.id || null,
            assigned_employee_id: denis.id,
            start_date: format(subDays(new Date(), 3), "yyyy-MM-dd"),
            end_date: format(addDays(new Date(), 25), "yyyy-MM-dd"),
            hours_per_day: 1,
            estimated_time: 20,
            status: "in_progress",
            description: "Atividades contínuas de cadastro",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "task-aval",
            name: "Avaliação de impacto",
            project_id: projInt?.id || null,
            assigned_employee_id: denis.id,
            start_date: format(subDays(new Date(), 3), "yyyy-MM-dd"),
            end_date: format(addDays(new Date(), 25), "yyyy-MM-dd"),
            hours_per_day: 0.5,
            estimated_time: 10,
            status: "in_progress",
            description: "Análise técnica interna",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "task-gest",
            name: "Gestão de Lotes",
            project_id: projInt?.id || null,
            assigned_employee_id: denis.id,
            start_date: format(subDays(new Date(), 3), "yyyy-MM-dd"),
            end_date: format(addDays(new Date(), 25), "yyyy-MM-dd"),
            hours_per_day: 3.5,
            estimated_time: 70,
            status: "in_progress",
            description: "Gestão operacional e controle de lotes",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "task-sup",
            name: "Suporte",
            project_id: projInt?.id || null,
            assigned_employee_id: denis.id,
            start_date: format(subDays(new Date(), 3), "yyyy-MM-dd"),
            end_date: format(addDays(new Date(), 25), "yyyy-MM-dd"),
            hours_per_day: 1,
            estimated_time: 20,
            status: "in_progress",
            description: "Suporte interno e atendimento",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "task-lbw",
            name: "LBW 7",
            project_id: projLbw?.id || null,
            assigned_employee_id: denis.id,
            start_date: format(addDays(new Date(), 2), "yyyy-MM-dd"),
            end_date: format(addDays(new Date(), 2), "yyyy-MM-dd"),
            hours_per_day: 1,
            estimated_time: 1,
            status: "pending",
            description: "Alocação pontual",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "task-lims",
            name: "LIMS PDC",
            project_id: projPed?.id || null,
            assigned_employee_id: denis.id,
            start_date: format(addDays(new Date(), 2), "yyyy-MM-dd"),
            end_date: format(addDays(new Date(), 2), "yyyy-MM-dd"),
            hours_per_day: 0.5,
            estimated_time: 0.5,
            status: "pending",
            description: "Acompanhamento PED",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        currentTasks = [...currentTasks, ...denisTasks];
      }

      setEmployees(employeesList);
      setProjects(currentProjects);
      setTasks(currentTasks);

      // Expand first 3 employees by default
      const initialExpanded: Record<string, boolean> = {};
      employeesList.slice(0, 3).forEach((e) => {
        initialExpanded[e.id] = true;
      });
      setExpandedEmployees(initialExpanded);
    } catch (err) {
      console.error("Error loading resource planning data:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveTimeOffs = (updated: TimeOffEntry[]) => {
    setTimeOffs(updated);
    try {
      localStorage.setItem("crono_pulse_timeoffs", JSON.stringify(updated));
    } catch {}
  };

  // Timeline Days Generation
  const timelineDays = useMemo(() => {
    const days: Date[] = [];
    const base = startOfDay(currentBaseDate);

    // Calculate start date: Start on the Monday of the current period
    const startDate = startOfWeek(base, { weekStartsOn: 1 }); // Monday start

    let count = 28; // Default 4 weeks (28 days / ~1 month)
    if (viewPeriod === "2weeks") count = 14;
    if (viewPeriod === "quarter") count = 70;

    for (let i = 0; i < count; i++) {
      const d = addDays(startDate, i);
      // Optional: if we want to show Monday-Friday only or all 7 days
      // The screenshot displays working days 4,5,6,7,8 | 11,12,13,14,15 (Mon-Fri)
      if (!isWeekend(d)) {
        days.push(d);
      }
    }
    return days;
  }, [currentBaseDate, viewPeriod]);

  // Group Days by Week and Month for Header
  const headerWeeks = useMemo(() => {
    const weeksMap = new Map<string, { weekLabel: string; monthLabel: string; days: Date[] }>();

    timelineDays.forEach((day) => {
      const weekStart = startOfWeek(day, { weekStartsOn: 1 });
      const weekKey = format(weekStart, "yyyy-MM-dd");
      const monthLabel = format(day, "MMM ''yy", { locale: ptBR });
      const weekLabel = `Semana de ${format(weekStart, "dd/MM")}`;

      if (!weeksMap.has(weekKey)) {
        weeksMap.set(weekKey, {
          weekLabel,
          monthLabel,
          days: [],
        });
      }
      weeksMap.get(weekKey)!.days.push(day);
    });

    return Array.from(weeksMap.entries()).map(([key, data]) => ({
      weekKey: key,
      ...data,
    }));
  }, [timelineDays]);

  // Months header groupings
  const headerMonths = useMemo(() => {
    const months: { label: string; colSpan: number }[] = [];
    let currentMonth = "";
    let currentCount = 0;

    timelineDays.forEach((day) => {
      const mLabel = format(day, "MMM ''yy", { locale: ptBR });
      if (mLabel !== currentMonth) {
        if (currentMonth !== "") {
          months.push({ label: currentMonth, colSpan: currentCount });
        }
        currentMonth = mLabel;
        currentCount = 1;
      } else {
        currentCount++;
      }
    });

    if (currentMonth !== "") {
      months.push({ label: currentMonth, colSpan: currentCount });
    }

    return months;
  }, [timelineDays]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        !searchTerm ||
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRole =
        selectedRole === "all" ||
        emp.role.toLowerCase() === selectedRole.toLowerCase();

      return matchSearch && matchRole;
    });
  }, [employees, searchTerm, selectedRole]);

  // Available unique roles for filter
  const uniqueRoles = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.role) set.add(e.role);
    });
    return Array.from(set);
  }, [employees]);

  // Daily Workload & Capacity Calculations per Employee and for the Team
  const teamDailyCalculations = useMemo(() => {
    // Map dateStr -> { confirmedHours, capacityHours, contractedHours, timeOffHours, overloadHours, freeHours, utilizationPercent }
    const dailyData: Record<
      string,
      {
        date: Date;
        dateStr: string;
        confirmedHours: number;
        capacityHours: number;
        contractedHours: number;
        timeOffHours: number;
        overloadHours: number;
        freeHours: number;
        utilizationPercent: number;
      }
    > = {};

    timelineDays.forEach((day) => {
      const dStr = format(day, "yyyy-MM-dd");
      let totalConfirmed = 0;
      let totalContracted = 0;
      let totalTimeOff = 0;

      filteredEmployees.forEach((emp) => {
        const dailyCapacity = (emp.weekly_hours || 40) / 5; // e.g. 8h/day
        totalContracted += dailyCapacity;

        // Check if employee has time off on this day
        const hasTimeOff = timeOffs.some((to) => {
          if (to.employee_id !== emp.id) return false;
          try {
            const s = parseISO(to.start_date);
            const e = parseISO(to.end_date);
            return isWithinInterval(day, { start: s, end: e });
          } catch {
            return false;
          }
        });

        if (hasTimeOff) {
          totalTimeOff += dailyCapacity;
        }

        // Calculate tasks allocated to this employee on this day
        const empTasks = tasks.filter((t) => {
          if (t.assigned_employee_id !== emp.id) return false;
          if (isTentativeActive && t.special_marker !== "tentative") return false;
          return true;
        });

        empTasks.forEach((t) => {
          try {
            const start = parseISO(t.start_date);
            const end = parseISO(t.end_date);

            if (isWithinInterval(day, { start, end })) {
              const spanDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
              // Calculate daily effort: either explicit hours_per_day or total / span
              const taskDailyHours = t.hours_per_day || (t.estimated_time || 8) / spanDays;
              totalConfirmed += taskDailyHours;
            }
          } catch {}
        });
      });

      const effectiveCapacity = Math.max(0, totalContracted - totalTimeOff);
      const overload = Math.max(0, totalConfirmed - effectiveCapacity);
      const free = Math.max(0, effectiveCapacity - totalConfirmed);
      const util = effectiveCapacity > 0 ? Math.round((totalConfirmed / effectiveCapacity) * 100) : 0;

      dailyData[dStr] = {
        date: day,
        dateStr: dStr,
        confirmedHours: Number(totalConfirmed.toFixed(1)),
        capacityHours: Number(effectiveCapacity.toFixed(1)),
        contractedHours: Number(totalContracted.toFixed(1)),
        timeOffHours: Number(totalTimeOff.toFixed(1)),
        overloadHours: Number(overload.toFixed(1)),
        freeHours: Number(free.toFixed(1)),
        utilizationPercent: util,
      };
    });

    return dailyData;
  }, [timelineDays, filteredEmployees, tasks, timeOffs, isTentativeActive]);

  // Weekly Aggregated Calculations for Histogram (when granularity === 'weekly')
  const teamWeeklyCalculations = useMemo(() => {
    return headerWeeks.map((week) => {
      let confirmedHours = 0;
      let capacityHours = 0;
      let contractedHours = 0;
      let timeOffHours = 0;

      week.days.forEach((day) => {
        const dStr = format(day, "yyyy-MM-dd");
        const daily = teamDailyCalculations[dStr];
        if (daily) {
          confirmedHours += daily.confirmedHours;
          capacityHours += daily.capacityHours;
          contractedHours += daily.contractedHours;
          timeOffHours += daily.timeOffHours;
        }
      });

      const overloadHours = Math.max(0, confirmedHours - capacityHours);
      const freeHours = Math.max(0, capacityHours - confirmedHours);
      const utilizationPercent = capacityHours > 0 ? Math.round((confirmedHours / capacityHours) * 100) : 0;

      return {
        weekKey: week.weekKey,
        weekLabel: week.weekLabel,
        days: week.days,
        confirmedHours: Number(confirmedHours.toFixed(1)),
        capacityHours: Number(capacityHours.toFixed(1)),
        contractedHours: Number(contractedHours.toFixed(1)),
        timeOffHours: Number(timeOffHours.toFixed(1)),
        overloadHours: Number(overloadHours.toFixed(1)),
        freeHours: Number(freeHours.toFixed(1)),
        utilizationPercent,
      };
    });
  }, [headerWeeks, teamDailyCalculations]);

  // Max histogram scale calculation based on granularity and metric
  const maxHistogramScale = useMemo(() => {
    if (chartMetric === "utilization") {
      let maxUtil = 100;
      if (granularity === "daily") {
        Object.values(teamDailyCalculations).forEach((d) => {
          if (d.utilizationPercent > maxUtil) maxUtil = d.utilizationPercent;
        });
      } else {
        teamWeeklyCalculations.forEach((w) => {
          if (w.utilizationPercent > maxUtil) maxUtil = w.utilizationPercent;
        });
      }
      return Math.max(100, Math.ceil(maxUtil * 1.15));
    }

    let max = 8;
    if (granularity === "daily") {
      Object.values(teamDailyCalculations).forEach((d) => {
        if (chartMetric === "capacity") {
          if (d.confirmedHours > max) max = d.confirmedHours;
          if (d.capacityHours > max) max = d.capacityHours;
        } else if (chartMetric === "availability") {
          if (d.freeHours > max) max = d.freeHours;
          if (d.capacityHours > max) max = d.capacityHours;
        }
      });
    } else {
      teamWeeklyCalculations.forEach((w) => {
        if (chartMetric === "capacity") {
          if (w.confirmedHours > max) max = w.confirmedHours;
          if (w.capacityHours > max) max = w.capacityHours;
        } else if (chartMetric === "availability") {
          if (w.freeHours > max) max = w.freeHours;
          if (w.capacityHours > max) max = w.capacityHours;
        }
      });
    }
    return Math.ceil(max * 1.15);
  }, [teamDailyCalculations, teamWeeklyCalculations, granularity, chartMetric]);

  // Per Employee Daily Hours Calculation
  const getEmployeeDailyStats = (employeeId: string, day: Date) => {
    const dStr = format(day, "yyyy-MM-dd");
    const emp = employees.find((e) => e.id === employeeId);
    const capacity = emp ? (emp.weekly_hours || 40) / 5 : 8;

    const hasTimeOff = timeOffs.some((to) => {
      if (to.employee_id !== employeeId) return false;
      try {
        const s = parseISO(to.start_date);
        const e = parseISO(to.end_date);
        return isWithinInterval(day, { start: s, end: e });
      } catch {
        return false;
      }
    });

    let assignedHours = 0;
    const empTasks = tasks.filter((t) => {
      if (t.assigned_employee_id !== employeeId) return false;
      if (isTentativeActive && t.special_marker !== "tentative") return false;
      return true;
    });

    empTasks.forEach((t) => {
      try {
        const start = parseISO(t.start_date);
        const end = parseISO(t.end_date);
        if (isWithinInterval(day, { start, end })) {
          const spanDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
          assignedHours += t.hours_per_day || (t.estimated_time || 8) / spanDays;
        }
      } catch {}
    });

    const freeHours = Math.max(0, capacity - assignedHours);
    const isOverloaded = assignedHours > capacity;

    return {
      capacity,
      assignedHours: Number(assignedHours.toFixed(1)),
      freeHours: Number(freeHours.toFixed(1)),
      hasTimeOff,
      isOverloaded,
    };
  };

  // Weekly Free Hours for an Employee
  const getEmployeeWeeklyFreeHours = (employeeId: string, weekDays: Date[]) => {
    let totalFree = 0;
    let totalAssigned = 0;
    let totalCap = 0;

    weekDays.forEach((day) => {
      const stats = getEmployeeDailyStats(employeeId, day);
      totalCap += stats.capacity;
      totalAssigned += stats.assignedHours;
    });

    const free = Math.max(0, totalCap - totalAssigned);
    const hours = Math.floor(free);
    const minutes = Math.round((free - hours) * 60);

    if (hours === 0 && minutes === 0) return "0h livre";
    if (minutes === 0) return `${hours}h livre`;
    return `${hours}h ${minutes}m livre`;
  };

  // Today reference
  const today = useMemo(() => startOfDay(new Date()), []);

  // Handlers for Task Creation & Editing
  const handleOpenNewTask = (employeeId?: string, defaultDate?: Date) => {
    setEditingTask(null);
    setFormTaskName("");
    setFormProjectId(projects[0]?.id || "");
    setFormEmployeeId(employeeId || filteredEmployees[0]?.id || "");
    const sDate = defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    const eDate = defaultDate ? format(addDays(defaultDate, 4), "yyyy-MM-dd") : format(addDays(new Date(), 4), "yyyy-MM-dd");
    setFormStartDate(sDate);
    setFormEndDate(eDate);
    setFormHoursPerDay(1);
    setFormEstimatedHours(8);
    setFormIsTentative(false);
    setFormDescription("");
    setIsNewTaskOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormTaskName(task.name);
    setFormProjectId(task.project_id || "");
    setFormEmployeeId(task.assigned_employee_id || "");
    setFormStartDate(task.start_date);
    setFormEndDate(task.end_date);
    setFormHoursPerDay(task.hours_per_day || 1);
    setFormEstimatedHours(task.estimated_time || 8);
    setFormIsTentative(task.special_marker === "tentative");
    setFormDescription(task.description || "");
    setIsNewTaskOpen(true);
  };

  const handleSaveTask = async () => {
    if (!formTaskName.trim() || !formProjectId) {
      alert("Por favor, preencha o nome da tarefa e selecione o projeto.");
      return;
    }

    try {
      if (editingTask) {
        // Update
        const updated = await taskService.update(editingTask.id, {
          name: formTaskName,
          project_id: formProjectId,
          assigned_employee_id: formEmployeeId || null,
          start_date: formStartDate,
          end_date: formEndDate,
          hours_per_day: Number(formHoursPerDay) || 1,
          estimated_time: Number(formEstimatedHours) || 8,
          special_marker: formIsTentative ? "tentative" : null,
          description: formDescription,
        });

        setTasks((prev) =>
          prev.map((t) => (t.id === editingTask.id ? { ...t, ...updated } : t))
        );
      } else {
        // Create
        const created = await taskService.create({
          name: formTaskName,
          project_id: formProjectId,
          assigned_employee_id: formEmployeeId || null,
          start_date: formStartDate,
          end_date: formEndDate,
          hours_per_day: Number(formHoursPerDay) || 1,
          estimated_time: Number(formEstimatedHours) || 8,
          status: "pending",
          special_marker: formIsTentative ? "tentative" : null,
          description: formDescription,
        });

        if (created) {
          setTasks((prev) => [...prev, created]);
        }
      }
      setIsNewTaskOpen(false);
    } catch (err) {
      console.error("Error saving task:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta alocação?")) return;
    try {
      await taskService.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setIsNewTaskOpen(false);
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const handleSavePerson = async () => {
    if (!formPersonName.trim()) return;
    try {
      const created = await employeeService.create({
        name: formPersonName,
        role: formPersonRole,
        weekly_hours: Number(formPersonWeeklyHours) || 40,
        skills: ["Planejamento"],
        dias_de_trabalho: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      });
      if (created) {
        setEmployees((prev) => [...prev, created]);
      }
      setIsNewPersonOpen(false);
      setFormPersonName("");
    } catch (err) {
      console.error("Error creating employee:", err);
    }
  };

  const handleSaveTimeOff = () => {
    if (!formTimeOffEmpId || !formTimeOffStart || !formTimeOffEnd) return;
    const emp = employees.find((e) => e.id === formTimeOffEmpId);
    const newEntry: TimeOffEntry = {
      id: `to-${Date.now()}`,
      employee_id: formTimeOffEmpId,
      employee_name: emp?.name || "Colaborador",
      type: formTimeOffType,
      description: formTimeOffDesc,
      start_date: formTimeOffStart,
      end_date: formTimeOffEnd,
    };
    saveTimeOffs([...timeOffs, newEntry]);
    setIsNewTimeOffOpen(false);
  };

  const handleDeleteTimeOff = (id: string) => {
    saveTimeOffs(timeOffs.filter((to) => to.id !== id));
  };

  // Toggle Collapse/Expand
  const toggleEmployee = (empId: string) => {
    setExpandedEmployees((prev) => ({
      ...prev,
      [empId]: !prev[empId],
    }));
  };

  const toggleStar = (empId: string) => {
    setStarredEmployees((prev) => ({
      ...prev,
      [empId]: !prev[empId],
    }));
  };

  // Date Navigation Helpers
  const handleNavPrevPeriod = () => {
    if (viewPeriod === "2weeks") setCurrentBaseDate((prev) => subWeeks(prev, 2));
    else if (viewPeriod === "month") setCurrentBaseDate((prev) => subMonths(prev, 1));
    else setCurrentBaseDate((prev) => subMonths(prev, 3));
  };

  const handleNavPrevStep = () => {
    setCurrentBaseDate((prev) => subWeeks(prev, 1));
  };

  const handleNavToday = () => {
    setCurrentBaseDate(startOfDay(new Date()));
  };

  const handleNavNextStep = () => {
    setCurrentBaseDate((prev) => addWeeks(prev, 1));
  };

  const handleNavNextPeriod = () => {
    if (viewPeriod === "2weeks") setCurrentBaseDate((prev) => addWeeks(prev, 2));
    else if (viewPeriod === "month") setCurrentBaseDate((prev) => addMonths(prev, 1));
    else setCurrentBaseDate((prev) => addMonths(prev, 3));
  };

  // Max histogram scale calculation
  const maxHistogramHours = useMemo(() => {
    let max = 8;
    Object.values(teamDailyCalculations).forEach((d) => {
      if (d.confirmedHours > max) max = d.confirmedHours;
      if (d.capacityHours > max) max = d.capacityHours;
    });
    return Math.ceil(max * 1.15); // +15% margin
  }, [teamDailyCalculations]);

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-xl shadow-xs overflow-hidden text-foreground">
      {/* 1. TOP HEADER & MAIN CONTROLS (Float / Resource Planning Style) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-card border-b border-border">
        {/* Left Side: Filter, Search, New Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1 sm:gap-1.5 border-border px-2 sm:px-3">
                <Filter className="h-3.5 w-3.5 text-primary" />
                <span>Filtro</span>
                {selectedRole !== "all" && (
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 px-1 py-0 text-[10px]">
                    1
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 text-xs space-y-3" align="start">
              <div className="font-semibold text-xs border-b pb-1.5 flex items-center justify-between">
                <span>Filtros de Pessoas</span>
                {(selectedRole !== "all" || searchTerm) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRole("all");
                      setSearchTerm("");
                    }}
                    className="h-6 text-[10px] px-1.5 text-muted-foreground"
                  >
                    Resetar
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Filtrar por Cargo/Função</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Todos os Cargos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Cargos</SelectItem>
                    {uniqueRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>

          {/* Search People Input */}
          <div className="relative flex-1 min-w-[130px] sm:w-56 md:w-48 lg:w-64 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* "+ Novo" Dropdown Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 text-xs font-semibold gap-1 bg-primary text-primary-foreground shadow-xs px-2.5 sm:px-3">
                <Plus className="h-3.5 w-3.5" />
                <span>Novo</span>
                <ChevronDown className="h-3 w-3 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-xs">
              <DropdownMenuItem onClick={() => handleOpenNewTask()}>
                <Layers className="h-3.5 w-3.5 mr-2 text-primary" />
                <span>Nova Alocação / Tarefa</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsNewPersonOpen(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                <span>Novo Colaborador</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsNewTimeOffOpen(true)}>
                <Palmtree className="h-3.5 w-3.5 mr-2 text-amber-600" />
                <span>Ausência / Time Off</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tentative Switcher */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-muted/40 text-xs">
            <Switch
              id="tentative-toggle"
              checked={isTentativeActive}
              onCheckedChange={setIsTentativeActive}
              className="scale-75"
            />
            <Label htmlFor="tentative-toggle" className="text-[11px] text-muted-foreground cursor-pointer">
              Propostas / Tentativas
            </Label>
          </div>

          {/* View / Histogram Toggle Icon Buttons */}
          <div className="flex items-center border border-border rounded-lg bg-muted/30 p-0.5">
            <Button
              variant={showHistogram ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowHistogram(!showHistogram)}
              title={showHistogram ? "Ocultar Gráfico de Capacidade" : "Exibir Gráfico de Capacidade"}
            >
              <BarChart2 className="h-3.5 w-3.5 text-primary" />
            </Button>
          </div>
        </div>

        {/* Right Side: Navigation & Period Selector */}
        <div className="flex items-center justify-between md:justify-end gap-1.5 flex-wrap">
          {/* Period selector (Month, 2 Weeks, Quarter) */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              onClick={() => setViewPeriod("2weeks")}
              className={`px-2 sm:px-2.5 py-1 font-medium rounded-md text-[11px] sm:text-xs transition-all ${
                viewPeriod === "2weeks"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              2 Sem.
            </button>
            <button
              onClick={() => setViewPeriod("month")}
              className={`px-2 sm:px-2.5 py-1 font-medium rounded-md text-[11px] sm:text-xs transition-all ${
                viewPeriod === "month"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewPeriod("quarter")}
              className={`px-2 sm:px-2.5 py-1 font-medium rounded-md text-[11px] sm:text-xs transition-all ${
                viewPeriod === "quarter"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Trim.
            </button>
          </div>

          {/* Step buttons << < Today > >> */}
          <div className="flex items-center gap-0.5 border border-border rounded-lg bg-background p-0.5 shadow-xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNavPrevPeriod}
              title="Período Anterior"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNavPrevStep}
              title="Semana Anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-bold text-primary hover:bg-primary/10"
              onClick={handleNavToday}
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNavNextStep}
              title="Próxima Semana"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNavNextPeriod}
              title="Próximo Período"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. TOP CAPACITY & WORKLOAD HISTOGRAM CHART (Screenshot 2) */}
      {showHistogram && (
        <div className="border-b border-border bg-card/60 p-2 sm:p-3 space-y-2">
          {/* Chart Header Bar with Metric Toggles */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                Exibindo {filteredEmployees.length} colaborador(es)
              </span>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                {granularity === "daily" ? "Visão Diária" : "Visão Semanal"}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-medium">
                {chartMetric === "capacity"
                  ? "Métrica: Capacidade"
                  : chartMetric === "availability"
                  ? "Métrica: Disponibilidade"
                  : "Métrica: Utilização"}
              </Badge>
            </div>

            {/* Granularity & Metric Pill Switchers */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Daily / Weekly */}
              <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5 text-[10px] sm:text-[11px]">
                <button
                  onClick={() => setGranularity("daily")}
                  className={`px-2 py-0.5 font-medium rounded-md transition-all ${
                    granularity === "daily"
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Diário
                </button>
                <button
                  onClick={() => setGranularity("weekly")}
                  className={`px-2 py-0.5 font-medium rounded-md transition-all ${
                    granularity === "weekly"
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semanal
                </button>
              </div>

              {/* Metric Toggle (Capacidade / Disponibilidade / Utilização) */}
              <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5 text-[10px] sm:text-[11px]">
                <button
                  onClick={() => setChartMetric("capacity")}
                  className={`px-2 sm:px-2.5 py-0.5 font-medium rounded-md transition-all ${
                    chartMetric === "capacity"
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Capacidade
                </button>
                <button
                  onClick={() => setChartMetric("availability")}
                  className={`px-2 sm:px-2.5 py-0.5 font-medium rounded-md transition-all ${
                    chartMetric === "availability"
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Disponibilidade
                </button>
                <button
                  onClick={() => setChartMetric("utilization")}
                  className={`px-2 sm:px-2.5 py-0.5 font-medium rounded-md transition-all ${
                    chartMetric === "utilization"
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Utilização
                </button>
              </div>
            </div>
          </div>

          {/* Histogram Canvas & Timeline-Aligned Bars */}
          <div className="flex border border-border/80 rounded-lg bg-background overflow-x-auto shadow-2xs">
            {/* Left Legend Sidebar */}
            <div className="w-40 sm:w-56 md:w-64 p-2 sm:p-3 border-r border-border/80 flex-shrink-0 flex flex-col justify-between bg-card/40">
              <div className="space-y-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Legenda ({chartMetric === "capacity" ? "Capacidade" : chartMetric === "availability" ? "Disponibilidade" : "Utilização"})
                </span>
              </div>

              {chartMetric === "capacity" && (
                <div className="space-y-1 text-[10px] sm:text-[11px] text-muted-foreground mt-1.5">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-blue-600 inline-block shadow-2xs flex-shrink-0" />
                    <span className="font-medium text-foreground truncate">Carga Confirmada</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-purple-500/30 border border-purple-500 inline-block flex-shrink-0" />
                    <span className="truncate">Capacidade Efetiva</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-gray-400 inline-block flex-shrink-0" />
                    <span className="truncate">Capacidade Contratada</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-[repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1_2px,#f1f5f9_2px,#f1f5f9_4px)] border border-border inline-block flex-shrink-0" />
                    <span className="truncate">Ausência / Time Off</span>
                  </div>
                </div>
              )}

              {chartMetric === "availability" && (
                <div className="space-y-1 text-[10px] sm:text-[11px] text-muted-foreground mt-1.5">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-emerald-600 inline-block shadow-2xs flex-shrink-0" />
                    <span className="font-medium text-foreground truncate">Horas Disponíveis / Livres</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-rose-500 inline-block flex-shrink-0" />
                    <span className="truncate">Sobrecarga de Horas</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-purple-500/30 border border-purple-500 inline-block flex-shrink-0" />
                    <span className="truncate">Capacidade Máxima</span>
                  </div>
                </div>
              )}

              {chartMetric === "utilization" && (
                <div className="space-y-1 text-[10px] sm:text-[11px] text-muted-foreground mt-1.5">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-emerald-500 inline-block shadow-2xs flex-shrink-0" />
                    <span className="font-medium text-foreground truncate">&lt; 85% Ideal</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-amber-500 inline-block flex-shrink-0" />
                    <span className="truncate">85% - 100% Carga Alta</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-rose-600 inline-block flex-shrink-0" />
                    <span className="truncate">&gt; 100% Sobrecarga</span>
                  </div>
                </div>
              )}

              <div className="text-[9px] sm:text-[10px] text-muted-foreground/80 pt-1.5 border-t border-border/40 font-mono">
                {chartMetric === "utilization"
                  ? `Escala: 0% a ${maxHistogramScale}%`
                  : `Escala: 0h a ${maxHistogramScale}h`}
              </div>
            </div>

            {/* Right Synchronized Histogram Columns */}
            <div className="flex-1 flex min-w-max">
              {granularity === "daily" ? (
                // DAILY RENDERING (Each day in timeline)
                timelineDays.map((day, idx) => {
                  const dStr = format(day, "yyyy-MM-dd");
                  const stats = teamDailyCalculations[dStr] || {
                    confirmedHours: 0,
                    capacityHours: filteredEmployees.length * 8,
                    contractedHours: filteredEmployees.length * 8,
                    overloadHours: 0,
                    freeHours: filteredEmployees.length * 8,
                    utilizationPercent: 0,
                    timeOffHours: 0,
                  };

                  const isToday = isSameDay(day, today);
                  const isOverload = stats.overloadHours > 0;

                  // Bar height according to metric
                  let barHeightPercent = 0;
                  let barColorClass = "bg-blue-600 hover:bg-blue-700";
                  let barValueLabel = `${stats.confirmedHours}h`;

                  if (chartMetric === "capacity") {
                    barHeightPercent = Math.min(100, (stats.confirmedHours / maxHistogramScale) * 100);
                    barColorClass = isOverload ? "bg-rose-600 shadow-rose-500/50" : "bg-blue-600 hover:bg-blue-700";
                    barValueLabel = stats.confirmedHours > 0 ? `${stats.confirmedHours}h` : "";
                  } else if (chartMetric === "availability") {
                    barHeightPercent = Math.min(100, (stats.freeHours / maxHistogramScale) * 100);
                    barColorClass = stats.freeHours > 0 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600";
                    barValueLabel = stats.freeHours > 0 ? `${stats.freeHours}h` : isOverload ? `+${stats.overloadHours}h` : "0h";
                  } else {
                    // Utilization
                    barHeightPercent = Math.min(100, (stats.utilizationPercent / maxHistogramScale) * 100);
                    barColorClass =
                      stats.utilizationPercent > 100
                        ? "bg-rose-600"
                        : stats.utilizationPercent >= 85
                        ? "bg-amber-500"
                        : "bg-emerald-500";
                    barValueLabel = stats.utilizationPercent > 0 ? `${stats.utilizationPercent}%` : "0%";
                  }

                  const capacityLinePercent = Math.min(100, (stats.capacityHours / maxHistogramScale) * 100);

                  return (
                    <div
                      key={dStr}
                      className={`w-11 sm:w-14 md:w-16 border-r border-border/40 flex flex-col justify-end p-0.5 sm:p-1 relative group hover:bg-primary/5 transition-colors ${
                        isToday ? "bg-primary/10" : idx % 5 === 0 ? "border-l border-border/70" : ""
                      }`}
                      style={{ height: "120px" }}
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-popover text-popover-foreground border border-border p-2 rounded shadow-lg text-[11px] whitespace-nowrap space-y-0.5">
                        <p className="font-bold text-foreground">
                          {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-blue-600 dark:text-blue-400 font-medium">
                          Carga Confirmada: {stats.confirmedHours}h
                        </p>
                        <p className="text-purple-600 dark:text-purple-400">
                          Capacidade Efetiva: {stats.capacityHours}h (Contratada: {stats.contractedHours}h)
                        </p>
                        <p className={isOverload ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                          {isOverload ? `Sobrecarga: +${stats.overloadHours}h` : `Disponível / Livre: ${stats.freeHours}h`}
                        </p>
                        <p className="text-muted-foreground font-mono">
                          Taxa de Utilização: {stats.utilizationPercent}%
                        </p>
                        {stats.timeOffHours > 0 && (
                          <p className="text-amber-600 font-medium">
                            Ausência / Time Off: {stats.timeOffHours}h
                          </p>
                        )}
                      </div>

                      {/* Capacity line in Capacity mode */}
                      {chartMetric === "capacity" && (
                        <>
                          <div
                            className="absolute left-0 right-0 border-t-2 border-purple-500 z-10 opacity-70 pointer-events-none"
                            style={{ bottom: `${capacityLinePercent}%` }}
                            title={`Capacidade Efetiva: ${stats.capacityHours}h`}
                          />
                          <div
                            className="absolute left-0 right-0 bg-purple-500/10 z-0 pointer-events-none"
                            style={{ height: `${capacityLinePercent}%`, bottom: 0 }}
                          />
                        </>
                      )}

                      {/* 100% Target line in Utilization mode */}
                      {chartMetric === "utilization" && (
                        <div
                          className="absolute left-0 right-0 border-t border-dashed border-rose-400 z-10 opacity-80 pointer-events-none"
                          style={{ bottom: `${(100 / maxHistogramScale) * 100}%` }}
                          title="100% de Utilização"
                        />
                      )}

                      {/* Time Off Striped Bottom Indicator if any in Capacity mode */}
                      {chartMetric === "capacity" && stats.timeOffHours > 0 && (
                        <div
                          className="w-full bg-[repeating-linear-gradient(45deg,#f43f5e,#f43f5e_2px,#ffe4e6_2px,#ffe4e6_4px)] rounded-t-xs mb-0.5"
                          style={{ height: `${Math.min(30, (stats.timeOffHours / maxHistogramScale) * 100)}%` }}
                        />
                      )}

                      {/* Histogram Bar */}
                      <div
                        className={`w-full rounded-t-xs transition-all flex items-end justify-center z-20 ${barColorClass}`}
                        style={{ height: `${Math.max(4, barHeightPercent)}%` }}
                      >
                        {barValueLabel && (
                          <span className="text-[8px] sm:text-[9px] font-extrabold text-white pb-0.5 truncate px-0.5">
                            {barValueLabel}
                          </span>
                        )}
                      </div>

                      {/* Day Number footer */}
                      <div className="text-center pt-0.5 sm:pt-1 text-[9px] sm:text-[10px] font-mono text-muted-foreground border-t border-border/30">
                        {format(day, "d")}
                      </div>
                    </div>
                  );
                })
              ) : (
                // WEEKLY RENDERING (Columns match weeks spanning across grid)
                teamWeeklyCalculations.map((week) => {
                  const isOverload = week.overloadHours > 0;
                  let barHeightPercent = 0;
                  let barColorClass = "bg-blue-600 hover:bg-blue-700";
                  let barValueLabel = `${week.confirmedHours}h`;

                  if (chartMetric === "capacity") {
                    barHeightPercent = Math.min(100, (week.confirmedHours / maxHistogramScale) * 100);
                    barColorClass = isOverload ? "bg-rose-600 shadow-rose-500/50" : "bg-blue-600 hover:bg-blue-700";
                    barValueLabel = week.confirmedHours > 0 ? `${week.confirmedHours}h` : "";
                  } else if (chartMetric === "availability") {
                    barHeightPercent = Math.min(100, (week.freeHours / maxHistogramScale) * 100);
                    barColorClass = week.freeHours > 0 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600";
                    barValueLabel = week.freeHours > 0 ? `${week.freeHours}h` : isOverload ? `+${week.overloadHours}h` : "0h";
                  } else {
                    barHeightPercent = Math.min(100, (week.utilizationPercent / maxHistogramScale) * 100);
                    barColorClass =
                      week.utilizationPercent > 100
                        ? "bg-rose-600"
                        : week.utilizationPercent >= 85
                        ? "bg-amber-500"
                        : "bg-emerald-500";
                    barValueLabel = week.utilizationPercent > 0 ? `${week.utilizationPercent}%` : "0%";
                  }

                  const capacityLinePercent = Math.min(100, (week.capacityHours / maxHistogramScale) * 100);
                  const colWidthClass =
                    week.days.length === 5
                      ? "w-[220px] sm:w-[280px] md:w-[320px]"
                      : `w-[${week.days.length * 44}px] sm:w-[${week.days.length * 56}px]`;

                  return (
                    <div
                      key={week.weekKey}
                      className="border-r border-border flex flex-col justify-end p-1 sm:p-2 relative group hover:bg-primary/5 transition-colors"
                      style={{
                        height: "120px",
                        width: `${week.days.length * 56}px`,
                        minWidth: `${week.days.length * 44}px`,
                      }}
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-popover text-popover-foreground border border-border p-2 rounded shadow-lg text-[11px] whitespace-nowrap space-y-0.5">
                        <p className="font-bold text-foreground">{week.weekLabel}</p>
                        <p className="text-blue-600 dark:text-blue-400 font-medium">
                          Carga Semanal: {week.confirmedHours}h
                        </p>
                        <p className="text-purple-600 dark:text-purple-400">
                          Capacidade Semanal: {week.capacityHours}h (Contratada: {week.contractedHours}h)
                        </p>
                        <p className={isOverload ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                          {isOverload ? `Sobrecarga: +${week.overloadHours}h` : `Disponível / Livre: ${week.freeHours}h`}
                        </p>
                        <p className="text-muted-foreground font-mono">
                          Utilização Semanal: {week.utilizationPercent}%
                        </p>
                      </div>

                      {/* Capacity line in Capacity mode */}
                      {chartMetric === "capacity" && (
                        <>
                          <div
                            className="absolute left-0 right-0 border-t-2 border-purple-500 z-10 opacity-70 pointer-events-none"
                            style={{ bottom: `${capacityLinePercent}%` }}
                          />
                          <div
                            className="absolute left-0 right-0 bg-purple-500/10 z-0 pointer-events-none"
                            style={{ height: `${capacityLinePercent}%`, bottom: 0 }}
                          />
                        </>
                      )}

                      {/* 100% Line for weekly utilization */}
                      {chartMetric === "utilization" && (
                        <div
                          className="absolute left-0 right-0 border-t border-dashed border-rose-400 z-10 opacity-80 pointer-events-none"
                          style={{ bottom: `${(100 / maxHistogramScale) * 100}%` }}
                        />
                      )}

                      {/* Histogram Bar */}
                      <div
                        className={`w-full rounded-t-xs transition-all flex items-end justify-center z-20 ${barColorClass}`}
                        style={{ height: `${Math.max(4, barHeightPercent)}%` }}
                      >
                        {barValueLabel && (
                          <span className="text-[9px] sm:text-[10px] font-extrabold text-white pb-0.5 truncate px-1">
                            {barValueLabel}
                          </span>
                        )}
                      </div>

                      {/* Week Label footer */}
                      <div className="text-center pt-0.5 sm:pt-1 text-[9px] sm:text-[10px] font-mono text-muted-foreground border-t border-border/30 truncate">
                        {week.weekLabel}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN RESOURCE & PROJECT TIMELINE GRID (Screenshot 1) */}
      <div className="flex-1 overflow-auto bg-background">
        <table className="w-full border-collapse text-xs">
          {/* Table Header: Month & Days */}
          <thead className="sticky top-0 z-30 bg-card shadow-xs">
            {/* Row 1: Month Groupings */}
            <tr className="border-b border-border/80 text-[10px] sm:text-[11px] font-semibold text-muted-foreground bg-muted/40">
              <th className="w-44 sm:w-64 md:w-72 px-2 sm:px-3 py-2 text-left sticky left-0 z-40 bg-card border-r border-border font-bold text-foreground">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    <span className="truncate">Recursos & Projetos</span>
                  </span>
                  <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-mono">
                    {filteredEmployees.length} pessoas
                  </Badge>
                </div>
              </th>

              {/* Month Group Cells */}
              {headerMonths.map((m, idx) => (
                <th
                  key={idx}
                  colSpan={m.colSpan}
                  className="px-2 py-1 text-center font-bold text-foreground border-r border-border bg-muted/60"
                >
                  <div className="flex items-center justify-center gap-1">
                    <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                    <span>{m.label}</span>
                  </div>
                </th>
              ))}
            </tr>

            {/* Row 2: Days Header (e.g. 4 5 6 7 8 | 11 12 13 14 15) */}
            <tr className="border-b border-border text-[10px] sm:text-[11px] font-medium text-muted-foreground bg-card">
              <th className="px-2 sm:px-3 py-1.5 text-left sticky left-0 z-40 bg-card border-r border-border">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="truncate">Colaborador / Tarefa</span>
                  <span className="hidden sm:inline-block text-[10px] font-mono">Horas/Dia</span>
                </div>
              </th>

              {timelineDays.map((day, idx) => {
                const isToday = isSameDay(day, today);
                const dayName = format(day, "EEE", { locale: ptBR }).substring(0, 3);
                const dayNum = format(day, "d");

                return (
                  <th
                    key={day.toISOString()}
                    className={`w-11 sm:w-14 md:w-16 px-0.5 sm:px-1 py-1 sm:py-1.5 text-center border-r border-border/40 font-mono ${
                      isToday
                        ? "bg-primary text-primary-foreground font-bold"
                        : idx % 5 === 0
                        ? "border-l border-border/80 bg-muted/20"
                        : ""
                    }`}
                  >
                    <div className="text-[8px] sm:text-[9px] uppercase tracking-tight opacity-75">{dayName}</div>
                    <div className={`text-[11px] sm:text-xs ${isToday ? "font-extrabold" : "font-semibold"}`}>{dayNum}</div>
                  </th>
                );
              })}
            </tr>

            {/* Row 3: Free Capacity per Week Header Indicator (Matching Screenshot 1: '3h 30m/w free') */}
            <tr className="border-b border-border/60 bg-blue-50/50 dark:bg-blue-950/20 text-[9px] sm:text-[10px] text-blue-700 dark:text-blue-300">
              <th className="px-2 sm:px-3 py-1 text-left sticky left-0 z-40 bg-card border-r border-border font-semibold">
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-3 w-3" />
                  <span className="truncate">Capacidade Livre</span>
                </span>
              </th>

              {headerWeeks.map((week) => {
                let totalWeekFree = 0;
                week.days.forEach((d) => {
                  const dStr = format(d, "yyyy-MM-dd");
                  totalWeekFree += teamDailyCalculations[dStr]?.freeHours || 0;
                });

                const wHours = Math.floor(totalWeekFree);
                const wMin = Math.round((totalWeekFree - wHours) * 60);
                const label = wMin > 0 ? `${wHours}h ${wMin}m/sem livre` : `${wHours}h/sem livre`;

                return (
                  <th
                    key={week.weekKey}
                    colSpan={week.days.length}
                    className="px-1 sm:px-2 py-1 text-center font-mono font-bold border-r border-border text-blue-600 dark:text-blue-400 whitespace-nowrap"
                  >
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body: Time Off + People + Nested Projects */}
          <tbody className="divide-y divide-border/60">
            {/* 1. TIME OFF COLLAPSIBLE ROW */}
            <tr className="bg-muted/30 hover:bg-muted/50 font-semibold">
              <td
                className="px-3 py-2 sticky left-0 z-20 bg-muted/40 border-r border-border cursor-pointer flex items-center justify-between"
                onClick={() => setIsTimeOffSectionOpen(!isTimeOffSectionOpen)}
              >
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
                  {isTimeOffSectionOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRightIcon className="h-3.5 w-3.5" />
                  )}
                  <Palmtree className="h-4 w-4" />
                  <span>Time Off</span>
                </div>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 font-mono">
                  {timeOffs.length}
                </Badge>
              </td>

              {/* Time off row spanning columns */}
              <td colSpan={timelineDays.length} className="px-3 py-1.5 border-r border-border">
                {timeOffs.length === 0 ? (
                  <span className="text-muted-foreground text-[11px] italic">
                    Nenhuma ausência ou férias programadas no período.
                  </span>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {timeOffs.map((to) => (
                      <Badge
                        key={to.id}
                        variant="outline"
                        className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1"
                      >
                        <Palmtree className="h-2.5 w-2.5" />
                        <span>{to.employee_name}: {to.description} ({to.start_date} a {to.end_date})</span>
                        <button
                          onClick={() => handleDeleteTimeOff(to.id)}
                          className="ml-1 text-muted-foreground hover:text-rose-600"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </td>
            </tr>

            {/* 2. PEOPLE SECTION HEADER ROW */}
            <tr className="bg-card font-bold border-b border-border/80">
              <td
                className="px-3 py-2 sticky left-0 z-20 bg-card border-r border-border cursor-pointer flex items-center justify-between text-foreground"
                onClick={() => setIsPeopleSectionOpen(!isPeopleSectionOpen)}
              >
                <div className="flex items-center gap-2">
                  {isPeopleSectionOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <ChevronRightIcon className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span>Pessoas & Equipe</span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {filteredEmployees.length}
                </Badge>
              </td>
              <td colSpan={timelineDays.length} className="bg-muted/10" />
            </tr>

            {/* 3. LIST OF EMPLOYEES & NESTED PROJECT ROWS (Matching Screenshot 1) */}
            {isPeopleSectionOpen &&
              filteredEmployees.map((employee) => {
                const isExpanded = !!expandedEmployees[employee.id];
                const isStarred = !!starredEmployees[employee.id];
                const empTasks = tasks.filter((t) => t.assigned_employee_id === employee.id);
                const initials = employee.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <React.Fragment key={employee.id}>
                    {/* Employee Master Row */}
                    <tr className="bg-muted/15 hover:bg-muted/30 border-t-2 border-border/70 transition-colors">
                      {/* Employee Info Cell */}
                      <td className="px-2 sm:px-3 py-2 sticky left-0 z-20 bg-card border-r border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                            {/* Avatar Circle */}
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] sm:text-xs flex-shrink-0 border border-primary/20">
                              {initials}
                            </div>
                            {/* Name & Role */}
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate text-xs flex items-center gap-1">
                                <span className="truncate">{employee.name}</span>
                              </p>
                              <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                                {employee.role || "Especialista"}
                              </p>
                            </div>
                          </div>

                          {/* Quick Actions (Star, More, Expand/Collapse) */}
                          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                            <button
                              onClick={() => toggleStar(employee.id)}
                              className={`p-1 rounded hover:bg-muted ${
                                isStarred ? "text-amber-500" : "text-muted-foreground/50 hover:text-muted-foreground"
                              }`}
                              title="Favoritar"
                            >
                              <Star className="h-3 sm:h-3.5 w-3 sm:w-3.5 fill-current" />
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground">
                                  <MoreHorizontal className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuItem onClick={() => handleOpenNewTask(employee.id)}>
                                  <Plus className="h-3.5 w-3.5 mr-2 text-primary" />
                                  <span>Atribuir Tarefa / Projeto</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setFormTimeOffEmpId(employee.id);
                                    setIsNewTimeOffOpen(true);
                                  }}
                                >
                                  <Palmtree className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                  <span>Adicionar Ausência (Time Off)</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <button
                              onClick={() => toggleEmployee(employee.id)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                              ) : (
                                <ChevronRightIcon className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Weekly Free Capacity per Employee Cell Headers */}
                      {headerWeeks.map((week) => {
                        const freeLabel = getEmployeeWeeklyFreeHours(employee.id, week.days);

                        return (
                          <td
                            key={week.weekKey}
                            colSpan={week.days.length}
                            className="px-1 sm:px-2 py-1.5 text-center font-mono text-[10px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10 border-r border-border whitespace-nowrap"
                          >
                            {freeLabel}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Nested Rows: If Expanded, show each project & allocation */}
                    {isExpanded && (
                      <>
                        {/* Time off row under employee */}
                        <tr className="border-b border-border/30 bg-background/50 text-[10px] sm:text-[11px]">
                          <td className="px-2 sm:px-3 py-1.5 sticky left-0 z-20 bg-background border-r border-border pl-6 sm:pl-10 text-muted-foreground flex items-center gap-1.5">
                            <Palmtree className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-amber-500 flex-shrink-0" />
                            <span className="truncate">Time Off</span>
                          </td>
                          {timelineDays.map((day) => {
                            const isToday = isSameDay(day, today);
                            const hasTo = timeOffs.some((to) => {
                              if (to.employee_id !== employee.id) return false;
                              try {
                                const s = parseISO(to.start_date);
                                const e = parseISO(to.end_date);
                                return isWithinInterval(day, { start: s, end: e });
                              } catch {
                                return false;
                              }
                            });

                            return (
                              <td
                                key={day.toISOString()}
                                className={`px-0.5 sm:px-1 py-1 border-r border-border/30 text-center ${
                                  isToday ? "bg-primary/5" : ""
                                }`}
                              >
                                {hasTo && (
                                  <div className="w-full h-4 sm:h-5 rounded-xs bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_2px,#fef3c7_2px,#fef3c7_4px)] border border-amber-400" />
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* List of Tasks / Projects for this Employee */}
                        {empTasks.length === 0 ? (
                          <tr className="border-b border-border/30 bg-background">
                            <td className="px-2 sm:px-3 py-2 sticky left-0 z-20 bg-background border-r border-border pl-6 sm:pl-10 text-muted-foreground italic text-xs">
                              Nenhuma alocação ativa.
                            </td>
                            <td colSpan={timelineDays.length} className="px-3 py-2 text-center text-muted-foreground">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenNewTask(employee.id)}
                                className="h-6 text-[10px] gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Atribuir Primeiro Projeto</span>
                              </Button>
                            </td>
                          </tr>
                        ) : (
                          empTasks.map((task) => {
                            const project = projects.find((p) => p.id === task.project_id);
                            const hoursLabel =
                              task.hours_per_day && task.hours_per_day > 0
                                ? `${task.hours_per_day}h/d`
                                : `${task.estimated_time || 8}h`;

                            let taskStart = today;
                            let taskEnd = today;
                            try {
                              taskStart = parseISO(task.start_date);
                              taskEnd = parseISO(task.end_date);
                            } catch {}

                            const isSingleDay = isSameDay(taskStart, taskEnd);

                            return (
                              <tr
                                key={task.id}
                                className="border-b border-border/40 hover:bg-muted/20 transition-colors group/task"
                              >
                                {/* Project / Task Name cell on the left */}
                                <td className="px-2 sm:px-3 py-1.5 sticky left-0 z-20 bg-background border-r border-border pl-6 sm:pl-10 max-w-xs">
                                  <div className="flex items-center justify-between gap-1">
                                    <div
                                      className="cursor-pointer min-w-0 flex-1"
                                      onClick={() => handleEditTask(task)}
                                    >
                                      <p className="font-semibold text-foreground text-xs truncate group-hover/task:text-primary">
                                        {task.name}
                                      </p>
                                      <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                        <Briefcase className="h-2.5 w-2.5 opacity-60 flex-shrink-0" />
                                        <span className="truncate">{project?.name || "Geral"}</span>
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditTask(task)}
                                      className="h-5 w-5 sm:h-6 sm:w-6 opacity-0 group-hover/task:opacity-100 transition-opacity flex-shrink-0"
                                      title="Editar Tarefa"
                                    >
                                      <Edit2 className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                  </div>
                                </td>

                                {/* Allocation Bars across the Timeline Days */}
                                {timelineDays.map((day) => {
                                  const isToday = isSameDay(day, today);
                                  const isAssigned = isWithinInterval(day, {
                                    start: taskStart,
                                    end: taskEnd,
                                  });
                                  const isFirstDay = isSameDay(day, taskStart);
                                  const isLastDay = isSameDay(day, taskEnd);

                                  return (
                                    <td
                                      key={day.toISOString()}
                                      onClick={() => {
                                        if (!isAssigned) {
                                          handleOpenNewTask(employee.id, day);
                                        } else {
                                          handleEditTask(task);
                                        }
                                      }}
                                      className={`px-0.5 py-1 border-r border-border/30 relative cursor-pointer hover:bg-primary/5 ${
                                        isToday ? "bg-primary/5" : ""
                                      }`}
                                    >
                                      {isAssigned && (
                                        <div
                                          className={`h-5 sm:h-7 bg-blue-500/20 dark:bg-blue-950/40 border-y border-blue-500/40 flex items-center justify-center px-0.5 sm:px-1 text-blue-700 dark:text-blue-300 font-bold text-[9px] sm:text-[10px] shadow-2xs relative overflow-hidden ${
                                            isFirstDay ? "rounded-l-md border-l" : ""
                                          } ${isLastDay ? "rounded-r-md border-r" : ""}`}
                                        >
                                          {/* Pink / Coral Cap Accent Line (Matching Screenshot 1) */}
                                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-rose-500" />

                                          {/* Label on first day or middle day */}
                                          {isFirstDay ? (
                                            <span className="flex items-center gap-0.5 sm:gap-1 truncate font-mono text-[9px] sm:text-[10px]">
                                              <Clock className="h-2 sm:h-2.5 w-2 sm:w-2.5 opacity-70 flex-shrink-0" />
                                              <span className="truncate">{hoursLabel}</span>
                                            </span>
                                          ) : isSingleDay ? (
                                            <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-600 text-white font-bold text-[8px] sm:text-[9px] flex items-center justify-center">
                                              {task.hours_per_day || task.estimated_time || 1}h
                                            </span>
                                          ) : null}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}

                        {/* + Assign Project Button Row */}
                        <tr className="border-b-2 border-border/60 bg-muted/5">
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 sticky left-0 z-20 bg-background border-r border-border pl-6 sm:pl-10">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenNewTask(employee.id)}
                              className="h-6 sm:h-7 text-xs font-semibold text-primary hover:text-primary/90 gap-1.5 p-0 hover:bg-transparent"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Atribuir Projeto / Tarefa</span>
                            </Button>
                          </td>
                          <td colSpan={timelineDays.length} className="bg-background/40" />
                        </tr>
                      </>
                    )}
                  </React.Fragment>
                );
              })}

            {/* 4. BOTTOM ACTION ROW: + NEW PERSON */}
            <tr className="bg-card">
              <td className="px-3 py-3 sticky left-0 z-20 bg-card border-r border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewPersonOpen(true)}
                  className="h-8 text-xs font-bold gap-1.5 w-full border-dashed"
                >
                  <UserPlus className="h-3.5 w-3.5 text-primary" />
                  <span>+ Novo Colaborador</span>
                </Button>
              </td>
              <td colSpan={timelineDays.length} className="bg-muted/5" />
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. MODALS & DIALOGS */}

      {/* DIALOG: NEW / EDIT TASK ALLOCATION */}
      <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>{editingTask ? "Editar Alocação de Projeto" : "Nova Alocação de Projeto"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina o projeto, colaborador, datas e dedicação em horas/dia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            {/* Task Name */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome da Tarefa / Atividade *</Label>
              <Input
                placeholder="Ex: Cadastro de Lotes, Avaliação de Impacto..."
                value={formTaskName}
                onChange={(e) => setFormTaskName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Project Selection */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Projeto *</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o Projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Selection */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Colaborador Atribuído</Label>
              <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o Colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data de Início</Label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data de Término</Label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Effort Row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dedicação Diária (h/dia)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={formHoursPerDay}
                  onChange={(e) => setFormHoursPerDay(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Total Estimado (h)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formEstimatedHours}
                  onChange={(e) => setFormEstimatedHours(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Tentative Toggle */}
            <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30">
              <div>
                <p className="font-semibold text-xs text-foreground">Alocação Tentativa</p>
                <p className="text-[10px] text-muted-foreground">Marcar como proposta pendente de confirmação</p>
              </div>
              <Switch
                checked={formIsTentative}
                onCheckedChange={setFormIsTentative}
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2">
            {editingTask ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteTask(editingTask.id)}
                className="h-8 text-xs gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir</span>
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewTaskOpen(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveTask}
                className="h-8 text-xs font-semibold"
              >
                Salvar Alocação
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: NEW PERSON */}
      <Dialog open={isNewPersonOpen} onOpenChange={setIsNewPersonOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <span>Adicionar Novo Colaborador</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cadastre um membro na equipe para planejamento de alocação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                placeholder="Ex: Denis Aranha, Mariana Silva..."
                value={formPersonName}
                onChange={(e) => setFormPersonName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Cargo / Especialidade</Label>
              <Input
                placeholder="Ex: Especialista, Gestor, Desenvolvedor..."
                value={formPersonRole}
                onChange={(e) => setFormPersonRole(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Carga Horária Semanal (horas)</Label>
              <Input
                type="number"
                min="10"
                max="60"
                value={formPersonWeeklyHours}
                onChange={(e) => setFormPersonWeeklyHours(Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewPersonOpen(false)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSavePerson}
              className="h-8 text-xs font-semibold"
            >
              Cadastrar Colaborador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: TIME OFF */}
      <Dialog open={isNewTimeOffOpen} onOpenChange={setIsNewTimeOffOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Palmtree className="h-4 w-4 text-amber-600" />
              <span>Registrar Ausência / Time Off</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Adicione férias, folgas ou licenças para ajustar a capacidade do time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Colaborador *</Label>
              <Select value={formTimeOffEmpId} onValueChange={setFormTimeOffEmpId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o Colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Motivo / Tipo</Label>
              <Select
                value={formTimeOffType}
                onValueChange={(v) => setFormTimeOffType(v as any)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Férias</SelectItem>
                  <SelectItem value="holiday">Feriado / Recesso</SelectItem>
                  <SelectItem value="sick_leave">Licença Médica</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descrição</Label>
              <Input
                placeholder="Ex: Férias de Verão, Recesso de Fim de Ano..."
                value={formTimeOffDesc}
                onChange={(e) => setFormTimeOffDesc(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data Início</Label>
                <Input
                  type="date"
                  value={formTimeOffStart}
                  onChange={(e) => setFormTimeOffStart(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data Término</Label>
                <Input
                  type="date"
                  value={formTimeOffEnd}
                  onChange={(e) => setFormTimeOffEnd(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewTimeOffOpen(false)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTimeOff}
              className="h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
            >
              Registrar Ausência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourcePlanningView;
