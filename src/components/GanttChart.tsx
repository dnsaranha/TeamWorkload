import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  format,
  addDays,
  differenceInCalendarDays,
  parseISO,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Link2,
  Unlink,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Edit2,
  Trash2,
  Wand2,
  Rocket,
  Target,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Folder,
  FolderOpen,
  CornerDownRight,
  PlusCircle,
  BarChart3,
  Percent,
  Check,
  ChevronsUpDown,
  ListTree,
  Eye,
  SlidersHorizontal,
  RotateCcw,
  MoveHorizontal,
  Sparkles,
} from "lucide-react";
import {
  taskService,
  employeeService,
  projectService,
  type Task,
  type Employee,
  type Project,
  type TaskInsert,
} from "@/lib/supabaseClient";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";
import { Progress } from "./ui/progress";
import { useToast } from "./ui/use-toast";
import { Switch } from "./ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";

interface GanttChartProps {
  onTaskChange?: () => void;
}

type ZoomLevel = "days" | "weeks" | "months";

interface DependencyLink {
  fromId: string;
  toId: string;
  hasConflict: boolean;
}

export interface GanttDisplaySettings {
  labelPosition: "inside" | "outside" | "both";
  showAssigneeOnBar: boolean;
  showAssigneeInList: boolean;
  barDetails: {
    name: boolean;
    progress: boolean;
    duration: boolean;
    hours: boolean;
    dates: boolean;
  };
  listColumns: {
    seqNumber: boolean;
    statusIcon: boolean;
    assignee: boolean;
    hours: boolean;
    dates: boolean;
    progress: boolean;
    actions: boolean;
  };
}

export const DEFAULT_GANTT_SETTINGS: GanttDisplaySettings = {
  labelPosition: "both",
  showAssigneeOnBar: true,
  showAssigneeInList: true,
  barDetails: {
    name: true,
    progress: true,
    duration: true,
    hours: true,
    dates: false,
  },
  listColumns: {
    seqNumber: true,
    statusIcon: true,
    assignee: true,
    hours: true,
    dates: true,
    progress: true,
    actions: true,
  },
};

export interface TimelineDragState {
  type:
    | "move"
    | "resize-start"
    | "resize-end"
    | "connect-dep"
    | "reconnect-dep-target"
    | "reconnect-dep-source";
  task: Task;
  startClientX: number;
  startClientY: number;
  initialStartDate: string;
  initialEndDate: string;
  currentDeltaDays: number;
  previewStartDate: string;
  previewEndDate: string;
  sourceCoords?: { x: number; y: number };
  currentPointerCoords?: { x: number; y: number };
  hoveredTargetTaskId?: string | null;
  arrowConnection?: {
    fromId: string;
    toId: string;
    fromName: string;
    toName: string;
  };
}

// Flat item representing each row in the Gantt grid (Project Header, Task, or Subtask)
export interface GanttRowItem {
  rowType: "project" | "task" | "subtask";
  id: string; // project.id or task.id
  projectId: string;
  project?: Project;
  task?: Task;
  parentTask?: Task;
  seqNumber: string; // e.g. "1", "1.1", "1.2"
  level: number; // 0 = project, 1 = task, 2 = subtask
  isExpanded?: boolean;
  hasChildren?: boolean;
  startDate: string;
  endDate: string;
  totalHours: number;
  progress: number;
  status?: string;
  employee?: Employee;
  specialMarker?: string | null;
}

export const GanttChart: React.FC<GanttChartProps> = ({ onTaskChange }) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("days");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Collapsed states for hierarchy
  // Map projectId -> boolean (true = collapsed)
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  // Map taskId -> boolean (true = collapsed)
  const [collapsedParentTasks, setCollapsedParentTasks] = useState<Record<string, boolean>>({});

  // Display and Column Customization Settings with LocalStorage persistence
  const [displaySettings, setDisplaySettings] = useState<GanttDisplaySettings>(() => {
    try {
      const saved = localStorage.getItem("crono_pulse_gantt_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_GANTT_SETTINGS,
          ...parsed,
          barDetails: { ...DEFAULT_GANTT_SETTINGS.barDetails, ...(parsed.barDetails || {}) },
          listColumns: { ...DEFAULT_GANTT_SETTINGS.listColumns, ...(parsed.listColumns || {}) },
        };
      }
    } catch (e) {
      console.warn("Error reading gantt settings:", e);
    }
    return DEFAULT_GANTT_SETTINGS;
  });

  const updateDisplaySettings = (
    updater: (prev: GanttDisplaySettings) => GanttDisplaySettings
  ) => {
    setDisplaySettings((prev) => {
      const updated = updater(prev);
      try {
        localStorage.setItem("crono_pulse_gantt_settings", JSON.stringify(updated));
      } catch (e) {
        console.error("Error saving gantt settings:", e);
      }
      return updated;
    });
  };

  // Interactive Drag & Drop Engine states
  const [activeDrag, setActiveDrag] = useState<TimelineDragState | null>(null);
  const [quickLinkPredecessor, setQuickLinkPredecessor] = useState<Task | null>(null);
  const [hoveredArrowId, setHoveredArrowId] = useState<string | null>(null);

  // Legacy display toggles linked to settings
  const showProgressBars = displaySettings.listColumns.progress;
  const showDatesInTable = displaySettings.listColumns.dates;
  const showHoursInTable = displaySettings.listColumns.hours;

  // Modals & form state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDependencyModalOpen, setIsDependencyModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeLinkingTask, setActiveLinkingTask] = useState<Task | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formProjectId, setFormProjectId] = useState<string>("none");
  const [formParentId, setFormParentId] = useState<string>("none");
  const [formEmployeeId, setFormEmployeeId] = useState<string>("none");
  const [formStatus, setFormStatus] = useState<string>("pending");
  const [formProgress, setFormProgress] = useState<number>(0);
  const [formEstimatedHours, setFormEstimatedHours] = useState<number>(8);
  const [formSpecialMarker, setFormSpecialMarker] = useState<string>("none");
  const [formDependencies, setFormDependencies] = useState<string[]>([]);

  // Task reordering states (Drag and Drop & Move Up/Down)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Helper to persist task order to state and localStorage
  const persistTaskOrder = (newTasks: Task[]) => {
    setTasks(newTasks);
    try {
      const orderIds = newTasks.map((t) => t.id);
      localStorage.setItem("crono_pulse_task_order", JSON.stringify(orderIds));
    } catch (e) {
      console.error("Error saving task order:", e);
    }
  };

  // Move Task Up
  const handleMoveTaskUp = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const currentIdx = tasks.findIndex((t) => t.id === taskId);
    if (currentIdx <= 0) return;

    const currentTask = tasks[currentIdx];
    let targetIdx = -1;

    // Look for previous sibling with same project & parent
    for (let i = currentIdx - 1; i >= 0; i--) {
      if (
        tasks[i].project_id === currentTask.project_id &&
        (tasks[i].parent_id || null) === (currentTask.parent_id || null)
      ) {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx === -1) {
      targetIdx = currentIdx - 1;
    }

    const updated = [...tasks];
    const [removed] = updated.splice(currentIdx, 1);
    updated.splice(targetIdx, 0, removed);
    persistTaskOrder(updated);
  };

  // Move Task Down
  const handleMoveTaskDown = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const currentIdx = tasks.findIndex((t) => t.id === taskId);
    if (currentIdx === -1 || currentIdx >= tasks.length - 1) return;

    const currentTask = tasks[currentIdx];
    let targetIdx = -1;

    // Look for next sibling with same project & parent
    for (let i = currentIdx + 1; i < tasks.length; i++) {
      if (
        tasks[i].project_id === currentTask.project_id &&
        (tasks[i].parent_id || null) === (currentTask.parent_id || null)
      ) {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx === -1) {
      targetIdx = currentIdx + 1;
    }

    const updated = [...tasks];
    const [removed] = updated.splice(currentIdx, 1);
    updated.splice(targetIdx, 0, removed);
    persistTaskOrder(updated);
  };

  // HTML5 Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedTaskId && draggedTaskId !== targetTaskId) {
      setDragOverTaskId(targetTaskId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTaskId(null);
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    const sourceId = draggedTaskId || e.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const fromIdx = tasks.findIndex((t) => t.id === sourceId);
    const toIdx = tasks.findIndex((t) => t.id === targetTaskId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const updated = [...tasks];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      persistTaskOrder(updated);
    }

    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  // Timeline Canvas Ref
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [loadedTasks, loadedEmployees, loadedProjects] = await Promise.all([
        taskService.getAll(),
        employeeService.getAll(),
        projectService.getAll(),
      ]);

      // Apply saved task order if available
      try {
        const savedOrderStr = localStorage.getItem("crono_pulse_task_order");
        if (savedOrderStr) {
          const savedOrder: string[] = JSON.parse(savedOrderStr);
          const orderMap = new Map(savedOrder.map((id, index) => [id, index]));
          loadedTasks.sort((a, b) => {
            const idxA = orderMap.has(a.id) ? (orderMap.get(a.id) as number) : 999999;
            const idxB = orderMap.has(b.id) ? (orderMap.get(b.id) as number) : 999999;
            return idxA - idxB;
          });
        }
      } catch (e) {
        console.warn("Error parsing task order:", e);
      }

      setTasks(loadedTasks);
      setEmployees(loadedEmployees);
      setProjects(loadedProjects);
    } catch (err) {
      console.error("Error loading Gantt data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Project collapse
  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // Toggle Parent Task collapse
  const toggleParentTaskCollapse = (taskId: string) => {
    setCollapsedParentTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Expand / Collapse all projects and tasks
  const handleExpandAll = () => {
    setCollapsedProjects({});
    setCollapsedParentTasks({});
  };

  const handleCollapseAll = () => {
    const projMap: Record<string, boolean> = {};
    projects.forEach((p) => {
      projMap[p.id] = true;
    });
    projMap["unassigned"] = true;
    setCollapsedProjects(projMap);
  };

  // Filter tasks based on search & filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchSearch =
        !searchTerm ||
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchProject =
        selectedProjectId === "all" || task.project_id === selectedProjectId;
      const matchEmployee =
        selectedEmployeeId === "all" ||
        task.assigned_employee_id === selectedEmployeeId;

      return matchSearch && matchProject && matchEmployee;
    });
  }, [tasks, searchTerm, selectedProjectId, selectedEmployeeId]);

  // Build the hierarchical row list (Projects -> Tasks -> Subtasks)
  const ganttRows = useMemo<GanttRowItem[]>(() => {
    const rows: GanttRowItem[] = [];
    const empMap = new Map(employees.map((e) => [e.id, e]));

    // Group tasks by project
    const projectGroups: { project: Project | null; projectId: string; tasks: Task[] }[] = [];

    // Filter projects if a project is selected
    const activeProjects =
      selectedProjectId === "all"
        ? projects
        : projects.filter((p) => p.id === selectedProjectId);

    activeProjects.forEach((proj) => {
      const projTasks = filteredTasks.filter((t) => t.project_id === proj.id);
      projectGroups.push({
        project: proj,
        projectId: proj.id,
        tasks: projTasks,
      });
    });

    // Unassigned project tasks
    if (selectedProjectId === "all") {
      const unassignedTasks = filteredTasks.filter((t) => !t.project_id);
      if (unassignedTasks.length > 0) {
        projectGroups.push({
          project: null,
          projectId: "unassigned",
          tasks: unassignedTasks,
        });
      }
    }

    let globalProjectCounter = 1;

    projectGroups.forEach((group) => {
      const { project, projectId, tasks: pTasks } = group;

      // Project calculations
      let projStart = project?.start_date || "";
      let projEnd = project?.end_date || "";
      let totalHours = 0;
      let totalProgressSum = 0;

      if (pTasks.length > 0) {
        let minStart = pTasks[0].start_date;
        let maxEnd = pTasks[0].end_date;

        pTasks.forEach((t) => {
          if (!minStart || (t.start_date && t.start_date < minStart)) minStart = t.start_date;
          if (!maxEnd || (t.end_date && t.end_date > maxEnd)) maxEnd = t.end_date;
          totalHours += Number(t.estimated_time || 0);

          const taskProg =
            t.progress !== null && t.progress !== undefined
              ? t.progress
              : t.status === "completed"
                ? 100
                : t.status === "in_progress"
                  ? 50
                  : 0;
          totalProgressSum += taskProg * (t.estimated_time || 8);
        });

        projStart = minStart;
        projEnd = maxEnd;
      }

      const calculatedProgress =
        totalHours > 0
          ? Math.round(totalProgressSum / totalHours)
          : pTasks.length > 0
            ? Math.round(
                pTasks.reduce((acc, t) => {
                  return (
                    acc +
                    (t.progress ??
                      (t.status === "completed" ? 100 : t.status === "in_progress" ? 50 : 0))
                  );
                }, 0) / pTasks.length
              )
            : 0;

      const isProjectCollapsed = Boolean(collapsedProjects[projectId]);

      // Add Project Row
      rows.push({
        rowType: "project",
        id: `proj-row-${projectId}`,
        projectId,
        project: project || {
          id: "unassigned",
          name: "Tarefas Sem Projeto",
          description: "Tarefas avulsas não vinculadas",
          start_date: projStart || new Date().toISOString().split("T")[0],
          end_date: projEnd || addDays(new Date(), 7).toISOString().split("T")[0],
          created_at: null,
          updated_at: null,
        },
        seqNumber: `${globalProjectCounter}`,
        level: 0,
        isExpanded: !isProjectCollapsed,
        hasChildren: pTasks.length > 0,
        startDate: projStart || new Date().toISOString().split("T")[0],
        endDate: projEnd || addDays(new Date(), 7).toISOString().split("T")[0],
        totalHours,
        progress: calculatedProgress,
        specialMarker: project?.special_marker,
      });

      globalProjectCounter++;

      // If project is collapsed, don't show its tasks in rows
      if (isProjectCollapsed) return;

      // Separate main tasks (parent_id is null/undefined) and subtasks
      const mainTasks = pTasks.filter((t) => !t.parent_id);
      const subtasksMap = new Map<string, Task[]>();

      pTasks.forEach((t) => {
        if (t.parent_id) {
          const list = subtasksMap.get(t.parent_id) || [];
          list.push(t);
          subtasksMap.set(t.parent_id, list);
        }
      });

      mainTasks.forEach((task, tIdx) => {
        const subtasks = subtasksMap.get(task.id) || [];
        const isParentCollapsed = Boolean(collapsedParentTasks[task.id]);
        const seqNumber = `${tIdx + 1}`;

        const taskProg =
          task.progress !== null && task.progress !== undefined
            ? task.progress
            : task.status === "completed"
              ? 100
              : task.status === "in_progress"
                ? 50
                : 0;

        // Add Main Task Row
        rows.push({
          rowType: "task",
          id: task.id,
          projectId,
          project: project || undefined,
          task,
          seqNumber,
          level: 1,
          isExpanded: !isParentCollapsed,
          hasChildren: subtasks.length > 0,
          startDate: task.start_date,
          endDate: task.end_date,
          totalHours: task.estimated_time || 0,
          progress: taskProg,
          status: task.status || "pending",
          employee: task.assigned_employee_id ? empMap.get(task.assigned_employee_id) : undefined,
          specialMarker: task.special_marker,
        });

        // Add Subtasks if parent is expanded
        if (!isParentCollapsed && subtasks.length > 0) {
          subtasks.forEach((subtask, sIdx) => {
            const subProg =
              subtask.progress !== null && subtask.progress !== undefined
                ? subtask.progress
                : subtask.status === "completed"
                  ? 100
                  : subtask.status === "in_progress"
                    ? 50
                    : 0;

            rows.push({
              rowType: "subtask",
              id: subtask.id,
              projectId,
              project: project || undefined,
              task: subtask,
              parentTask: task,
              seqNumber: `${tIdx + 1}.${sIdx + 1}`,
              level: 2,
              startDate: subtask.start_date,
              endDate: subtask.end_date,
              totalHours: subtask.estimated_time || 0,
              progress: subProg,
              status: subtask.status || "pending",
              employee: subtask.assigned_employee_id
                ? empMap.get(subtask.assigned_employee_id)
                : undefined,
              specialMarker: subtask.special_marker,
            });
          });
        }
      });
    });

    return rows;
  }, [projects, filteredTasks, employees, selectedProjectId, collapsedProjects, collapsedParentTasks]);

  // Timeline range calculations
  const { timelineStart, timelineEnd, totalDays, dayWidth } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      const start = addDays(now, -7);
      const end = addDays(now, 21);
      return {
        timelineStart: start,
        timelineEnd: end,
        totalDays: differenceInCalendarDays(end, start) + 1,
        dayWidth: zoomLevel === "days" ? 44 : zoomLevel === "weeks" ? 20 : 8,
      };
    }

    let minD = parseISO(tasks[0].start_date);
    let maxD = parseISO(tasks[0].end_date);

    tasks.forEach((t) => {
      try {
        const s = parseISO(t.start_date);
        const e = parseISO(t.end_date);
        if (s < minD) minD = s;
        if (e > maxD) maxD = e;
      } catch (e) {
        // ignore invalid dates
      }
    });

    // Also include project dates
    projects.forEach((p) => {
      try {
        if (p.start_date) {
          const s = parseISO(p.start_date);
          if (s < minD) minD = s;
        }
        if (p.end_date) {
          const e = parseISO(p.end_date);
          if (e > maxD) maxD = e;
        }
      } catch (e) {
        // ignore
      }
    });

    // Add padding around timeline
    const paddedStart = startOfWeek(addDays(minD, -7), { weekStartsOn: 0 });
    const paddedEnd = endOfWeek(addDays(maxD, 14), { weekStartsOn: 0 });
    const daysCount = Math.max(14, differenceInCalendarDays(paddedEnd, paddedStart) + 1);

    const widthPerDay = zoomLevel === "days" ? 44 : zoomLevel === "weeks" ? 18 : 7;

    return {
      timelineStart: paddedStart,
      timelineEnd: paddedEnd,
      totalDays: daysCount,
      dayWidth: widthPerDay,
    };
  }, [tasks, projects, zoomLevel]);

  // Dependencies with conflict detection
  const dependencyLinks: DependencyLink[] = useMemo(() => {
    const links: DependencyLink[] = [];
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    tasks.forEach((successor) => {
      if (successor.dependencies && successor.dependencies.length > 0) {
        successor.dependencies.forEach((predecessorId) => {
          const predecessor = taskMap.get(predecessorId);
          if (predecessor) {
            try {
              const predEnd = parseISO(predecessor.end_date);
              const succStart = parseISO(successor.start_date);
              const hasConflict = predEnd > succStart;

              links.push({
                fromId: predecessor.id,
                toId: successor.id,
                hasConflict,
              });
            } catch (e) {
              // ignore date parse errors
            }
          }
        });
      }
    });

    return links;
  }, [tasks]);

  const conflictCount = useMemo(() => {
    return dependencyLinks.filter((l) => l.hasConflict).length;
  }, [dependencyLinks]);

  // Helper to get bar position & width for any start and end date
  const getBarCoords = (startDateStr: string, endDateStr: string) => {
    try {
      const s = parseISO(startDateStr);
      const e = parseISO(endDateStr);
      const startOffsetDays = differenceInCalendarDays(s, timelineStart);
      const durationDays = Math.max(1, differenceInCalendarDays(e, s) + 1);

      const left = Math.max(0, startOffsetDays * dayWidth);
      const width = Math.max(dayWidth * 0.9, durationDays * dayWidth);

      return { left, width, durationDays };
    } catch {
      return { left: 0, width: dayWidth, durationDays: 1 };
    }
  };

  // Scroll timeline smoothly to task/project on click
  const handleScrollToItem = (startDate: string, id: string) => {
    setHighlightedTaskId(id);
    const coords = getBarCoords(startDate, startDate);
    if (timelineScrollRef.current) {
      const containerWidth = timelineScrollRef.current.clientWidth;
      const targetScroll = Math.max(0, coords.left - containerWidth / 3.5);
      timelineScrollRef.current.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
    }
  };

  // Check and auto-expand project dates if task extends beyond project boundaries
  const checkAndExpandProjectDates = async (
    task: Task,
    newStartStr: string,
    newEndStr: string
  ) => {
    if (!task.project_id || task.project_id === "unassigned") return;
    const project = projects.find((p) => p.id === task.project_id);
    if (!project) return;

    let needUpdate = false;
    let updatedStart = project.start_date;
    let updatedEnd = project.end_date;

    if (project.start_date && newStartStr < project.start_date) {
      updatedStart = newStartStr;
      needUpdate = true;
    }
    if (project.end_date && newEndStr > project.end_date) {
      updatedEnd = newEndStr;
      needUpdate = true;
    }

    if (needUpdate) {
      try {
        await projectService.update(project.id, {
          start_date: updatedStart,
          end_date: updatedEnd,
        });

        // Update local project in state so summary bar updates without delay
        setProjects((prev) =>
          prev.map((p) =>
            p.id === project.id
              ? { ...p, start_date: updatedStart, end_date: updatedEnd }
              : p
          )
        );

        toast({
          title: "Prazo do Projeto Reajustado Automaticamente",
          description: `O projeto "${project.name}" foi estendido (${format(
            parseISO(updatedStart),
            "dd/MM/yyyy"
          )} a ${format(
            parseISO(updatedEnd),
            "dd/MM/yyyy"
          )}) para comportar a tarefa "${task.name}".`,
        });
      } catch (e) {
        console.error("Erro ao atualizar datas do projeto:", e);
      }
    }
  };

  // Persist updated task dates after dragging or resizing
  const handleTaskDatesChange = async (
    task: Task,
    newStartStr: string,
    newEndStr: string
  ) => {
    if (task.start_date === newStartStr && task.end_date === newEndStr) return;

    try {
      // 1. Check and re-align project boundaries if task extends beyond
      await checkAndExpandProjectDates(task, newStartStr, newEndStr);

      // 2. Persist updated task dates
      await taskService.update(task.id, {
        start_date: newStartStr,
        end_date: newEndStr,
      });

      toast({
        title: "Cronograma Atualizado",
        description: `"${task.name}": ${format(
          parseISO(newStartStr),
          "dd/MM/yyyy"
        )} a ${format(parseISO(newEndStr), "dd/MM/yyyy")}.`,
      });

      await loadData();
      if (onTaskChange) onTaskChange();
    } catch (err) {
      console.error("Erro ao atualizar período da tarefa:", err);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível salvar o novo período da tarefa.",
      });
    }
  };

  // Connect dependency between predecessor and successor
  const handleLinkDependency = async (predecessor: Task, successor: Task) => {
    const currentDeps = successor.dependencies || [];
    if (currentDeps.includes(predecessor.id)) {
      toast({
        title: "Dependência já existe",
        description: `A tarefa "${successor.name}" já possui "${predecessor.name}" como predecessora.`,
      });
      return;
    }

    if (predecessor.dependencies?.includes(successor.id)) {
      toast({
        variant: "destructive",
        title: "Conflito de Dependência Circular",
        description: `Não é possível vincular: "${predecessor.name}" já depende de "${successor.name}".`,
      });
      return;
    }

    try {
      const updated = [...currentDeps, predecessor.id];
      await taskService.update(successor.id, { dependencies: updated });
      toast({
        title: "Dependência Vinculada!",
        description: `"${predecessor.name}" definida como predecessora de "${successor.name}".`,
      });
      await loadData();
      if (onTaskChange) onTaskChange();
    } catch (e) {
      console.error("Erro ao vincular dependência:", e);
      toast({
        variant: "destructive",
        title: "Erro ao vincular",
        description: "Não foi possível registrar a dependência.",
      });
    }
  };

  // Remove dependency between predecessor and successor
  const handleUnlinkDependency = async (fromId: string, toId: string) => {
    const successor = tasks.find((t) => t.id === toId);
    const predecessor = tasks.find((t) => t.id === fromId);
    if (!successor) return;

    try {
      const updated = (successor.dependencies || []).filter((id) => id !== fromId);
      await taskService.update(successor.id, { dependencies: updated });
      toast({
        title: "Dependência Desconectada",
        description: predecessor
          ? `A ligação de "${predecessor.name}" para "${successor.name}" foi desfeita.`
          : "A dependência foi removida com sucesso.",
      });
      await loadData();
      if (onTaskChange) onTaskChange();
    } catch (e) {
      console.error("Erro ao remover dependência:", e);
      toast({
        variant: "destructive",
        title: "Erro ao desconectar",
        description: "Não foi possível remover a dependência.",
      });
    }
  };

  // Complete quick dependency selection
  const handleCompleteQuickLink = async (predecessor: Task, successor: Task) => {
    setQuickLinkPredecessor(null);
    await handleLinkDependency(predecessor, successor);
  };

  // Start pointer dragging for move, resize-start, resize-end, or connect-dep
  const handleStartDrag = (
    e: React.PointerEvent,
    task: Task,
    type: "move" | "resize-start" | "resize-end" | "connect-dep"
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    // If quick dependency linking is active, complete the link upon clicking target task
    if (quickLinkPredecessor) {
      if (quickLinkPredecessor.id !== task.id) {
        handleCompleteQuickLink(quickLinkPredecessor, task);
      }
      return;
    }

    let sourceCoords: { x: number; y: number } | undefined = undefined;
    if (type === "connect-dep") {
      const coords = getBarCoords(task.start_date, task.end_date);
      const rowIdx = ganttRows.findIndex((r) => r.id === task.id);
      const rowY = rowIdx !== -1 ? rowIdx * 44 + 22 : 0;
      sourceCoords = {
        x: coords.left + coords.width,
        y: rowY,
      };
    }

    setActiveDrag({
      type,
      task,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialStartDate: task.start_date,
      initialEndDate: task.end_date,
      currentDeltaDays: 0,
      previewStartDate: task.start_date,
      previewEndDate: task.end_date,
      sourceCoords,
      currentPointerCoords: sourceCoords,
      hoveredTargetTaskId: null,
    });
  };

  // Start dragging an existing dependency arrow (reconnect head/target or tail/source)
  const handleStartArrowDrag = (
    e: React.PointerEvent,
    conn: {
      fromId: string;
      toId: string;
      fromName: string;
      toName: string;
      fromTask?: Task;
      toTask?: Task;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    },
    mode: "target" | "source"
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const fromTask = conn.fromTask || tasks.find((t) => t.id === conn.fromId);
    const toTask = conn.toTask || tasks.find((t) => t.id === conn.toId);
    if (!fromTask || !toTask) return;

    const type = mode === "target" ? "reconnect-dep-target" : "reconnect-dep-source";
    const sourceCoords =
      mode === "target"
        ? { x: conn.startX, y: conn.startY }
        : { x: conn.endX, y: conn.endY };

    let curCoords = sourceCoords;
    if (timelineScrollRef.current) {
      const rect = timelineScrollRef.current.getBoundingClientRect();
      const curX = e.clientX - rect.left + timelineScrollRef.current.scrollLeft;
      const curY = e.clientY - rect.top + timelineScrollRef.current.scrollTop - 40;
      curCoords = { x: curX, y: curY };
    }

    setActiveDrag({
      type,
      task: mode === "target" ? fromTask : toTask,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialStartDate: (mode === "target" ? fromTask : toTask).start_date,
      initialEndDate: (mode === "target" ? fromTask : toTask).end_date,
      currentDeltaDays: 0,
      previewStartDate: (mode === "target" ? fromTask : toTask).start_date,
      previewEndDate: (mode === "target" ? fromTask : toTask).end_date,
      sourceCoords,
      currentPointerCoords: curCoords,
      hoveredTargetTaskId: null,
      arrowConnection: {
        fromId: conn.fromId,
        toId: conn.toId,
        fromName: conn.fromName,
        toName: conn.toName,
      },
    });
  };

  // Global pointer listeners for smooth dragging and resizing
  useEffect(() => {
    if (!activeDrag) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - activeDrag.startClientX;
      const deltaDays = Math.round(deltaX / dayWidth);

      if (
        activeDrag.type === "connect-dep" ||
        activeDrag.type === "reconnect-dep-target" ||
        activeDrag.type === "reconnect-dep-source"
      ) {
        if (timelineScrollRef.current) {
          const rect = timelineScrollRef.current.getBoundingClientRect();
          const curX = e.clientX - rect.left + timelineScrollRef.current.scrollLeft;
          const curY = e.clientY - rect.top + timelineScrollRef.current.scrollTop - 40;
          const targetRowIdx = Math.floor(curY / 44);
          const targetRow = ganttRows[targetRowIdx];

          let targetId: string | null = null;
          if (targetRow && targetRow.task) {
            if (activeDrag.type === "reconnect-dep-source") {
              // Can't set target to the successor task itself
              if (targetRow.task.id !== activeDrag.arrowConnection?.toId) {
                targetId = targetRow.task.id;
              }
            } else {
              // Can't set target to the predecessor task itself
              if (targetRow.task.id !== activeDrag.task.id) {
                targetId = targetRow.task.id;
              }
            }
          }

          setActiveDrag((prev) =>
            prev
              ? {
                  ...prev,
                  currentPointerCoords: { x: curX, y: curY },
                  hoveredTargetTaskId: targetId,
                }
              : null
          );
        }
        return;
      }

      try {
        const origStart = parseISO(activeDrag.initialStartDate);
        const origEnd = parseISO(activeDrag.initialEndDate);

        if (activeDrag.type === "move") {
          const newStart = addDays(origStart, deltaDays);
          const newEnd = addDays(origEnd, deltaDays);
          setActiveDrag((prev) =>
            prev
              ? {
                  ...prev,
                  currentDeltaDays: deltaDays,
                  previewStartDate: format(newStart, "yyyy-MM-dd"),
                  previewEndDate: format(newEnd, "yyyy-MM-dd"),
                }
              : null
          );
        } else if (activeDrag.type === "resize-start") {
          let newStart = addDays(origStart, deltaDays);
          if (newStart > origEnd) newStart = origEnd;
          setActiveDrag((prev) =>
            prev
              ? {
                  ...prev,
                  currentDeltaDays: deltaDays,
                  previewStartDate: format(newStart, "yyyy-MM-dd"),
                  previewEndDate: format(origEnd, "yyyy-MM-dd"),
                }
              : null
          );
        } else if (activeDrag.type === "resize-end") {
          let newEnd = addDays(origEnd, deltaDays);
          if (newEnd < origStart) newEnd = origStart;
          setActiveDrag((prev) =>
            prev
              ? {
                  ...prev,
                  currentDeltaDays: deltaDays,
                  previewStartDate: format(origStart, "yyyy-MM-dd"),
                  previewEndDate: format(newEnd, "yyyy-MM-dd"),
                }
              : null
          );
        }
      } catch (err) {
        console.error("Erro no cálculo do arraste:", err);
      }
    };

    const handlePointerUp = async (e: PointerEvent) => {
      const drag = activeDrag;
      setActiveDrag(null);
      if (!drag) return;

      if (drag.type === "connect-dep") {
        if (drag.hoveredTargetTaskId) {
          const targetTask = tasks.find((t) => t.id === drag.hoveredTargetTaskId);
          if (targetTask && targetTask.id !== drag.task.id) {
            await handleLinkDependency(drag.task, targetTask);
          }
        }
        return;
      }

      if (drag.type === "reconnect-dep-target") {
        const { arrowConnection, hoveredTargetTaskId } = drag;
        if (!arrowConnection) return;
        const oldPredecessor = tasks.find((t) => t.id === arrowConnection.fromId);
        const oldSuccessor = tasks.find((t) => t.id === arrowConnection.toId);

        if (hoveredTargetTaskId) {
          if (hoveredTargetTaskId === arrowConnection.toId) {
            return; // Dropped on same successor, leave as is
          }
          const newSuccessor = tasks.find((t) => t.id === hoveredTargetTaskId);
          if (newSuccessor && oldPredecessor && oldSuccessor) {
            // Check circular dependency
            if (oldPredecessor.dependencies?.includes(newSuccessor.id)) {
              toast({
                variant: "destructive",
                title: "Conflito de Dependência Circular",
                description: `Não é possível vincular: "${oldPredecessor.name}" já depende de "${newSuccessor.name}".`,
              });
              return;
            }

            // Remove from old successor
            const oldDeps = (oldSuccessor.dependencies || []).filter(
              (id) => id !== oldPredecessor.id
            );
            await taskService.update(oldSuccessor.id, { dependencies: oldDeps });

            // Add to new successor
            const newDeps = Array.from(
              new Set([...(newSuccessor.dependencies || []), oldPredecessor.id])
            );
            await taskService.update(newSuccessor.id, { dependencies: newDeps });

            toast({
              title: "Seta de Dependência Reconectada!",
              description: `A seta de "${oldPredecessor.name}" foi transferida para "${newSuccessor.name}".`,
            });
            await loadData();
            if (onTaskChange) onTaskChange();
          }
        } else {
          // Dropped in empty space: detach dependency!
          if (oldSuccessor && oldPredecessor) {
            const oldDeps = (oldSuccessor.dependencies || []).filter(
              (id) => id !== oldPredecessor.id
            );
            await taskService.update(oldSuccessor.id, { dependencies: oldDeps });
            toast({
              title: "Dependência Desconectada",
              description: `A ligação entre "${oldPredecessor.name}" e "${oldSuccessor.name}" foi desfeita ao soltar fora.`,
            });
            await loadData();
            if (onTaskChange) onTaskChange();
          }
        }
        return;
      }

      if (drag.type === "reconnect-dep-source") {
        const { arrowConnection, hoveredTargetTaskId } = drag;
        if (!arrowConnection) return;
        const oldPredecessor = tasks.find((t) => t.id === arrowConnection.fromId);
        const successor = tasks.find((t) => t.id === arrowConnection.toId);

        if (hoveredTargetTaskId) {
          if (hoveredTargetTaskId === arrowConnection.fromId) {
            return; // Dropped on same predecessor, leave as is
          }
          const newPredecessor = tasks.find((t) => t.id === hoveredTargetTaskId);
          if (newPredecessor && successor) {
            // Check circular dependency
            if (newPredecessor.dependencies?.includes(successor.id)) {
              toast({
                variant: "destructive",
                title: "Conflito de Dependência Circular",
                description: `Não é possível vincular: "${newPredecessor.name}" já depende de "${successor.name}".`,
              });
              return;
            }

            const currentDeps = (successor.dependencies || []).filter(
              (id) => id !== arrowConnection.fromId
            );
            const newDeps = Array.from(new Set([...currentDeps, newPredecessor.id]));
            await taskService.update(successor.id, { dependencies: newDeps });

            toast({
              title: "Origem da Dependência Alterada!",
              description: `"${newPredecessor.name}" agora é a nova predecessora de "${successor.name}".`,
            });
            await loadData();
            if (onTaskChange) onTaskChange();
          }
        } else {
          // Dropped in empty space: detach dependency
          if (successor && oldPredecessor) {
            const currentDeps = (successor.dependencies || []).filter(
              (id) => id !== arrowConnection.fromId
            );
            await taskService.update(successor.id, { dependencies: currentDeps });
            toast({
              title: "Dependência Desconectada",
              description: `A dependência de "${successor.name}" foi desfeita ao soltar fora.`,
            });
            await loadData();
            if (onTaskChange) onTaskChange();
          }
        }
        return;
      }

      // Check if distance was too small (simple click without intentional drag)
      const dist = Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY);
      if (dist < 4) {
        return;
      }

      if (
        drag.previewStartDate !== drag.initialStartDate ||
        drag.previewEndDate !== drag.initialEndDate
      ) {
        await handleTaskDatesChange(drag.task, drag.previewStartDate, drag.previewEndDate);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [activeDrag, dayWidth, ganttRows, tasks, projects]);

  // Helper to open create modal (optionally with parent or project preset)
  const handleOpenCreateModal = (preset?: {
    projectId?: string;
    parentId?: string;
    predecessorId?: string;
  }) => {
    setEditingTask(null);
    setFormName("");
    setFormDescription("");
    const today = new Date().toISOString().split("T")[0];
    const defaultEnd = addDays(new Date(), 4).toISOString().split("T")[0];
    setFormStartDate(today);
    setFormEndDate(defaultEnd);
    setFormProjectId(preset?.projectId || (selectedProjectId !== "all" ? selectedProjectId : "none"));
    setFormParentId(preset?.parentId || "none");
    setFormEmployeeId(preset?.parentId ? "none" : (selectedEmployeeId !== "all" ? selectedEmployeeId : "none"));
    setFormStatus("pending");
    setFormProgress(0);
    setFormEstimatedHours(8);
    setFormSpecialMarker("none");
    setFormDependencies(preset?.predecessorId ? [preset.predecessorId] : []);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setFormName(task.name);
    setFormDescription(task.description || "");
    setFormStartDate(task.start_date);
    setFormEndDate(task.end_date);
    setFormProjectId(task.project_id || "none");
    setFormParentId(task.parent_id || "none");
    setFormEmployeeId(task.assigned_employee_id || "none");
    setFormStatus(task.status || "pending");
    setFormProgress(
      task.progress !== null && task.progress !== undefined
        ? task.progress
        : task.status === "completed"
          ? 100
          : task.status === "in_progress"
            ? 50
            : 0
    );
    setFormEstimatedHours(task.estimated_time || 8);
    setFormSpecialMarker(task.special_marker || "none");
    setFormDependencies(task.dependencies || []);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!formName.trim() || !formStartDate || !formEndDate) {
      return;
    }

    try {
      const prog = Number(formProgress);
      const derivedStatus =
        prog === 100 ? "completed" : prog > 0 ? "in_progress" : formStatus || "pending";

      const payload: TaskInsert = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        start_date: formStartDate,
        end_date: formEndDate,
        project_id: formProjectId === "none" ? null : formProjectId,
        parent_id: formParentId === "none" ? null : formParentId,
        assigned_employee_id: formEmployeeId === "none" ? null : formEmployeeId,
        status: derivedStatus,
        progress: prog,
        estimated_time: Number(formEstimatedHours) || 8,
        special_marker: formSpecialMarker === "none" ? null : formSpecialMarker,
        dependencies: formDependencies,
        completion_date: derivedStatus === "completed" ? new Date().toISOString().split("T")[0] : null,
      };

      if (editingTask) {
        await taskService.update(editingTask.id, payload);
      } else {
        await taskService.create(payload);
      }

      await loadData();
      if (onTaskChange) onTaskChange();
      setIsTaskModalOpen(false);
    } catch (err) {
      console.error("Error saving task:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
      try {
        await taskService.delete(taskId);
        await loadData();
        if (onTaskChange) onTaskChange();
      } catch (err) {
        console.error("Error deleting task:", err);
      }
    }
  };

  // Auto-resolve date conflict: adjusts successor start date to predecessor end date + 1 day
  const handleAutoFixConflict = async (link: DependencyLink) => {
    const predecessor = tasks.find((t) => t.id === link.fromId);
    const successor = tasks.find((t) => t.id === link.toId);
    if (!predecessor || !successor) return;

    try {
      const predEndDate = parseISO(predecessor.end_date);
      const newStartDate = addDays(predEndDate, 1);

      const succStart = parseISO(successor.start_date);
      const succEnd = parseISO(successor.end_date);
      const duration = Math.max(1, differenceInCalendarDays(succEnd, succStart));
      const newEndDate = addDays(newStartDate, duration);

      await taskService.update(successor.id, {
        start_date: format(newStartDate, "yyyy-MM-dd"),
        end_date: format(newEndDate, "yyyy-MM-dd"),
      });

      await loadData();
      if (onTaskChange) onTaskChange();
    } catch (err) {
      console.error("Error resolving conflict:", err);
    }
  };

  const handleAutoFixAllConflicts = async () => {
    const conflictLinks = dependencyLinks.filter((l) => l.hasConflict);
    for (const link of conflictLinks) {
      await handleAutoFixConflict(link);
    }
  };

  // Header days intervals
  const headerDays = useMemo(() => {
    try {
      return eachDayOfInterval({ start: timelineStart, end: timelineEnd });
    } catch {
      return [];
    }
  }, [timelineStart, timelineEnd]);

  // Weeks for grouped header
  const headerWeeks = useMemo(() => {
    try {
      return eachWeekOfInterval({ start: timelineStart, end: timelineEnd }, { weekStartsOn: 0 });
    } catch {
      return [];
    }
  }, [timelineStart, timelineEnd]);

  // Today position
  const todayOffset = useMemo(() => {
    const today = new Date();
    if (isWithinInterval(today, { start: timelineStart, end: timelineEnd })) {
      const days = differenceInCalendarDays(today, timelineStart);
      return days * dayWidth + dayWidth / 2;
    }
    return null;
  }, [timelineStart, timelineEnd, dayWidth]);

  // Calculate SVG Paths for dependencies connecting predecessor end to successor start
  const svgConnections = useMemo(() => {
    const paths: {
      id: string;
      d: string;
      hasConflict: boolean;
      isHighlighted: boolean;
      fromName: string;
      toName: string;
      link: DependencyLink;
    }[] = [];

    const rowHeight = 44; // height of each Gantt row

    dependencyLinks.forEach((link, idx) => {
      const fromRowIndex = ganttRows.findIndex((r) => r.id === link.fromId);
      const toRowIndex = ganttRows.findIndex((r) => r.id === link.toId);

      // If either row is hidden (e.g. inside collapsed project), skip drawing SVG line
      if (fromRowIndex === -1 || toRowIndex === -1) return;

      const fromRow = ganttRows[fromRowIndex];
      const toRow = ganttRows[toRowIndex];

      // Use active dragging dates dynamically if either task is being moved or resized
      const fromStart =
        fromRow.task && activeDrag && activeDrag.task.id === fromRow.task.id
          ? activeDrag.previewStartDate
          : fromRow.startDate;
      const fromEnd =
        fromRow.task && activeDrag && activeDrag.task.id === fromRow.task.id
          ? activeDrag.previewEndDate
          : fromRow.endDate;

      const toStart =
        toRow.task && activeDrag && activeDrag.task.id === toRow.task.id
          ? activeDrag.previewStartDate
          : toRow.startDate;
      const toEnd =
        toRow.task && activeDrag && activeDrag.task.id === toRow.task.id
          ? activeDrag.previewEndDate
          : toRow.endDate;

      const fromCoords = getBarCoords(fromStart, fromEnd);
      const toCoords = getBarCoords(toStart, toEnd);

      // Predecessor finishes at right edge:
      const startX = fromCoords.left + fromCoords.width;
      const startY = fromRowIndex * rowHeight + rowHeight / 2;

      // Successor starts at left edge:
      const endX = toCoords.left;
      const endY = toRowIndex * rowHeight + rowHeight / 2;

      const midX = startX + 16;
      let pathD = "";

      if (endX >= startX + 12) {
        // Forward stepped connection (predecessor ends before successor starts)
        pathD = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
      } else {
        // Backward loop (conflict or overlapping sequence)
        const loopY = startY < endY ? startY + 16 : startY - 16;
        pathD = `M ${startX} ${startY} H ${startX + 10} V ${loopY} H ${endX - 10} V ${endY} H ${endX}`;
      }

      const isHighlighted =
        highlightedTaskId === link.fromId ||
        highlightedTaskId === link.toId ||
        activeDrag?.task.id === link.fromId ||
        activeDrag?.task.id === link.toId;

      paths.push({
        id: `dep-${link.fromId}-${link.toId}-${idx}`,
        d: pathD,
        hasConflict: link.hasConflict,
        isHighlighted,
        fromName: fromRow.task?.name || "",
        toName: toRow.task?.name || "",
        link,
        fromId: link.fromId,
        toId: link.toId,
        fromTask: fromRow.task,
        toTask: toRow.task,
        startX,
        startY,
        endX,
        endY,
        midX: (startX + endX) / 2,
        midY: (startY + endY) / 2,
      });
    });

    return paths;
  }, [dependencyLinks, ganttRows, dayWidth, timelineStart, highlightedTaskId, activeDrag]);

  return (
    <div className="flex flex-col h-full bg-background text-foreground select-none">
      {/* Top Controls Toolbar */}
      <div className="p-2 sm:px-3 sm:py-2 border-b border-border bg-card/85 backdrop-blur-sm flex flex-wrap items-center justify-between gap-2 shadow-xs">
        {/* Left Side: Search, Filters & Hierarchy Controls */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[240px] max-w-3xl flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefa ou subtarefa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs bg-background/90"
            />
          </div>

          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="h-8 text-xs w-[130px] sm:w-[155px] bg-background/90 shrink-0 font-medium">
              <SelectValue placeholder="Projetos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Projetos</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="h-8 text-xs w-[130px] sm:w-[155px] bg-background/90 shrink-0 font-medium">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Responsáveis</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Quick Expand / Collapse Buttons */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExpandAll}
              className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              title="Expandir todos os projetos e subtarefas"
            >
              <FolderOpen className="h-3 w-3 mr-1 text-primary" />
              <span>Expandir</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCollapseAll}
              className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              title="Recolher todos os projetos"
            >
              <Folder className="h-3 w-3 mr-1 text-muted-foreground" />
              <span>Recolher</span>
            </Button>
          </div>
        </div>

        {/* Right Side: Zoom, Legends, Display Options, Conflicts, New Task */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Conflict Auto-Fixer */}
          {conflictCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5 shadow-xs animate-pulse px-2.5"
              onClick={handleAutoFixAllConflicts}
              title="Ajustar automaticamente as datas das tarefas em conflito de precedência"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>{conflictCount} Conflito(s)</span>
            </Button>
          )}

          {/* Zoom Level Selector */}
          <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setZoomLevel("days")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                zoomLevel === "days"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dias
            </button>
            <button
              onClick={() => setZoomLevel("weeks")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                zoomLevel === "weeks"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semanas
            </button>
            <button
              onClick={() => setZoomLevel("months")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                zoomLevel === "months"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Meses
            </button>
          </div>

          {/* Legendas Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 h-8 text-xs font-medium bg-background/80"
              >
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>Legenda</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3.5 bg-popover text-popover-foreground border-border shadow-md space-y-3">
              <div>
                <h4 className="font-semibold mb-2 text-xs text-foreground flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  <span>Resumo do Projeto (MS Project)</span>
                </h4>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="relative w-12 h-3.5 bg-slate-900 dark:bg-slate-100 flex items-center justify-between px-0.5 rounded-none">
                      <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-slate-900 dark:border-t-slate-100 absolute -bottom-1 left-0"></div>
                      <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-slate-900 dark:border-t-slate-100 absolute -bottom-1 right-0"></div>
                    </div>
                    <span className="text-foreground font-medium">Barra de Resumo com Chanfros (▼━━━▼)</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <h4 className="font-semibold mb-2 text-xs text-foreground flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <span>Status das Tarefas</span>
                </h4>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-primary/20 border border-primary/60"></div>
                    <span className="text-foreground font-medium">Em Andamento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/60"></div>
                    <span className="text-foreground font-medium">Concluída</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-amber-500/20 border border-amber-500/60"></div>
                    <span className="text-foreground font-medium">Pendente</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <h4 className="font-semibold mb-2 text-xs text-foreground flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-primary" />
                  <span>Conexões de Precedência</span>
                </h4>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-primary"></div>
                    <span>Sequência Correta (Término → Início)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-rose-500 border-b border-dashed border-rose-500"></div>
                    <span className="text-rose-500 font-semibold">Conflito de Data</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Configurações de Exibição Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 h-8 text-xs font-medium bg-background/90 hover:bg-muted"
                title="Configurar exibição das barras, descrição e colunas"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Exibição & Colunas</span>
                <span className="sm:hidden">Exibição</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] sm:w-[410px] p-4 bg-popover text-popover-foreground border-border shadow-xl space-y-4 max-h-[85vh] overflow-y-auto z-50">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Preferências do Gráfico</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateDisplaySettings(() => DEFAULT_GANTT_SETTINGS)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  title="Restaurar configurações padrões"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Padrão</span>
                </Button>
              </div>

              <Tabs defaultValue="bars" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="bars" className="text-xs">Barras da Linha</TabsTrigger>
                  <TabsTrigger value="list" className="text-xs">Lista Lateral (WBS)</TabsTrigger>
                </TabsList>

                {/* Aba Barras */}
                <TabsContent value="bars" className="space-y-4 pt-3 text-xs">
                  {/* Posição da Descrição */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">
                        Posição da Descrição / Nome
                      </Label>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {displaySettings.labelPosition === "inside"
                          ? "Dentro da barra"
                          : displaySettings.labelPosition === "outside"
                          ? "Fora (ao lado)"
                          : "Dentro e Fora"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() =>
                          updateDisplaySettings((prev) => ({ ...prev, labelPosition: "inside" }))
                        }
                        className={`py-1.5 px-2 rounded text-xs font-medium transition-all ${
                          displaySettings.labelPosition === "inside"
                            ? "bg-background text-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Dentro
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateDisplaySettings((prev) => ({ ...prev, labelPosition: "outside" }))
                        }
                        className={`py-1.5 px-2 rounded text-xs font-medium transition-all ${
                          displaySettings.labelPosition === "outside"
                            ? "bg-background text-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Fora
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateDisplaySettings((prev) => ({ ...prev, labelPosition: "both" }))
                        }
                        className={`py-1.5 px-2 rounded text-xs font-medium transition-all ${
                          displaySettings.labelPosition === "both"
                            ? "bg-background text-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Ambas
                      </button>
                    </div>
                  </div>

                  {/* Responsável na Barra */}
                  <div className="flex items-center justify-between py-1 border-t border-border/50">
                    <div>
                      <p className="font-medium text-foreground">Nome do Responsável</p>
                      <p className="text-[10.5px] text-muted-foreground">Exibir responsável nas barras</p>
                    </div>
                    <Switch
                      checked={displaySettings.showAssigneeOnBar}
                      onCheckedChange={(checked) =>
                        updateDisplaySettings((prev) => ({ ...prev, showAssigneeOnBar: checked }))
                      }
                    />
                  </div>

                  {/* Informações detalhadas da barra */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-muted-foreground">
                      Informações Exibidas na Barra
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Nome da Tarefa</span>
                        <Switch
                          checked={displaySettings.barDetails.name}
                          onCheckedChange={(checked) =>
                            updateDisplaySettings((prev) => ({
                              ...prev,
                              barDetails: { ...prev.barDetails, name: checked },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Progresso em %</span>
                        <Switch
                          checked={displaySettings.barDetails.progress}
                          onCheckedChange={(checked) =>
                            updateDisplaySettings((prev) => ({
                              ...prev,
                              barDetails: { ...prev.barDetails, progress: checked },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Duração em Dias (ex: 4d)</span>
                        <Switch
                          checked={displaySettings.barDetails.duration}
                          onCheckedChange={(checked) =>
                            updateDisplaySettings((prev) => ({
                              ...prev,
                              barDetails: { ...prev.barDetails, duration: checked },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total de Horas Estimadas (h)</span>
                        <Switch
                          checked={displaySettings.barDetails.hours}
                          onCheckedChange={(checked) =>
                            updateDisplaySettings((prev) => ({
                              ...prev,
                              barDetails: { ...prev.barDetails, hours: checked },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Datas de Início e Fim</span>
                        <Switch
                          checked={displaySettings.barDetails.dates}
                          onCheckedChange={(checked) =>
                            updateDisplaySettings((prev) => ({
                              ...prev,
                              barDetails: { ...prev.barDetails, dates: checked },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Aba Tabela Lateral */}
                <TabsContent value="list" className="space-y-3 pt-3 text-xs">
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="font-medium text-foreground">Exibir Responsável</p>
                      <p className="text-[10.5px] text-muted-foreground">Mostrar responsável na lista lateral</p>
                    </div>
                    <Switch
                      checked={displaySettings.showAssigneeInList}
                      onCheckedChange={(checked) =>
                        updateDisplaySettings((prev) => ({ ...prev, showAssigneeInList: checked }))
                      }
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-muted-foreground">
                      Colunas & Informações Visíveis
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Numeração WBS/EAP (#)</span>
                        <Switch
                          checked={displaySettings.listColumns.seqNumber}
                          onCheckedChange={(checked) =>
                            updateDisplaySettings((prev) => ({
                              ...prev,
                              listColumns: { ...prev.listColumns, seqNumber: checked },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Ícone de Status</span>
                        <Switch
                          checked={displaySettings.listColumns.statusIcon}
                          onCheckedChange={(checked) =>
                            updateDisplaySettings((prev) => ({
                              ...prev,
                              listColumns: { ...prev.listColumns, statusIcon: checked },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Horas Estimadas</span>
                        <Switch
                          checked={displaySettings.listColumns.hours}
                          onCheckedChange={(checked) =>
                            updateDisplaySettings((prev) => ({
                              ...prev,
                              listColumns: { ...prev.listColumns, hours: checked },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Datas (Início - Fim)</span>
                        <Switch
                          checked={displaySettings.listColumns.dates}
                          onCheckedChange={(checked) =>
                            updateDisplaySettings((prev) => ({
                              ...prev,
                              listColumns: { ...prev.listColumns, dates: checked },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Indicador de Progresso (%)</span>
                        <Switch
                          checked={displaySettings.listColumns.progress}
                          onCheckedChange={(checked) =>
                            updateDisplaySettings((prev) => ({
                              ...prev,
                              listColumns: { ...prev.listColumns, progress: checked },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Ações Rápidas (Mover, Vincular, Editar)</span>
                        <Switch
                          checked={displaySettings.listColumns.actions}
                          onCheckedChange={(checked) =>
                            updateDisplaySettings((prev) => ({
                              ...prev,
                              listColumns: { ...prev.listColumns, actions: checked },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </PopoverContent>
          </Popover>

          {/* New Task Action */}
          <Button
            onClick={() => handleOpenCreateModal()}
            size="sm"
            className="h-8 gap-1 font-medium shadow-xs text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nova Tarefa</span>
          </Button>
        </div>
      </div>

      {/* Quick Dependency Mode Announcement Banner */}
      {quickLinkPredecessor && (
        <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between text-xs font-medium border-b border-primary-foreground/20 animate-in slide-in-from-top duration-150 shadow-md z-30">
          <div className="flex items-center space-x-2">
            <Link2 className="h-4 w-4 animate-bounce text-white" />
            <span>
              <strong>Modo de Vinculação Ativo:</strong> Clique na tarefa (na lista ou na barra) que será a{" "}
              <strong>sucessora</strong> de "<em>{quickLinkPredecessor.name}</em>".
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="h-6 px-2 text-[11px] font-semibold bg-background text-foreground hover:bg-muted"
            onClick={() => setQuickLinkPredecessor(null)}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Main Gantt Split View */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Hierarchical Task List (Projects > Tasks > Subtasks) */}
        <div
          className={`flex-shrink-0 border-r border-border bg-card flex flex-col overflow-hidden transition-all duration-200 z-20 shadow-xs ${
            isSidebarCollapsed ? "w-12" : "w-80 sm:w-96 md:w-[420px]"
          }`}
        >
          {/* Column Header */}
          <div className="h-10 border-b border-border px-3 flex items-center justify-between font-semibold text-[11px] text-muted-foreground bg-muted/50 uppercase tracking-wider">
            {!isSidebarCollapsed ? (
              <>
                <div className="flex items-center space-x-2 truncate">
                  <ListTree className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate">Estrutura (WBS / EAP)</span>
                </div>
                <div className="flex items-center space-x-3 text-[10px] text-muted-foreground font-mono">
                  {displaySettings.listColumns.dates && <span>Início - Fim</span>}
                  {displaySettings.listColumns.progress && <span>Progresso</span>}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground rounded"
                    title="Recolher painel esquerdo"
                  >
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="w-full flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground rounded"
                  title="Expandir painel esquerdo"
                >
                  <PanelLeftOpen className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* List Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {ganttRows.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                {!isSidebarCollapsed && (
                  <>
                    <p>Nenhuma tarefa encontrada para os filtros selecionados.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenCreateModal()}
                      className="text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Criar Primeira Tarefa
                    </Button>
                  </>
                )}
              </div>
            ) : (
              ganttRows.map((row) => {
                const isSelected =
                  highlightedTaskId === (row.task ? row.task.id : row.projectId);

                // --- PROJECT HEADER ROW (Level 0) ---
                if (row.rowType === "project") {
                  const isCollapsed = Boolean(collapsedProjects[row.projectId]);

                  if (isSidebarCollapsed) {
                    return (
                      <div
                        key={row.id}
                        className="h-11 flex items-center justify-center bg-muted/50 border-b border-border/80 cursor-pointer font-bold text-xs text-primary"
                        onClick={() => toggleProjectCollapse(row.projectId)}
                        title={`Projeto: ${row.project?.name}`}
                      >
                        {isCollapsed ? "+" : "-"}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={row.id}
                      className={`h-11 px-2.5 flex items-center justify-between bg-muted/40 hover:bg-muted/70 transition-all cursor-pointer border-b border-border/70 group ${
                        isSelected ? "bg-primary/15 border-l-4 border-primary" : ""
                      }`}
                      onClick={() => handleScrollToItem(row.startDate, row.projectId)}
                    >
                      {/* Left: Collapse toggle [-] / [+] + Project Name & Info */}
                      <div className="flex items-center space-x-2 min-w-0 flex-1 pr-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProjectCollapse(row.projectId);
                          }}
                          className="h-5 w-5 rounded border border-border bg-background flex items-center justify-center text-xs font-mono font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors shrink-0 shadow-2xs"
                          title={isCollapsed ? "Expandir projeto" : "Recolher projeto"}
                        >
                          {isCollapsed ? "+" : "−"}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="font-bold text-foreground text-xs truncate">
                              {displaySettings.listColumns.seqNumber && `${row.seqNumber}. `}
                              {row.project?.name}
                            </span>
                            {row.specialMarker && (
                              <span
                                className="w-2 h-2 rotate-45 bg-purple-600 shrink-0"
                                title={row.specialMarker}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {displaySettings.listColumns.dates && (
                              <span>
                                {format(parseISO(row.startDate), "dd/MM")} -{" "}
                                {format(parseISO(row.endDate), "dd/MM/yy")}
                              </span>
                            )}
                            {displaySettings.listColumns.dates && displaySettings.listColumns.hours && (
                              <span>•</span>
                            )}
                            {displaySettings.listColumns.hours && (
                              <span className="font-mono font-semibold text-foreground/80">
                                {row.totalHours}h totais
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Progress & Action */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {displaySettings.listColumns.progress && (
                          <div className="flex items-center space-x-1 text-right">
                            <div className="w-12 bg-muted rounded-full h-1.5 overflow-hidden border border-border/60">
                              <div
                                className="bg-slate-800 dark:bg-slate-200 h-full rounded-full transition-all"
                                style={{ width: `${row.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold w-7 text-right">
                              {row.progress}%
                            </span>
                          </div>
                        )}

                        {/* Add task to project */}
                        {displaySettings.listColumns.actions && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Adicionar Tarefa a este Projeto"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCreateModal({ projectId: row.projectId });
                            }}
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                }

                // --- TASK & SUBTASK ROWS (Level 1 & Level 2) ---
                const task = row.task!;
                const isSubtask = row.rowType === "subtask";
                const isParentTask = row.hasChildren;
                const isParentCollapsed = Boolean(collapsedParentTasks[task.id]);
                const isCompleted = task.status === "completed";
                const isInProgress = task.status === "in_progress";
                const taskDeps = task.dependencies || [];
                const isQuickLinkSource = quickLinkPredecessor?.id === task.id;

                if (isSidebarCollapsed) {
                  return (
                    <div
                      key={task.id}
                      className={`h-11 flex items-center justify-center cursor-pointer hover:bg-muted/40 transition-all ${
                        isSelected ? "bg-primary/20 text-primary border-l-2 border-primary" : ""
                      }`}
                      onClick={() => handleScrollToItem(task.start_date, task.id)}
                      title={`${row.seqNumber} - ${task.name}`}
                    >
                      <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                        {row.seqNumber}
                      </span>
                    </div>
                  );
                }

                const isDraggingThis = draggedTaskId === task.id;
                const isDragOverThis = dragOverTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragOver={(e) => handleDragOver(e, task.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={`h-11 px-2 flex items-center justify-between hover:bg-muted/30 transition-all cursor-pointer text-xs group select-none ${
                      isQuickLinkSource ? "bg-primary/20 border-l-4 border-primary ring-1 ring-primary" : ""
                    } ${isSelected && !isQuickLinkSource ? "bg-primary/10 border-l-4 border-primary" : ""} ${
                      isSubtask ? "bg-muted/10 pl-5" : ""
                    } ${
                      isDraggingThis ? "opacity-40 border border-dashed border-primary" : ""
                    } ${isDragOverThis ? "border-t-2 border-primary bg-primary/10" : ""}`}
                    onClick={() => {
                      if (quickLinkPredecessor && quickLinkPredecessor.id !== task.id) {
                        handleCompleteQuickLink(quickLinkPredecessor, task);
                      } else {
                        handleScrollToItem(task.start_date, task.id);
                      }
                    }}
                  >
                    {/* Left: Drag Handle, Branch Indicator, Number, Status Icon, Name & Assignee */}
                    <div className="flex items-center space-x-1.5 min-w-0 flex-1 pr-1">
                      {/* Drag Handle */}
                      <div
                        className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/30 hover:text-foreground group-hover:text-muted-foreground/70 transition-colors shrink-0"
                        title="Arrastar para reordenar"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </div>

                      {/* Subtask Branch indicator or Parent Task collapse */}
                      {isSubtask ? (
                        <div className="text-muted-foreground/50 shrink-0 font-mono text-xs flex items-center mr-0.5">
                          <CornerDownRight className="h-3 w-3 text-primary/60" />
                        </div>
                      ) : isParentTask ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleParentTaskCollapse(task.id);
                          }}
                          className="h-4 w-4 rounded border border-border bg-background flex items-center justify-center text-[10px] font-mono font-bold text-foreground hover:bg-muted transition-colors shrink-0 shadow-2xs mr-0.5"
                          title={isParentCollapsed ? "Expandir subtarefas" : "Recolher subtarefas"}
                        >
                          {isParentCollapsed ? "+" : "−"}
                        </button>
                      ) : (
                        <div className="w-2 shrink-0" />
                      )}

                      {/* Numbering */}
                      {displaySettings.listColumns.seqNumber && (
                        <span className="text-[10px] font-mono font-semibold text-muted-foreground shrink-0 w-6">
                          {row.seqNumber}
                        </span>
                      )}

                      {/* Status Icon */}
                      {displaySettings.listColumns.statusIcon && (
                        <div className="shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : isInProgress ? (
                            <Clock className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <div className="h-3 w-3 rounded-full border border-amber-500/80 bg-amber-500/20" />
                          )}
                        </div>
                      )}

                      {/* Task Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1 truncate">
                          <span
                            className={`truncate font-medium ${
                              isSubtask
                                ? "text-[11px] text-foreground/90"
                                : "text-xs font-semibold text-foreground"
                            } ${isCompleted ? "line-through opacity-75" : ""}`}
                          >
                            {task.name}
                          </span>
                          {task.special_marker && task.special_marker !== "none" && (
                            <span
                              className="w-2 h-2 rotate-45 bg-purple-500 shrink-0"
                              title={task.special_marker}
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                          {displaySettings.showAssigneeInList && displaySettings.listColumns.assignee && (
                            <span className="truncate">{row.employee?.name || "Não atribuído"}</span>
                          )}
                          {displaySettings.showAssigneeInList &&
                            displaySettings.listColumns.assignee &&
                            (displaySettings.listColumns.hours || displaySettings.listColumns.dates) && (
                              <span>•</span>
                            )}
                          {displaySettings.listColumns.hours && (
                            <span>{row.totalHours}h</span>
                          )}
                          {displaySettings.listColumns.hours && displaySettings.listColumns.dates && (
                            <span>•</span>
                          )}
                          {displaySettings.listColumns.dates && (
                            <span>
                              {format(parseISO(task.start_date), "dd/MM")} a{" "}
                              {format(parseISO(task.end_date), "dd/MM")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Move Up/Down, Progress & Action Buttons */}
                    <div className="flex items-center space-x-1 shrink-0">
                      {/* Move Up and Down Quick Buttons */}
                      {displaySettings.listColumns.actions && (
                        <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded"
                            title="Mover para cima"
                            onClick={(e) => handleMoveTaskUp(e, task.id)}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded"
                            title="Mover para baixo"
                            onClick={(e) => handleMoveTaskDown(e, task.id)}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {/* Progress Badge */}
                      {displaySettings.listColumns.progress && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                            isCompleted
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : isInProgress
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {row.progress}%
                        </span>
                      )}

                      {/* Add Subtask Button (only for main tasks) */}
                      {displaySettings.listColumns.actions && !isSubtask && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground/60 hover:text-primary hover:bg-primary/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Adicionar Subtarefa a esta tarefa"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCreateModal({
                              projectId: task.project_id || undefined,
                              parentId: task.id,
                            });
                          }}
                        >
                          <PlusCircle className="h-3 w-3" />
                        </Button>
                      )}

                      {/* Dependency Badge / Link button */}
                      {displaySettings.listColumns.actions && (
                        taskDeps.length > 0 ? (
                          <div
                            className="flex items-center gap-0.5 bg-primary/10 text-primary border border-primary/20 px-1 py-0.5 rounded text-[9px] font-semibold cursor-pointer hover:bg-primary/20"
                            title={`Depende de ${taskDeps.length} tarefa(s). Clique para gerenciar`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveLinkingTask(task);
                              setIsDependencyModalOpen(true);
                            }}
                          >
                            <Link2 className="h-2.5 w-2.5" />
                            <span>{taskDeps.length}</span>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-5 w-5 rounded transition-opacity ${
                              isQuickLinkSource
                                ? "text-primary bg-primary/20 opacity-100"
                                : "text-muted-foreground/40 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100"
                            }`}
                            title={
                              isQuickLinkSource
                                ? "Cancelar modo de vinculação"
                                : "Iniciar modo de vinculação de dependência"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isQuickLinkSource) {
                                setQuickLinkPredecessor(null);
                              } else {
                                setQuickLinkPredecessor(task);
                              }
                            }}
                          >
                            <Link2 className="h-2.5 w-2.5" />
                          </Button>
                        )
                      )}

                      {/* Edit button */}
                      {displaySettings.listColumns.actions && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-foreground rounded"
                          title="Editar Tarefa"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(task);
                          }}
                        >
                          <Edit2 className="h-2.5 w-2.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Interactive Timeline Canvas (Summary Bars, Task Bars & Dependency Arrows) */}
        <div
          ref={timelineScrollRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-background/50"
        >
          <div
            style={{ width: `${totalDays * dayWidth}px`, minHeight: "100%" }}
            className="relative flex flex-col"
          >
            {/* Timeline Header Rows (Weeks / Days) */}
            <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border shadow-xs">
              {/* Weeks Bar */}
              <div className="h-5 border-b border-border flex text-[10px] font-semibold text-muted-foreground">
                {headerWeeks.map((weekStart, wIdx) => {
                  const weekDaysCount = 7;
                  return (
                    <div
                      key={wIdx}
                      style={{ width: `${weekDaysCount * dayWidth}px` }}
                      className="border-r border-border/60 px-1.5 flex items-center truncate bg-muted/20"
                    >
                      {format(weekStart, "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </div>
                  );
                })}
              </div>

              {/* Days Bar */}
              <div className="h-5 flex text-[9px] text-muted-foreground font-medium">
                {headerDays.map((day, dIdx) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isCurrentDay =
                    format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

                  return (
                    <div
                      key={dIdx}
                      style={{ width: `${dayWidth}px` }}
                      className={`flex flex-col items-center justify-center border-r border-border/40 transition-colors ${
                        isCurrentDay
                          ? "bg-primary/20 text-primary font-bold"
                          : isWeekend
                            ? "bg-muted/40 text-muted-foreground/60"
                            : ""
                      }`}
                      title={format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    >
                      <span>{format(day, "dd")}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid Background Columns */}
            <div className="absolute inset-0 top-10 pointer-events-none flex">
              {headerDays.map((day, dIdx) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={dIdx}
                    style={{ width: `${dayWidth}px` }}
                    className={`h-full border-r border-border/30 flex-shrink-0 ${
                      isWeekend ? "bg-muted/15" : ""
                    }`}
                  />
                );
              })}
            </div>

            {/* Today Line Indicator */}
            {todayOffset !== null && (
              <div
                style={{ left: `${todayOffset}px` }}
                className="absolute top-0 bottom-0 w-0.5 bg-primary/80 z-20 pointer-events-none shadow-xs"
              >
                <div className="sticky top-10 -ml-2 px-1 py-0.5 rounded bg-primary text-primary-foreground text-[8px] font-bold shadow">
                  Hoje
                </div>
              </div>
            )}

            {/* SVG Dependency Lines & Arrows Canvas */}
            <svg
              className="absolute inset-0 top-10 w-full h-full pointer-events-none z-10"
              style={{ minHeight: `${ganttRows.length * 44}px` }}
            >
              <defs>
                <marker
                  id="arrow-normal"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" className="fill-primary" />
                </marker>
                <marker
                  id="arrow-conflict"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" className="fill-rose-500" />
                </marker>
                <marker
                  id="arrow-highlight"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" className="fill-primary" />
                </marker>
              </defs>

              {svgConnections.map((conn) => {
                const isHovered = hoveredArrowId === conn.id;
                const isBeingDragged =
                  activeDrag &&
                  (activeDrag.type === "reconnect-dep-target" ||
                    activeDrag.type === "reconnect-dep-source") &&
                  activeDrag.arrowConnection?.fromId === conn.fromId &&
                  activeDrag.arrowConnection?.toId === conn.toId;

                return (
                  <g
                    key={conn.id}
                    className={`transition-all duration-150 ${isBeingDragged ? "opacity-20" : ""}`}
                    onMouseEnter={() => setHoveredArrowId(conn.id)}
                    onMouseLeave={() => setHoveredArrowId(null)}
                  >
                    {/* Generous Hit Area along the dependency line for effortless hovering */}
                    <path
                      d={conn.d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="22"
                      className="pointer-events-auto cursor-pointer"
                    />

                    {/* Outer Glow when Highlighted or Hovered */}
                    {(conn.isHighlighted || isHovered) && (
                      <path
                        d={conn.d}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-primary/35 pointer-events-none transition-all"
                      />
                    )}

                    {/* Main Visible Dependency Line */}
                    <path
                      d={conn.d}
                      fill="none"
                      strokeWidth={isHovered ? "3.2" : conn.isHighlighted ? "2.5" : "1.8"}
                      strokeDasharray={conn.hasConflict ? "4 3" : undefined}
                      markerEnd={
                        conn.hasConflict
                          ? "url(#arrow-conflict)"
                          : conn.isHighlighted || isHovered
                            ? "url(#arrow-highlight)"
                            : "url(#arrow-normal)"
                      }
                      className={`pointer-events-none transition-all duration-150 ${
                        conn.hasConflict
                          ? "stroke-rose-500 animate-pulse"
                          : conn.isHighlighted || isHovered
                            ? "stroke-blue-600 dark:stroke-blue-400"
                            : "stroke-primary/70 dark:stroke-primary/80"
                      }`}
                    />

                    {/* Drag Handle at origin (startX, startY) */}
                    {isHovered && (
                      <g
                        className="pointer-events-auto cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => handleStartArrowDrag(e, conn, "source")}
                      >
                        <circle
                          cx={conn.startX}
                          cy={conn.startY}
                          r={5}
                          className="fill-blue-600 stroke-background stroke-1.5 hover:scale-125 transition-transform"
                        />
                        <title>Arraste para reconectar origem</title>
                      </g>
                    )}

                    {/* Disconnect Button (x) on the line when hovered - no collision with task bar endpoint */}
                    {isHovered && (
                      <g
                        className="pointer-events-auto cursor-pointer group/unlinkBtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlinkDependency(conn.fromId, conn.toId);
                        }}
                      >
                        <circle
                          cx={conn.midX}
                          cy={conn.midY}
                          r="10"
                          className="fill-card stroke-rose-500 stroke-1.5 hover:scale-115 hover:fill-rose-50 dark:hover:fill-rose-950 transition-all shadow-md"
                        />
                        <text
                          x={conn.midX}
                          y={conn.midY + 3.5}
                          textAnchor="middle"
                          className="text-[11px] font-extrabold fill-rose-600 pointer-events-none select-none"
                        >
                          ✕
                        </text>
                        <title>
                          {`ao passar o mouse sobre a linha destaca e exibe um (x) para desconectar as dependência.\nClique para desconectar "${conn.fromName}" ➔ "${conn.toName}"`}
                        </title>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Dynamic Elastic Dependency Wire while dragging connection anchor or adjusting arrow */}
              {activeDrag &&
                (activeDrag.type === "connect-dep" ||
                  activeDrag.type === "reconnect-dep-target" ||
                  activeDrag.type === "reconnect-dep-source") &&
                activeDrag.sourceCoords &&
                activeDrag.currentPointerCoords && (
                  <g className="pointer-events-none">
                    {activeDrag.type === "reconnect-dep-source" ? (
                      /* Source reconnect: wire starts from moving pointer (candidate predecessor) and ends at successor */
                      <>
                        <path
                          d={`M ${activeDrag.currentPointerCoords.x} ${
                            activeDrag.currentPointerCoords.y
                          } C ${activeDrag.currentPointerCoords.x + 40} ${
                            activeDrag.currentPointerCoords.y
                          }, ${activeDrag.sourceCoords.x - 40} ${activeDrag.sourceCoords.y}, ${
                            activeDrag.sourceCoords.x
                          } ${activeDrag.sourceCoords.y}`}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          strokeDasharray="6 3"
                          markerEnd="url(#arrow-highlight)"
                          className="animate-pulse"
                        />
                        <circle
                          cx={activeDrag.currentPointerCoords.x}
                          cy={activeDrag.currentPointerCoords.y}
                          r="6"
                          fill="#3b82f6"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={activeDrag.sourceCoords.x}
                          cy={activeDrag.sourceCoords.y}
                          r="5.5"
                          fill="#1d4ed8"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      </>
                    ) : (
                      /* Target reconnect or connect-dep: wire starts from predecessor and ends at moving pointer */
                      <>
                        <path
                          d={`M ${activeDrag.sourceCoords.x} ${activeDrag.sourceCoords.y} C ${
                            activeDrag.sourceCoords.x + 40
                          } ${activeDrag.sourceCoords.y}, ${activeDrag.currentPointerCoords.x - 40} ${
                            activeDrag.currentPointerCoords.y
                          }, ${activeDrag.currentPointerCoords.x} ${
                            activeDrag.currentPointerCoords.y
                          }`}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          strokeDasharray="6 3"
                          markerEnd="url(#arrow-highlight)"
                          className="animate-pulse"
                        />
                        <circle
                          cx={activeDrag.sourceCoords.x}
                          cy={activeDrag.sourceCoords.y}
                          r="5"
                          fill="#1d4ed8"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={activeDrag.currentPointerCoords.x}
                          cy={activeDrag.currentPointerCoords.y}
                          r="6.5"
                          fill="#2563eb"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      </>
                    )}
                  </g>
                )}
            </svg>

            {/* Timeline Rows: Project Summary Bars & Task Bars */}
            <div className="relative z-10 divide-y divide-border/40">
              {ganttRows.map((row) => {
                const isSelected =
                  highlightedTaskId === (row.task ? row.task.id : row.projectId);

                // --- 1. PROJECT SUMMARY BAR (▼━━━━━▼ / v-----v) ---
                if (row.rowType === "project") {
                  const coords = getBarCoords(row.startDate, row.endDate);
                  return (
                    <div
                      key={row.id}
                      className="h-11 relative flex items-center group bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      {/* MS Project Style Summary Bar with downward beveled ends ▼━━━━━▼ */}
                      <div
                        style={{
                          left: `${coords.left}px`,
                          width: `${coords.width}px`,
                        }}
                        className={`absolute h-4 flex items-center justify-center cursor-pointer transition-all duration-150 ${
                          isSelected ? "scale-[1.01] z-30" : "z-20"
                        }`}
                        onClick={() => handleScrollToItem(row.startDate, row.projectId)}
                        title={`Projeto: ${row.project?.name} (${coords.durationDays}d, ${row.progress}% concluído, ${row.totalHours}h)`}
                      >
                        {/* Main Horizontal Top Bar */}
                        <div className="absolute top-0 inset-x-0 h-2 bg-slate-900 dark:bg-slate-200 rounded-2xs shadow-xs overflow-hidden">
                          {/* Inner Progress filling */}
                          <div
                            className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all opacity-85"
                            style={{ width: `${row.progress}%` }}
                          />
                        </div>

                        {/* Left Downward Bevel Arrow/Triangle ▼ */}
                        <div className="absolute -bottom-1.5 left-0 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[7px] border-t-slate-900 dark:border-t-slate-200 drop-shadow-2xs" />

                        {/* Right Downward Bevel Arrow/Triangle ▼ */}
                        <div className="absolute -bottom-1.5 right-0 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[7px] border-t-slate-900 dark:border-t-slate-200 drop-shadow-2xs" />
                      </div>

                      {/* Project Title Positioned Directly Beside the Summary Bar */}
                      <div
                        style={{
                          left: `${coords.left + coords.width + 10}px`,
                        }}
                        className="absolute text-xs font-bold text-foreground flex items-center space-x-1.5 whitespace-nowrap z-20 pointer-events-none drop-shadow-2xs"
                      >
                        <span className="font-semibold">{row.project?.name}</span>
                        <span className="text-[10.5px] font-mono text-muted-foreground font-medium">
                          ({row.progress}% • {row.totalHours}h)
                        </span>
                      </div>
                    </div>
                  );
                }

                // --- 2. TASK & SUBTASK BARS ---
                const task = row.task!;
                const isSubtask = row.rowType === "subtask";
                const isCompleted = task.status === "completed";
                const isInProgress = task.status === "in_progress";
                const hasConflict = dependencyLinks.some(
                  (l) => l.toId === task.id && l.hasConflict
                );

                const isBeingDragged = activeDrag?.task.id === task.id;
                const displayStart = isBeingDragged ? activeDrag.previewStartDate : task.start_date;
                const displayEnd = isBeingDragged ? activeDrag.previewEndDate : task.end_date;
                const coords = getBarCoords(displayStart, displayEnd);

                const isHoveredTarget =
                  (activeDrag?.type === "connect-dep" ||
                    activeDrag?.type === "reconnect-dep-target" ||
                    activeDrag?.type === "reconnect-dep-source") &&
                  activeDrag.hoveredTargetTaskId === task.id;
                const isQuickLinkTarget =
                  quickLinkPredecessor && quickLinkPredecessor.id !== task.id;

                return (
                  <div key={task.id} className="h-11 relative flex items-center group">
                    {/* The Task / Subtask Bar with Drag & Drop */}
                    <div
                      style={{
                        left: `${coords.left}px`,
                        width: `${coords.width}px`,
                      }}
                      onPointerDown={(e) => handleStartDrag(e, task, "move")}
                      onDoubleClick={() => handleOpenEditModal(task)}
                      onClick={() => {
                        if (quickLinkPredecessor && quickLinkPredecessor.id !== task.id) {
                          handleCompleteQuickLink(quickLinkPredecessor, task);
                        } else {
                          handleScrollToItem(task.start_date, task.id);
                        }
                      }}
                      className={`absolute ${
                        isSubtask ? "h-6 rounded-sm" : "h-7 rounded-md"
                      } shadow-xs border px-1.5 flex items-center justify-between text-xs font-medium cursor-grab active:cursor-grabbing transition-all select-none group-hover:shadow-md ${
                        isBeingDragged
                          ? "ring-2 ring-primary ring-offset-1 shadow-lg z-50 opacity-95 scale-[1.01]"
                          : isHoveredTarget
                            ? "ring-4 ring-emerald-500 ring-offset-2 scale-[1.03] z-40 bg-emerald-500/25 border-emerald-500 text-emerald-950 dark:text-emerald-100"
                            : isQuickLinkTarget
                              ? "ring-2 ring-primary/60 cursor-pointer animate-pulse z-30"
                              : isSelected
                                ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.01] z-30"
                                : "z-20"
                      } ${
                        hasConflict
                          ? "bg-rose-500/20 border-rose-500/80 text-rose-800 dark:text-rose-200 ring-1 ring-rose-500"
                          : isCompleted
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-800 dark:text-emerald-300"
                            : isInProgress
                              ? "bg-primary/20 border-primary/60 text-primary"
                              : "bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-300"
                      }`}
                      title={`${task.name} (${coords.durationDays}d, ${row.progress}%) | Arraste para mover, use as alças laterais para alterar datas ou duplo clique para editar`}
                    >
                      {/* Left Resize Handle (Adjust Start Date) */}
                      <div
                        onPointerDown={(e) => handleStartDrag(e, task, "resize-start")}
                        className="absolute left-0 inset-y-0 w-2.5 hover:w-3.5 bg-primary/20 hover:bg-primary/70 cursor-ew-resize rounded-l-md z-30 transition-all flex items-center justify-center group/leftHandle touch-none"
                        title="Arraste para alterar o início da tarefa"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-0.5 h-3 bg-foreground/40 rounded-full group-hover/leftHandle:bg-white" />
                      </div>

                      {/* Interactive Dependency Anchor Dot (Left: Drag to connect to predecessor) */}
                      <div
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.stopPropagation();
                          const rowIdx = ganttRows.findIndex((r) => r.id === task.id);
                          const rowY = rowIdx !== -1 ? rowIdx * 44 + 22 : 0;
                          setActiveDrag({
                            type: "reconnect-dep-source",
                            task,
                            startClientX: e.clientX,
                            startClientY: e.clientY,
                            initialStartDate: task.start_date,
                            initialEndDate: task.end_date,
                            currentDeltaDays: 0,
                            previewStartDate: task.start_date,
                            previewEndDate: task.end_date,
                            sourceCoords: { x: coords.left, y: rowY },
                            currentPointerCoords: { x: coords.left, y: rowY },
                            hoveredTargetTaskId: null,
                            arrowConnection: {
                              fromId: "",
                              toId: task.id,
                              fromName: "",
                              toName: task.name,
                            },
                          });
                        }}
                        className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-md hover:scale-125 cursor-crosshair z-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all touch-none"
                        title="Clique e arraste até uma tarefa para defini-la como predecessora"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground pointer-events-none" />
                      </div>

                      {/* Drop Target Indicator Badge */}
                      {isHoveredTarget && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold shadow-md whitespace-nowrap z-50 pointer-events-none animate-bounce">
                          Soltar para conectar dependência
                        </div>
                      )}

                      {/* Right Resize Handle (Adjust End Date) */}
                      <div
                        onPointerDown={(e) => handleStartDrag(e, task, "resize-end")}
                        className="absolute right-0 inset-y-0 w-2.5 hover:w-3.5 bg-primary/20 hover:bg-primary/70 cursor-ew-resize rounded-r-md z-30 transition-all flex items-center justify-center group/rightHandle touch-none"
                        title="Arraste para alterar o término da tarefa"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-0.5 h-3 bg-foreground/40 rounded-full group-hover/rightHandle:bg-white" />
                      </div>

                      {/* Interactive Dependency Anchor Dot (Right: Drag to successor) */}
                      <div
                        onPointerDown={(e) => handleStartDrag(e, task, "connect-dep")}
                        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-md hover:scale-125 cursor-crosshair z-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all touch-none"
                        title="Clique e arraste até outra tarefa para criar uma dependência (esta tarefa como predecessora)"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground pointer-events-none" />
                      </div>

                      {/* Floating Tooltip during Drag/Resize */}
                      {isBeingDragged && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded-md shadow-xl whitespace-nowrap z-50 pointer-events-none flex items-center space-x-1.5 font-mono border border-slate-700 animate-in fade-in duration-100">
                          <span className="font-semibold text-primary-200">
                            {format(parseISO(activeDrag.previewStartDate), "dd/MM")} ➔{" "}
                            {format(parseISO(activeDrag.previewEndDate), "dd/MM/yyyy")}
                          </span>
                          <span className="text-slate-300">
                            ({coords.durationDays}d
                            {activeDrag.currentDeltaDays !== 0 &&
                              ` • ${
                                activeDrag.currentDeltaDays > 0
                                  ? `+${activeDrag.currentDeltaDays}`
                                  : activeDrag.currentDeltaDays
                              }d`}
                            )
                          </span>
                        </div>
                      )}

                      {/* Hover Indicator during Dependency Drag */}
                      {isHoveredTarget && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none font-semibold flex items-center gap-1">
                          <Link2 className="h-3 w-3" />
                          <span>Solte para vincular dependência</span>
                        </div>
                      )}

                      {/* Inner smooth progress fill */}
                      <div
                        className={`absolute inset-y-0 left-0 transition-all pointer-events-none opacity-25 ${
                          isCompleted
                            ? "bg-emerald-600"
                            : isInProgress
                              ? "bg-primary"
                              : "bg-amber-600"
                        }`}
                        style={{ width: `${row.progress}%` }}
                      />

                      {/* Content inside bar */}
                      <div className="relative z-10 flex items-center space-x-1 truncate px-1">
                        {isCompleted ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                        ) : hasConflict ? (
                          <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0 animate-bounce" />
                        ) : task.special_marker && task.special_marker !== "none" ? (
                          <span className="w-1.5 h-1.5 rotate-45 bg-purple-600 shrink-0" />
                        ) : (
                          <Clock className="h-2.5 w-2.5 text-primary/70 shrink-0" />
                        )}

                        {/* Text inside bar (if labelPosition is 'inside' or 'both') */}
                        {(displaySettings.labelPosition === "inside" ||
                          displaySettings.labelPosition === "both") && (
                          <div className="flex items-center space-x-1 truncate text-[10.5px]">
                            {displaySettings.barDetails.name && (
                              <span className="truncate font-semibold leading-tight">
                                {task.name}
                              </span>
                            )}
                            {displaySettings.showAssigneeOnBar && row.employee && (
                              <span className="opacity-80 text-[9.5px] truncate">
                                • {row.employee.name}
                              </span>
                            )}
                            {displaySettings.barDetails.hours && (
                              <span className="opacity-80 text-[9px] font-mono">
                                ({row.totalHours}h)
                              </span>
                            )}
                            {displaySettings.barDetails.dates && (
                              <span className="opacity-75 text-[9px] font-mono">
                                [{format(parseISO(displayStart), "dd/MM")}-
                                {format(parseISO(displayEnd), "dd/MM")}]
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right badges inside bar: progress and/or duration */}
                      <div className="relative z-10 flex items-center space-x-1 shrink-0 ml-1 font-mono text-[9px]">
                        {displaySettings.barDetails.progress && (
                          <span className="opacity-85 font-semibold">{row.progress}%</span>
                        )}
                        {displaySettings.barDetails.duration && (
                          <span className="opacity-80 bg-background/50 px-1 py-0.5 rounded text-[8.5px] font-semibold">
                            {coords.durationDays}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Task Label positioned beside the Task Bar (if labelPosition is 'outside' or 'both') */}
                    {(displaySettings.labelPosition === "outside" ||
                      displaySettings.labelPosition === "both") && (
                      <div
                        style={{
                          left: `${coords.left + coords.width + 10}px`,
                        }}
                        className="absolute text-xs text-foreground flex items-center space-x-1.5 whitespace-nowrap z-20 pointer-events-none drop-shadow-2xs"
                      >
                        {/* If 'outside', show full task name with prominence */}
                        {displaySettings.labelPosition === "outside" &&
                          displaySettings.barDetails.name && (
                            <span
                              className={`font-semibold ${
                                isSubtask
                                  ? "text-[11px] text-foreground/90"
                                  : "text-xs font-bold"
                              }`}
                            >
                              {task.name}
                            </span>
                          )}

                        {/* If 'both', show secondary label */}
                        {displaySettings.labelPosition === "both" &&
                          !displaySettings.barDetails.name && (
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {task.name}
                            </span>
                          )}

                        {displaySettings.showAssigneeOnBar && row.employee && (
                          <span className="text-[10.5px] text-muted-foreground font-medium">
                            • {row.employee.name}
                          </span>
                        )}

                        {displaySettings.barDetails.hours && (
                          <span className="text-[10px] text-muted-foreground/80 font-mono">
                            • {row.totalHours}h
                          </span>
                        )}

                        {displaySettings.barDetails.dates && (
                          <span className="text-[10px] text-muted-foreground/80 font-mono">
                            • {format(parseISO(displayStart), "dd/MM")} a{" "}
                            {format(parseISO(displayEnd), "dd/MM")}
                          </span>
                        )}

                        {displaySettings.labelPosition === "outside" &&
                          displaySettings.barDetails.progress && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              ({row.progress}%)
                            </span>
                          )}
                      </div>
                    )}

                    {/* Predecessor Conflict Quick Fix Badge Button on Row */}
                    {hasConflict && (
                      <button
                        style={{ left: `${coords.left + coords.width + 120}px` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const conflictLink = dependencyLinks.find(
                            (l) => l.toId === task.id && l.hasConflict
                          );
                          if (conflictLink) handleAutoFixConflict(conflictLink);
                        }}
                        className="absolute z-30 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold shadow-xs hover:bg-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Clique para corrigir data de início para após o término da predecessora"
                      >
                        <Wand2 className="h-2.5 w-2.5" />
                        <span>Ajustar Conflito</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Interactive Guide Pill when dragging dependencies or adjusting arrows */}
      {activeDrag &&
        (activeDrag.type === "connect-dep" ||
          activeDrag.type === "reconnect-dep-target" ||
          activeDrag.type === "reconnect-dep-source") && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white border border-primary/50 shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-3 text-xs font-medium backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping shrink-0" />
            {activeDrag.type === "reconnect-dep-target" && (
              <div className="flex items-center gap-2">
                <span>
                  Ajustando destino: <strong>{activeDrag.arrowConnection?.fromName || activeDrag.task.name}</strong> ➔{" "}
                </span>
                {activeDrag.hoveredTargetTaskId ? (
                  <span className="text-emerald-400 font-bold underline bg-emerald-500/20 px-2 py-0.5 rounded">
                    Soltar em "{tasks.find((t) => t.id === activeDrag.hoveredTargetTaskId)?.name}"
                  </span>
                ) : (
                  <span className="text-slate-300">
                    Solte sobre uma tarefa para reconectar (ou fora para desconectar)
                  </span>
                )}
              </div>
            )}
            {activeDrag.type === "reconnect-dep-source" && (
              <div className="flex items-center gap-2">
                <span>
                  Ajustando predecessora de:{" "}
                  <strong>{activeDrag.arrowConnection?.toName || activeDrag.task.name}</strong> ➔{" "}
                </span>
                {activeDrag.hoveredTargetTaskId ? (
                  <span className="text-emerald-400 font-bold underline bg-emerald-500/20 px-2 py-0.5 rounded">
                    Nova predecessora: "{tasks.find((t) => t.id === activeDrag.hoveredTargetTaskId)?.name}"
                  </span>
                ) : (
                  <span className="text-slate-300">
                    Solte sobre uma tarefa para definir como predecessora (ou fora para desconectar)
                  </span>
                )}
              </div>
            )}
            {activeDrag.type === "connect-dep" && (
              <div className="flex items-center gap-2">
                <span>
                  Criando dependência de: <strong>{activeDrag.task.name}</strong> ➔{" "}
                </span>
                {activeDrag.hoveredTargetTaskId ? (
                  <span className="text-emerald-400 font-bold underline bg-emerald-500/20 px-2 py-0.5 rounded">
                    Conectar a "{tasks.find((t) => t.id === activeDrag.hoveredTargetTaskId)?.name}"
                  </span>
                ) : (
                  <span className="text-slate-300">Solte sobre a tarefa sucessora</span>
                )}
              </div>
            )}
          </div>
        )}

      {/* Task Create/Edit Modal with Subtask Support & Progress % */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="max-w-xl w-[calc(100%-2rem)] bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              <span>{editingTask ? "Editar Tarefa / Subtarefa" : "Nova Tarefa / Subtarefa"}</span>
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes hierárquicos, datas, responsável e conexões de precedência.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-2">
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="task-name" className="text-xs font-semibold">
                  Nome da Tarefa *
                </Label>
                <Input
                  id="task-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Desenvolvimento do Módulo de Autenticação"
                  className="text-xs bg-background"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Project Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Projeto</Label>
                  <Select value={formProjectId} onValueChange={setFormProjectId}>
                    <SelectTrigger className="text-xs bg-background">
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem Projeto (Avulsa)</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Parent Task Selection (for Subtasks) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Tarefa Mãe (Subtarefa)</span>
                    {formParentId !== "none" && (
                      <span className="text-[10px] text-primary font-medium">Subtarefa ativa</span>
                    )}
                  </Label>
                  <Select value={formParentId} onValueChange={setFormParentId}>
                    <SelectTrigger className="text-xs bg-background">
                      <SelectValue placeholder="Nenhuma (Tarefa Principal)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma (Tarefa Principal)</SelectItem>
                      {tasks
                        .filter((t) => !editingTask || t.id !== editingTask.id)
                        .filter((t) => !t.parent_id)
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Responsible Employee */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Responsável</Label>
                  <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                    <SelectTrigger className="text-xs bg-background">
                      <SelectValue placeholder="Selecione um colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não atribuído</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} ({e.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Estimated Hours */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Horas Estimadas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formEstimatedHours}
                    onChange={(e) => setFormEstimatedHours(Number(e.target.value) || 0)}
                    className="text-xs bg-background"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Data de Início *</Label>
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="text-xs bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Data de Término *</Label>
                  <Input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="text-xs bg-background"
                  />
                </div>
              </div>

              {/* Progress Slider & Status */}
              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5 text-primary" />
                    <span>Progresso de Conclusão</span>
                  </Label>
                  <span className="text-xs font-mono font-bold text-primary">{formProgress}%</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formProgress}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFormProgress(val);
                    if (val === 100) setFormStatus("completed");
                    else if (val > 0) setFormStatus("in_progress");
                    else setFormStatus("pending");
                  }}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setFormProgress(0);
                      setFormStatus("pending");
                    }}
                    className="hover:text-foreground hover:underline"
                  >
                    0% (Pendente)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormProgress(50);
                      setFormStatus("in_progress");
                    }}
                    className="hover:text-foreground hover:underline"
                  >
                    50% (Em Andamento)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormProgress(100);
                      setFormStatus("completed");
                    }}
                    className="hover:text-foreground hover:underline"
                  >
                    100% (Concluída)
                  </button>
                </div>
              </div>

              {/* Predecessors (Dependencies) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Tarefas Predecessoras (Dependências)</span>
                  <span className="text-[10px] text-muted-foreground">
                    O término destas tarefas antecede o início desta
                  </span>
                </Label>
                <div className="max-h-36 overflow-y-auto border border-border rounded-lg p-2 space-y-1 bg-background/50">
                  {tasks
                    .filter((t) => !editingTask || t.id !== editingTask.id)
                    .map((t) => {
                      const isChecked = formDependencies.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className={`flex items-center space-x-2 p-1.5 rounded hover:bg-muted/60 cursor-pointer text-xs transition-colors ${
                            isChecked ? "bg-primary/10 text-primary font-medium" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormDependencies([...formDependencies, t.id]);
                              } else {
                                setFormDependencies(formDependencies.filter((id) => id !== t.id));
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span className="truncate flex-1">{t.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {format(parseISO(t.end_date), "dd/MM")}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Special Marker */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Marcador Especial / Marco</Label>
                <Select value={formSpecialMarker} onValueChange={setFormSpecialMarker}>
                  <SelectTrigger className="text-xs bg-background">
                    <SelectValue placeholder="Nenhum marcador especial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum marcador</SelectItem>
                    <SelectItem value="major_release">Marco Principal (Major Release)</SelectItem>
                    <SelectItem value="major_deployment">Deploy em Produção</SelectItem>
                    <SelectItem value="major_theme">Marco Estratégico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="task-desc" className="text-xs font-semibold">
                  Descrição (Opcional)
                </Label>
                <Textarea
                  id="task-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Instruções ou escopo desta tarefa..."
                  rows={2}
                  className="text-xs bg-background"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex items-center justify-between gap-2 border-t border-border pt-3">
            {editingTask ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setIsTaskModalOpen(false);
                  handleDeleteTask(editingTask.id);
                }}
                className="text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Excluir
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTaskModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveTask} className="text-xs">
                {editingTask ? "Salvar Alterações" : "Criar Tarefa"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dependency Link Quick Modal */}
      <Dialog open={isDependencyModalOpen} onOpenChange={setIsDependencyModalOpen}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center space-x-2">
              <Link2 className="h-4 w-4 text-primary" />
              <span>Vincular Tarefa Predecessora</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecione qual tarefa deve ser concluída antes do início de{" "}
              <strong>"{activeLinkingTask?.name}"</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 max-h-60 overflow-y-auto">
            {tasks
              .filter((t) => t.id !== activeLinkingTask?.id)
              .map((t) => {
                const isLinked = activeLinkingTask?.dependencies?.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={async () => {
                      if (activeLinkingTask) {
                        const current = activeLinkingTask.dependencies || [];
                        const updated = isLinked
                          ? current.filter((id) => id !== t.id)
                          : [...current, t.id];
                        await taskService.update(activeLinkingTask.id, { dependencies: updated });
                        await loadData();
                        if (onTaskChange) onTaskChange();
                        setIsDependencyModalOpen(false);
                      }
                    }}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isLinked
                        ? "bg-primary/10 border-primary text-primary font-medium"
                        : "hover:bg-muted/50 border-border"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Término: {format(parseISO(t.end_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    {isLinked && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                );
              })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDependencyModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GanttChart;
