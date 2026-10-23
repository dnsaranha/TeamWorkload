import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  format,
  parseISO,
  differenceInCalendarDays,
  addDays,
  isBefore,
  isToday,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Columns,
  Download,
  Upload,
  Trash2,
  Edit3,
  GripVertical,
  Link2,
  User,
  Users,
  FolderOpen,
  FolderPlus,
  Eye,
  EyeOff,
  ArrowUpDown,
  MoreHorizontal,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  ListFilter,
  Grid3X3,
  SlidersHorizontal,
  FileSpreadsheet,
  FileDown,
  FileUp,
  RefreshCw,
  Settings,
  Pencil,
} from "lucide-react";
import * as XLSX from "xlsx";
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
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Checkbox } from "./ui/checkbox";

interface ProjectGridSheetProps {
  onDataChange?: () => void;
  initialProjectId?: string;
}

export type ColumnKey =
  | "rowNum"
  | "status"
  | "name"
  | "assigned"
  | "dependsOn"
  | "duration"
  | "effort"
  | "actualEffort"
  | "variance"
  | "effortRemaining"
  | "startDate"
  | "finishDate"
  | "project"
  | "specialMarker"
  | "actions";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  defaultWidth: number;
  minWidth: number;
  isMandatory?: boolean;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "rowNum", label: "#", defaultWidth: 44, minWidth: 36, isMandatory: true },
  { key: "status", label: "Status", defaultWidth: 46, minWidth: 40, isMandatory: true },
  { key: "name", label: "Nome da Tarefa", defaultWidth: 280, minWidth: 160, isMandatory: true },
  { key: "assigned", label: "Atribuído a", defaultWidth: 170, minWidth: 120 },
  { key: "dependsOn", label: "Predecessora", defaultWidth: 120, minWidth: 90 },
  { key: "duration", label: "Duração", defaultWidth: 95, minWidth: 75 },
  { key: "effort", label: "Esf. Estimado", defaultWidth: 100, minWidth: 75 },
  { key: "actualEffort", label: "Esf. Realizado", defaultWidth: 110, minWidth: 80 },
  { key: "variance", label: "Desvio / Saldo", defaultWidth: 110, minWidth: 85 },
  { key: "effortRemaining", label: "Esf. Restante", defaultWidth: 105, minWidth: 80 },
  { key: "startDate", label: "Início", defaultWidth: 115, minWidth: 95 },
  { key: "finishDate", label: "Término", defaultWidth: 115, minWidth: 95 },
  { key: "project", label: "Projeto", defaultWidth: 140, minWidth: 100 },
  { key: "specialMarker", label: "Marcador", defaultWidth: 110, minWidth: 80 },
  { key: "actions", label: "Ações", defaultWidth: 70, minWidth: 60, isMandatory: true },
];

const STORAGE_KEYS = {
  COLUMN_WIDTHS: "crono_grid_col_widths_v2",
  VISIBLE_COLUMNS: "crono_grid_visible_cols_v2",
  COLUMN_ORDER: "crono_grid_col_order_v2",
};

export const ProjectGridSheet: React.FC<ProjectGridSheetProps> = ({
  onDataChange,
  initialProjectId,
}) => {
  // Main Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Selection
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || "all"
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [groupBy, setGroupBy] = useState<"project" | "none">("project");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Active cell / row editing state
  const [activeCell, setActiveCell] = useState<{
    taskId: string;
    field: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // New inline task creation draft
  const [newRowDraft, setNewRowDraft] = useState<{
    projectId: string | null;
    name: string;
  } | null>(null);

  // Column Customization States
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COLUMN_WIDTHS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_COLUMNS.reduce((acc, col) => {
      acc[col.key] = col.defaultWidth;
      return acc;
    }, {} as Record<ColumnKey, number>);
  });

  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VISIBLE_COLUMNS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_COLUMNS.map((c) => c.key);
  });

  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COLUMN_ORDER);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_COLUMNS.map((c) => c.key);
  });

  // Drag & drop row reordering
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after">("before");

  // Column Resizing Ref
  const resizingRef = useRef<{
    colKey: ColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Project Modals State
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isManageProjectsOpen, setIsManageProjectsOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: addDays(new Date(), 30).toISOString().split("T")[0],
    categoria_estrategica: "Estratégico",
    special_marker: "none",
  });

  const taskFileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  // Load all initial data
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

      // Apply saved custom order if exists
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
      console.error("Error loading grid data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Export Tasks to Excel (.xlsx)
  const handleExportTasks = () => {
    const exportData = tasks.map((task, idx) => {
      const project = projects.find((p) => p.id === task.project_id);
      const employee = employees.find((e) => e.id === task.assigned_employee_id);
      return {
        "ID da Tarefa": task.id,
        "#": idx + 1,
        "Nome da Tarefa": task.name,
        "Descrição": task.description || "",
        "Projeto": project?.name || "Sem projeto",
        "ID do Projeto": task.project_id || "",
        "Responsável": employee?.name || "Não atribuído",
        "ID do Responsável": task.assigned_employee_id || "",
        "Status": task.status === "completed" ? "Concluída" : task.status === "in_progress" ? "Em Andamento" : "Pendente",
        "Data de Início": task.start_date,
        "Data de Término": task.end_date,
        "Esforço Estimado (h)": task.estimated_time || 0,
        "Progresso (%)": task.progress || (task.status === "completed" ? 100 : 0),
        "Predecessora ID": task.parent_task_id || "",
        "Marcador Especial": task.special_marker || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tarefas");
    XLSX.writeFile(wb, `tarefas_crono_pulse_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  // Export Projects to Excel (.xlsx)
  const handleExportProjects = () => {
    const exportData = projects.map((project) => ({
      "ID do Projeto": project.id,
      "Nome do Projeto": project.name,
      "Descrição": project.description || "",
      "Data de Início": project.start_date || "",
      "Data de Término": project.end_date || "",
      "Categoria Estratégica": project.categoria_estrategica || "",
      "Marcador Especial": project.special_marker || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projetos");
    XLSX.writeFile(wb, `projetos_crono_pulse_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  // Export Current Filtered Grid to Excel
  const handleExportGrid = () => {
    const rowsToExport = filteredTasks.map((task, idx) => {
      const project = projects.find((p) => p.id === task.project_id);
      const employee = employees.find((e) => e.id === task.assigned_employee_id);
      const rowObj: Record<string, any> = {};

      if (visibleColumns.includes("rowNum")) rowObj["#"] = idx + 1;
      if (visibleColumns.includes("status")) rowObj["Status"] = task.status;
      if (visibleColumns.includes("name")) rowObj["Nome da Tarefa"] = task.name;
      if (visibleColumns.includes("assigned")) rowObj["Responsável"] = employee?.name || "-";
      if (visibleColumns.includes("effort")) rowObj["Esforço (h)"] = task.estimated_time || 0;
      if (visibleColumns.includes("startDate")) rowObj["Início"] = task.start_date;
      if (visibleColumns.includes("finishDate")) rowObj["Término"] = task.end_date;
      if (visibleColumns.includes("project")) rowObj["Projeto"] = project?.name || "-";
      if (visibleColumns.includes("specialMarker")) rowObj["Marcador"] = task.special_marker || "-";

      return rowObj;
    });

    const ws = XLSX.utils.json_to_sheet(rowsToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Grade MS Project");
    XLSX.writeFile(wb, `grade_ms_project_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  // Import Tasks File (Excel or CSV)
  const handleImportTasksFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let importedCount = 0;
        for (const row of jsonData as any[]) {
          const name = row["Nome da Tarefa"] || row["Task Name"] || row["Nome"] || row["name"];
          if (name) {
            let projectId: string | null = row["ID do Projeto"] || row["Project ID"] || null;
            const projectName = row["Projeto"] || row["Project"];
            if (!projectId && projectName) {
              const matchedProj = projects.find((p) => p.name.toLowerCase() === String(projectName).toLowerCase());
              if (matchedProj) projectId = matchedProj.id;
            }

            let employeeId: string | null = row["ID do Responsável"] || row["Assigned To ID"] || null;
            const empName = row["Responsável"] || row["Atribuído a"] || row["Assigned To"];
            if (!employeeId && empName) {
              const matchedEmp = employees.find((emp) => emp.name.toLowerCase() === String(empName).toLowerCase());
              if (matchedEmp) employeeId = matchedEmp.id;
            }

            const rawStatus = row["Status"] || "pending";
            let status: "pending" | "in_progress" | "completed" = "pending";
            if (typeof rawStatus === "string") {
              const sLower = rawStatus.toLowerCase();
              if (sLower.includes("conclu") || sLower.includes("done") || sLower.includes("complete")) status = "completed";
              else if (sLower.includes("andamento") || sLower.includes("progress")) status = "in_progress";
            }

            const taskData: any = {
              name: String(name).trim(),
              description: row["Descrição"] || row["Description"] || "",
              estimated_time: Number(row["Esforço Estimado (h)"] || row["Esforço (h)"] || row["Estimated Hours"] || row["effort"] || 8),
              start_date: row["Data de Início"] || row["Início"] || row["Start Date"] || new Date().toISOString().split("T")[0],
              end_date: row["Data de Término"] || row["Término"] || row["End Date"] || new Date().toISOString().split("T")[0],
              project_id: projectId,
              assigned_employee_id: employeeId,
              status,
              special_marker: row["Marcador Especial"] || row["Marcador"] || null,
            };

            const existingId = row["ID da Tarefa"] || row["Task ID"] || row["ID"];
            if (existingId) {
              taskData.id = existingId;
            }

            await taskService.upsert(taskData);
            importedCount++;
          }
        }

        await loadData();
        if (onDataChange) onDataChange();
        alert(`Importação concluída! ${importedCount} tarefas importadas/atualizadas com sucesso.`);
      } catch (err) {
        console.error("Erro ao importar tarefas:", err);
        alert("Erro ao ler o arquivo. Certifique-se de selecionar uma planilha válida.");
      } finally {
        if (taskFileInputRef.current) taskFileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Import Projects File (Excel or CSV)
  const handleImportProjectsFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let importedCount = 0;
        for (const row of jsonData as any[]) {
          const name = row["Nome do Projeto"] || row["Nome"] || row["Name"] || row["name"];
          if (name) {
            const projectData: any = {
              name: String(name).trim(),
              description: row["Descrição"] || row["Description"] || "",
              start_date: row["Data de Início"] || row["Início"] || row["Start Date"] || new Date().toISOString().split("T")[0],
              end_date: row["Data de Término"] || row["Término"] || row["End Date"] || addDays(new Date(), 30).toISOString().split("T")[0],
              categoria_estrategica: row["Categoria Estratégica"] || row["Strategic Category"] || "Estratégico",
              special_marker: row["Marcador Especial"] || row["Marcador"] || null,
            };

            const existingId = row["ID do Projeto"] || row["Project ID"] || row["ID"];
            if (existingId) {
              projectData.id = existingId;
            }

            await projectService.upsert(projectData);
            importedCount++;
          }
        }

        await loadData();
        if (onDataChange) onDataChange();
        alert(`Importação de projetos concluída! ${importedCount} projetos importados/atualizados.`);
      } catch (err) {
        console.error("Erro ao importar projetos:", err);
        alert("Erro ao importar arquivo de projetos.");
      } finally {
        if (projectFileInputRef.current) projectFileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Project Save Handler (Create & Update)
  const handleSaveProject = async () => {
    if (!projectForm.name.trim()) {
      alert("Por favor, insira o nome do projeto.");
      return;
    }

    try {
      if (editingProject) {
        await projectService.update(editingProject.id, {
          name: projectForm.name.trim(),
          description: projectForm.description.trim() || null,
          start_date: projectForm.start_date || null,
          end_date: projectForm.end_date || null,
          categoria_estrategica: projectForm.categoria_estrategica || null,
          special_marker: projectForm.special_marker === "none" ? null : projectForm.special_marker,
        });
      } else {
        await projectService.create({
          name: projectForm.name.trim(),
          description: projectForm.description.trim() || null,
          start_date: projectForm.start_date || null,
          end_date: projectForm.end_date || null,
          categoria_estrategica: projectForm.categoria_estrategica || null,
          special_marker: projectForm.special_marker === "none" ? null : projectForm.special_marker,
        });
      }

      setIsNewProjectOpen(false);
      setEditingProject(null);
      setProjectForm({
        name: "",
        description: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: addDays(new Date(), 30).toISOString().split("T")[0],
        categoria_estrategica: "Estratégico",
        special_marker: "none",
      });

      await loadData();
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error("Error saving project:", err);
      alert("Erro ao salvar projeto.");
    }
  };

  const handleOpenEditProject = (proj: Project) => {
    setEditingProject(proj);
    setProjectForm({
      name: proj.name,
      description: proj.description || "",
      start_date: proj.start_date || new Date().toISOString().split("T")[0],
      end_date: proj.end_date || addDays(new Date(), 30).toISOString().split("T")[0],
      categoria_estrategica: proj.categoria_estrategica || "Estratégico",
      special_marker: proj.special_marker || "none",
    });
    setIsNewProjectOpen(true);
  };

  const handleDeleteProject = async (projId: string) => {
    try {
      await projectService.delete(projId);
      await loadData();
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  // Persist column widths
  const handleColumnResizeStart = (
    colKey: ColumnKey,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      colKey,
      startX: e.clientX,
      startWidth: columnWidths[colKey] || 100,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = moveEvent.clientX - resizingRef.current.startX;
      const colDef = DEFAULT_COLUMNS.find((c) => c.key === resizingRef.current!.colKey);
      const minW = colDef ? colDef.minWidth : 50;
      const newWidth = Math.max(minW, resizingRef.current.startWidth + delta);

      setColumnWidths((prev) => {
        const updated = { ...prev, [resizingRef.current!.colKey]: newWidth };
        try {
          localStorage.setItem(STORAGE_KEYS.COLUMN_WIDTHS, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Toggle Column Visibility
  const toggleColumnVisibility = (key: ColumnKey) => {
    const colDef = DEFAULT_COLUMNS.find((c) => c.key === key);
    if (colDef?.isMandatory) return;

    setVisibleColumns((prev) => {
      const updated = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      try {
        localStorage.setItem(STORAGE_KEYS.VISIBLE_COLUMNS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Move Column Left / Right
  const moveColumn = (key: ColumnKey, direction: "left" | "right") => {
    const currentIndex = columnOrder.indexOf(key);
    if (currentIndex === -1) return;
    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= columnOrder.length) return;

    const newOrder = [...columnOrder];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, moved);

    setColumnOrder(newOrder);
    try {
      localStorage.setItem(STORAGE_KEYS.COLUMN_ORDER, JSON.stringify(newOrder));
    } catch {}
  };

  // Reset columns to default
  const resetColumnsToDefault = () => {
    const defaultCols = DEFAULT_COLUMNS.map((c) => c.key);
    const defaultWidths = DEFAULT_COLUMNS.reduce((acc, col) => {
      acc[col.key] = col.defaultWidth;
      return acc;
    }, {} as Record<ColumnKey, number>);

    setVisibleColumns(defaultCols);
    setColumnOrder(defaultCols);
    setColumnWidths(defaultWidths);

    try {
      localStorage.removeItem(STORAGE_KEYS.COLUMN_WIDTHS);
      localStorage.removeItem(STORAGE_KEYS.VISIBLE_COLUMNS);
      localStorage.removeItem(STORAGE_KEYS.COLUMN_ORDER);
    } catch {}
  };

  // Quick Inline Update Handler
  const handleUpdateTaskField = async (
    taskId: string,
    field: keyof Task | string,
    value: any
  ) => {
    // Optimistic UI Update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t))
    );

    try {
      const updatePayload: Partial<TaskInsert> = { [field]: value };

      // Auto-compute completion date when status is changed
      if (field === "status") {
        if (value === "completed") {
          updatePayload.completion_date = new Date().toISOString().split("T")[0];
        } else {
          updatePayload.completion_date = null;
        }
      }

      // If start_date changes, ensure end_date is valid or adjusted
      if (field === "start_date") {
        const currentTask = tasks.find((t) => t.id === taskId);
        if (currentTask && currentTask.end_date) {
          const s = parseISO(value);
          const e = parseISO(currentTask.end_date);
          if (s > e) {
            updatePayload.end_date = value;
          }
        }
      }

      await taskService.update(taskId, updatePayload);
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error(`Error updating task field ${field}:`, err);
      // Revert from server on failure
      loadData();
    }
  };

  // Toggle Task Completion
  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    await handleUpdateTaskField(task.id, "status", newStatus);
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await taskService.delete(taskId);
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error("Error deleting task:", err);
      loadData();
    }
  };

  // Add Inline Quick Task
  const handleCreateInlineTask = async (projectId: string | null) => {
    const today = new Date().toISOString().split("T")[0];
    const defaultEnd = addDays(new Date(), 3).toISOString().split("T")[0];

    const parentProj = projectId ? projects.find((p) => p.id === projectId) : null;
    const newTaskData: TaskInsert = {
      name: "Nova Tarefa",
      description: null,
      start_date: today,
      end_date: defaultEnd,
      estimated_time: 8,
      status: "pending",
      project_id: projectId,
      group_id: parentProj?.group_id || null,
      group_name: parentProj?.group_name || null,
      assigned_employee_id: null,
      dependencies: [],
    };

    try {
      const created = await taskService.create(newTaskData);
      setTasks((prev) => [...prev, created]);
      setSelectedRowId(created.id);
      setActiveCell({ taskId: created.id, field: "name" });
      setEditingValue("Nova Tarefa");
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error("Error creating inline task:", err);
    }
  };

  // Move Task Up / Down
  const handleMoveTaskOrder = async (taskId: string, direction: "up" | "down") => {
    const currentIndex = tasks.findIndex((t) => t.id === taskId);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= tasks.length) return;

    const newTasks = [...tasks];
    const [moved] = newTasks.splice(currentIndex, 1);
    newTasks.splice(targetIndex, 0, moved);

    setTasks(newTasks);
    setSelectedRowId(taskId);

    try {
      await taskService.reorderTasks(newTasks);
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error("Error saving task reorder:", err);
    }
  };

  // Drag and Drop Rows
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    setSelectedRowId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedTaskId && draggedTaskId !== targetTaskId) {
      setDragOverTaskId(targetTaskId);
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      setDropPosition(e.clientY < midY ? "before" : "after");
    }
  };

  const handleDragLeave = () => {
    setDragOverTaskId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    const sourceTaskId = draggedTaskId || e.dataTransfer.getData("text/plain");
    setDragOverTaskId(null);
    setDraggedTaskId(null);

    if (!sourceTaskId || sourceTaskId === targetTaskId) return;

    const sourceIndex = tasks.findIndex((t) => t.id === sourceTaskId);
    const targetIndex = tasks.findIndex((t) => t.id === targetTaskId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const newTasks = [...tasks];
    const [moved] = newTasks.splice(sourceIndex, 1);
    const adjustedTargetIndex = newTasks.findIndex((t) => t.id === targetTaskId);
    const insertIndex = dropPosition === "before" ? adjustedTargetIndex : adjustedTargetIndex + 1;
    newTasks.splice(insertIndex, 0, moved);

    setTasks(newTasks);
    setSelectedRowId(sourceTaskId);

    try {
      await taskService.reorderTasks(newTasks);
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error("Error saving drag reorder:", err);
    }
  };

  // Filter Tasks
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

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" && task.status === "completed") ||
        (statusFilter === "in_progress" && task.status === "in_progress") ||
        (statusFilter === "pending" && task.status !== "completed" && task.status !== "in_progress");

      return matchSearch && matchProject && matchEmployee && matchStatus;
    });
  }, [tasks, searchTerm, selectedProjectId, selectedEmployeeId, statusFilter]);

  // Grouped structure for MS Project hierarchy
  const groupedData = useMemo(() => {
    if (groupBy === "none") {
      return [{ id: "all", name: "Todas as Tarefas", project: null, tasks: filteredTasks }];
    }

    const projectMap = new Map<string, Task[]>();
    const unassignedTasks: Task[] = [];

    filteredTasks.forEach((t) => {
      if (t.project_id) {
        const list = projectMap.get(t.project_id) || [];
        list.push(t);
        projectMap.set(t.project_id, list);
      } else {
        unassignedTasks.push(t);
      }
    });

    const groups: {
      id: string;
      name: string;
      project: Project | null;
      tasks: Task[];
      totalEffort: number;
      totalActualEffort: number;
      remainingEffort: number;
      completedCount: number;
      earliestStart: string | null;
      latestFinish: string | null;
      totalDays: number;
    }[] = [];

    // Add existing projects in project map
    projects.forEach((proj) => {
      const projTasks = projectMap.get(proj.id) || [];
      if (selectedProjectId === "all" || selectedProjectId === proj.id) {
        if (projTasks.length > 0 || selectedProjectId === proj.id) {
          // Calculate rollups
          let totalEff = 0;
          let totalAct = 0;
          let remEff = 0;
          let compCount = 0;
          let minStart: Date | null = null;
          let maxEnd: Date | null = null;

          projTasks.forEach((t) => {
            const eff = Number(t.estimated_time) || 0;
            const act = Number(t.actual_time) || 0;
            totalEff += eff;
            totalAct += act;
            if (t.status === "completed") {
              compCount++;
            } else {
              remEff += eff;
            }

            try {
              const s = parseISO(t.start_date);
              const e = parseISO(t.end_date);
              if (!minStart || s < minStart) minStart = s;
              if (!maxEnd || e > maxEnd) maxEnd = e;
            } catch {}
          });

          const durDays =
            minStart && maxEnd
              ? Math.max(1, differenceInCalendarDays(maxEnd, minStart) + 1)
              : 0;

          groups.push({
            id: proj.id,
            name: proj.name,
            project: proj,
            tasks: projTasks,
            totalEffort: totalEff,
            totalActualEffort: Number(totalAct.toFixed(1)),
            remainingEffort: remEff,
            completedCount: compCount,
            earliestStart: minStart ? format(minStart, "yyyy-MM-dd") : null,
            latestFinish: maxEnd ? format(maxEnd, "yyyy-MM-dd") : null,
            totalDays: durDays,
          });
        }
      }
    });

    // Unassigned project group
    if (unassignedTasks.length > 0 && (selectedProjectId === "all" || selectedProjectId === "none")) {
      let totalEff = 0;
      let totalAct = 0;
      let remEff = 0;
      let compCount = 0;
      let minStart: Date | null = null;
      let maxEnd: Date | null = null;

      unassignedTasks.forEach((t) => {
        const eff = Number(t.estimated_time) || 0;
        const act = Number(t.actual_time) || 0;
        totalEff += eff;
        totalAct += act;
        if (t.status === "completed") compCount++;
        else remEff += eff;

        try {
          const s = parseISO(t.start_date);
          const e = parseISO(t.end_date);
          if (!minStart || s < minStart) minStart = s;
          if (!maxEnd || e > maxEnd) maxEnd = e;
        } catch {}
      });

      const durDays =
        minStart && maxEnd
          ? Math.max(1, differenceInCalendarDays(maxEnd, minStart) + 1)
          : 0;

      groups.push({
        id: "unassigned",
        name: "Tarefas Sem Projeto Associado",
        project: null,
        tasks: unassignedTasks,
        totalEffort: totalEff,
        totalActualEffort: Number(totalAct.toFixed(1)),
        remainingEffort: remEff,
        completedCount: compCount,
        earliestStart: minStart ? format(minStart, "yyyy-MM-dd") : null,
        latestFinish: maxEnd ? format(maxEnd, "yyyy-MM-dd") : null,
        totalDays: durDays,
      });
    }

    return groups;
  }, [filteredTasks, projects, selectedProjectId, groupBy]);

  // Overall Project Stats for Header
  const overallStats = useMemo(() => {
    let totalTasks = tasks.length;
    let completed = tasks.filter((t) => t.status === "completed").length;
    let totalEffort = Number(tasks.reduce((sum, t) => sum + (Number(t.estimated_time) || 0), 0).toFixed(1));
    let totalActualEffort = Number(tasks.reduce((sum, t) => sum + (Number(t.actual_time) || 0), 0).toFixed(1));
    let remainingEffort = Number(
      tasks.reduce(
        (sum, t) => (t.status === "completed" ? sum : sum + (Number(t.estimated_time) || 0)),
        0
      ).toFixed(1)
    );

    return { totalTasks, completed, totalEffort, totalActualEffort, remainingEffort };
  }, [tasks]);

  // Global sequential row index lookup
  const taskRowIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let counter = 1;
    groupedData.forEach((group) => {
      // Group header counts as a numbered item if grouped
      if (groupBy === "project") {
        map.set(`group-${group.id}`, counter++);
      }
      group.tasks.forEach((t) => {
        map.set(t.id, counter++);
      });
    });
    return map;
  }, [groupedData, groupBy]);

  // Helper for rendering date with highlight (Today / Overdue like MS Project Web)
  const renderDateCell = (dateStr?: string | null) => {
    if (!dateStr) return <span className="text-muted-foreground/50">-</span>;
    try {
      const d = parseISO(dateStr);
      const isPast = isBefore(d, startOfDay(new Date())) && !isToday(d);
      const isCurToday = isToday(d);

      if (isCurToday) {
        return (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
            Hoje ({format(d, "dd/MM")})
          </span>
        );
      }

      if (isPast) {
        return (
          <span className="text-rose-600 dark:text-rose-400 font-medium text-[11px]">
            {format(d, "dd/MM/yyyy")}
          </span>
        );
      }

      return (
        <span className="text-foreground text-[11px]">
          {format(d, "dd/MM/yyyy")}
        </span>
      );
    } catch {
      return <span>{dateStr}</span>;
    }
  };

  // Helper to get employee initials
  const getEmployeeInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Color generator for avatar badges based on name
  const getAvatarColor = (name?: string) => {
    if (!name) return "bg-muted text-muted-foreground";
    const colors = [
      "bg-emerald-500 text-white",
      "bg-blue-500 text-white",
      "bg-purple-500 text-white",
      "bg-rose-500 text-white",
      "bg-amber-500 text-white",
      "bg-indigo-500 text-white",
      "bg-cyan-500 text-white",
      "bg-teal-500 text-white",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // Active visible ordered columns
  const activeColumns = useMemo(() => {
    return columnOrder
      .filter((k) => visibleColumns.includes(k))
      .map((k) => DEFAULT_COLUMNS.find((c) => c.key === k)!)
      .filter(Boolean);
  }, [columnOrder, visibleColumns]);

  return (
    <div className="flex flex-col h-full bg-background text-foreground select-none overflow-hidden">
      {/* Top Banner / MS Project Style Header */}
      <div className="bg-[#107c41] dark:bg-[#0c592e] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm shrink-0">
        {/* Left Project Info & View Switcher */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-white/10 rounded-md">
              <Grid3X3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  {selectedProjectId === "all"
                    ? "Visão Geral de Todos os Projetos"
                    : projects.find((p) => p.id === selectedProjectId)?.name || "Projeto"}
                </h2>
              </div>
              <p className="text-[11px] text-white/80">
                {overallStats.totalTasks} tarefas • {overallStats.completed} concluídas •{" "}
                <span className="font-semibold">{overallStats.totalEffort}h</span> planejado •{" "}
                <span className="font-semibold text-emerald-200">{overallStats.totalActualEffort}h</span> realizado
              </p>
            </div>
          </div>
        </div>

        {/* Right Stats & Quick Actions */}
        <div className="flex items-center space-x-2">
          {/* Hidden File Inputs for Import */}
          <input
            type="file"
            ref={taskFileInputRef}
            onChange={handleImportTasksFile}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <input
            type="file"
            ref={projectFileInputRef}
            onChange={handleImportProjectsFile}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          {/* Options / Data Management Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 gap-1.5 px-2.5 shadow-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Opções & Dados</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg">
              <DropdownMenuLabel className="text-[11px] font-semibold px-2 py-1 flex items-center gap-1.5 text-muted-foreground">
                <FolderOpen className="h-3.5 w-3.5 text-primary" />
                <span>Gestão de Projetos</span>
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setEditingProject(null);
                  setProjectForm({
                    name: "",
                    description: "",
                    start_date: new Date().toISOString().split("T")[0],
                    end_date: addDays(new Date(), 30).toISOString().split("T")[0],
                    categoria_estrategica: "Estratégico",
                    special_marker: "none",
                  });
                  setIsNewProjectOpen(true);
                }}
                className="text-xs cursor-pointer gap-2"
              >
                <FolderPlus className="h-3.5 w-3.5 text-primary" />
                <span>Novo Projeto...</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsManageProjectsOpen(true)}
                className="text-xs cursor-pointer gap-2"
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Gerenciar Projetos...</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-[11px] font-semibold px-2 py-1 flex items-center gap-1.5 text-muted-foreground">
                <FileDown className="h-3.5 w-3.5 text-emerald-600" />
                <span>Exportar Dados</span>
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={handleExportTasks} className="text-xs cursor-pointer gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Exportar Tarefas (.xlsx)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportProjects} className="text-xs cursor-pointer gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                <span>Exportar Projetos (.xlsx)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportGrid} className="text-xs cursor-pointer gap-2">
                <Download className="h-3.5 w-3.5 text-amber-600" />
                <span>Exportar Grade Atual</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-[11px] font-semibold px-2 py-1 flex items-center gap-1.5 text-muted-foreground">
                <FileUp className="h-3.5 w-3.5 text-blue-600" />
                <span>Importar & Migrar</span>
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => taskFileInputRef.current?.click()}
                className="text-xs cursor-pointer gap-2"
              >
                <Upload className="h-3.5 w-3.5 text-emerald-600" />
                <span>Importar Tarefas (Excel/CSV)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => projectFileInputRef.current?.click()}
                className="text-xs cursor-pointer gap-2"
              >
                <Upload className="h-3.5 w-3.5 text-blue-600" />
                <span>Importar Projetos (Excel/CSV)</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={loadData} className="text-xs cursor-pointer gap-2">
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Atualizar Grade</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={() => handleCreateInlineTask(selectedProjectId === "all" ? null : selectedProjectId)}
            className="h-7 text-xs font-semibold bg-white text-[#107c41] hover:bg-white/90 shadow-sm border-none gap-1 px-2.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar Tarefa</span>
          </Button>
        </div>
      </div>

      {/* Spreadsheet Control Toolbar (Search, Filters, Column Config, Grouping) */}
      <div className="p-2 border-b border-border bg-card flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Left Filters */}
        <div className="flex items-center space-x-2 flex-1 min-w-[260px] flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefa ou sub-item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          {/* Project Filter */}
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="h-8 text-xs w-[140px] sm:w-[160px] bg-background">
              <SelectValue placeholder="Projetos" />
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
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="h-8 text-xs w-[130px] sm:w-[150px] bg-background">
              <SelectValue placeholder="Colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Colaboradores</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-[110px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right Tools (Grouping, Columns Dropdown, Collapse/Expand) */}
        <div className="flex items-center space-x-1.5 flex-wrap">
          {/* Group By Toggle */}
          <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setGroupBy("project")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                groupBy === "project"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Agrupar tarefas por Projeto/Fase"
            >
              Por Projeto
            </button>
            <button
              onClick={() => setGroupBy("none")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                groupBy === "none"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Exibir lista contínua sem grupos"
            >
              Sem Grupo
            </button>
          </div>

          {/* Column Customizer Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 font-medium bg-background"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                <span>Colunas ({visibleColumns.length})</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <DropdownMenuLabel className="text-xs font-semibold px-2 py-1 flex items-center justify-between">
                <span>Exibir / Ocultar Colunas</span>
                <button
                  onClick={resetColumnsToDefault}
                  className="text-[10px] text-primary hover:underline font-normal flex items-center gap-0.5"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  <span>Restaurar</span>
                </button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DEFAULT_COLUMNS.map((col) => {
                const isChecked = visibleColumns.includes(col.key);
                return (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={isChecked}
                    disabled={col.isMandatory}
                    onCheckedChange={() => toggleColumnVisibility(col.key)}
                    className="text-xs py-1.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{col.label}</span>
                      {col.isMandatory && (
                        <span className="text-[9px] text-muted-foreground ml-2">(Fixo)</span>
                      )}
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Expand / Collapse All */}
          {groupBy === "project" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const areAllCollapsed = groupedData.every((g) => collapsedGroups[g.id]);
                const nextState: Record<string, boolean> = {};
                if (!areAllCollapsed) {
                  groupedData.forEach((g) => {
                    nextState[g.id] = true;
                  });
                }
                setCollapsedGroups(nextState);
              }}
              className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
              title="Expandir ou recolher todos os grupos"
            >
              {groupedData.every((g) => collapsedGroups[g.id]) ? "Expandir Tudo" : "Recolher Tudo"}
            </Button>
          )}
        </div>
      </div>

      {/* Main Google Sheets / MS Project Interactive Grid Canvas */}
      <div className="flex-1 overflow-auto bg-background relative border-t border-border">
        <table className="w-full text-xs text-left border-collapse min-w-max">
          {/* Table Header with Resizable Dividers and Column Move controls */}
          <thead className="sticky top-0 z-30 bg-muted/90 backdrop-blur-md text-muted-foreground border-b border-border shadow-xs">
            <tr className="h-9">
              {activeColumns.map((col) => {
                const width = columnWidths[col.key] || col.defaultWidth;
                return (
                  <th
                    key={col.key}
                    style={{ width: `${width}px`, minWidth: `${col.minWidth}px` }}
                    className="relative px-2 py-1.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground select-none border-r border-border/60 group"
                  >
                    <div className="flex items-center justify-between pr-1">
                      <span className="truncate">{col.label}</span>

                      {/* Move Column Left/Right helper icons on hover */}
                      <div className="hidden group-hover:flex items-center space-x-0.5 opacity-60">
                        <button
                          type="button"
                          onClick={() => moveColumn(col.key, "left")}
                          className="hover:text-primary p-0.5"
                          title="Mover coluna para esquerda"
                        >
                          <ChevronRight className="h-3 w-3 rotate-180" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveColumn(col.key, "right")}
                          className="hover:text-primary p-0.5"
                          title="Mover coluna para direita"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Draggable Column Width Resizer */}
                    <div
                      onMouseDown={(e) => handleColumnResizeStart(col.key, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/80 transition-colors z-20 group-hover:bg-border"
                      title="Clique e arraste para redimensionar coluna"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-border/60">
            {groupedData.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length} className="p-8 text-center text-muted-foreground text-xs">
                  Nenhuma tarefa encontrada para os filtros selecionados.
                </td>
              </tr>
            ) : (
              groupedData.map((group) => {
                const isGroupCollapsed = collapsedGroups[group.id];
                const groupRowNumber = taskRowIndexMap.get(`group-${group.id}`) || 1;

                return (
                  <React.Fragment key={`grp-${group.id}`}>
                    {/* Summary Parent Task / Project Group Row */}
                    {groupBy === "project" && (
                      <tr className="bg-muted/40 hover:bg-muted/60 font-semibold text-foreground transition-colors border-b border-border">
                        {activeColumns.map((col) => {
                          if (col.key === "rowNum") {
                            return (
                              <td
                                key={col.key}
                                className="px-2 py-2 text-center text-muted-foreground font-mono text-[11px] border-r border-border/40"
                              >
                                {groupRowNumber}
                              </td>
                            );
                          }

                          if (col.key === "status") {
                            return (
                              <td key={col.key} className="px-2 py-2 text-center border-r border-border/40">
                                <div
                                  className="cursor-pointer flex items-center justify-center"
                                  onClick={() =>
                                    setCollapsedGroups((prev) => ({
                                      ...prev,
                                      [group.id]: !prev[group.id],
                                    }))
                                  }
                                >
                                  {isGroupCollapsed ? (
                                    <ChevronRight className="h-4 w-4 text-primary" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                              </td>
                            );
                          }

                          if (col.key === "name") {
                            return (
                              <td
                                key={col.key}
                                className="px-2.5 py-2 border-r border-border/40 cursor-pointer"
                                onClick={() =>
                                  setCollapsedGroups((prev) => ({
                                    ...prev,
                                    [group.id]: !prev[group.id],
                                  }))
                                }
                              >
                                <div className="flex items-center space-x-2">
                                  <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                                  <span className="font-bold text-sm tracking-tight truncate">
                                    {group.name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-medium ml-1 bg-background"
                                  >
                                    {group.tasks.length} tarefa(s)
                                  </Badge>
                                </div>
                              </td>
                            );
                          }

                          if (col.key === "assigned") {
                            return (
                              <td key={col.key} className="px-2 py-2 border-r border-border/40 text-muted-foreground text-[11px]">
                                {group.tasks.length > 0 && (
                                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                                    {Array.from(
                                      new Set(
                                        group.tasks
                                          .map((t) => t.assigned_employee_id)
                                          .filter(Boolean)
                                      )
                                    )
                                      .slice(0, 3)
                                      .map((empId) => {
                                        const emp = employees.find((e) => e.id === empId);
                                        return (
                                          <div
                                            key={empId}
                                            className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center border border-background shadow-xs ${getAvatarColor(
                                              emp?.name
                                            )}`}
                                            title={emp?.name}
                                          >
                                            {getEmployeeInitials(emp?.name)}
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </td>
                            );
                          }

                          if (col.key === "duration") {
                            return (
                              <td key={col.key} className="px-2 py-2 border-r border-border/40 font-bold text-[11px]">
                                {group.totalDays > 0 ? `${group.totalDays} dias` : "-"}
                              </td>
                            );
                          }

                          if (col.key === "effort") {
                            return (
                              <td key={col.key} className="px-2 py-2 border-r border-border/40 font-bold text-[11px]">
                                {group.totalEffort} h
                              </td>
                            );
                          }

                          if (col.key === "actualEffort") {
                            return (
                              <td key={col.key} className="px-2 py-2 border-r border-border/40 font-bold text-[11px] text-emerald-600 dark:text-emerald-400">
                                {group.totalActualEffort} h
                              </td>
                            );
                          }

                          if (col.key === "variance") {
                            const diff = Number((group.totalActualEffort - group.totalEffort).toFixed(1));
                            return (
                              <td key={col.key} className="px-2 py-2 border-r border-border/40 font-bold text-[11px]">
                                {diff === 0 ? (
                                  <span className="text-muted-foreground font-mono text-[10px]">0.0h</span>
                                ) : diff > 0 ? (
                                  <span className="text-rose-600 dark:text-rose-400 font-mono text-[10px]">+{diff}h</span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">{diff}h</span>
                                )}
                              </td>
                            );
                          }

                          if (col.key === "effortRemaining") {
                            return (
                              <td key={col.key} className="px-2 py-2 border-r border-border/40 font-bold text-[11px] text-amber-600 dark:text-amber-400">
                                {group.remainingEffort} h
                              </td>
                            );
                          }

                          if (col.key === "startDate") {
                            return (
                              <td key={col.key} className="px-2 py-2 border-r border-border/40 text-[11px] font-semibold">
                                {renderDateCell(group.earliestStart)}
                              </td>
                            );
                          }

                          if (col.key === "finishDate") {
                            return (
                              <td key={col.key} className="px-2 py-2 border-r border-border/40 text-[11px] font-semibold">
                                {renderDateCell(group.latestFinish)}
                              </td>
                            );
                          }

                          if (col.key === "actions") {
                            return (
                              <td key={col.key} className="px-2 py-2 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCreateInlineTask(group.project?.id || null)}
                                  className="h-6 w-6 text-primary hover:bg-primary/10 rounded"
                                  title="Adicionar tarefa neste projeto"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            );
                          }

                          return <td key={col.key} className="px-2 py-2 border-r border-border/40">-</td>;
                        })}
                      </tr>
                    )}

                    {/* Child Task Rows (Spreadsheet editable cells) */}
                    {!isGroupCollapsed &&
                      group.tasks.map((task) => {
                        const isSelected = selectedRowId === task.id;
                        const isCompleted = task.status === "completed";
                        const rowNum = taskRowIndexMap.get(task.id) || 1;
                        const employee = employees.find((e) => e.id === task.assigned_employee_id);
                        const durationDays = Math.max(
                          1,
                          differenceInCalendarDays(
                            parseISO(task.end_date),
                            parseISO(task.start_date)
                          ) + 1
                        );
                        const taskDeps = task.dependencies || [];

                        const isDragging = draggedTaskId === task.id;
                        const isDragOver = dragOverTaskId === task.id;

                        return (
                          <tr
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragOver={(e) => handleDragOver(e, task.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, task.id)}
                            onClick={() => setSelectedRowId(task.id)}
                            className={`group h-9 transition-colors border-b border-border/40 ${
                              isSelected
                                ? "bg-primary/5 dark:bg-primary/10"
                                : "hover:bg-muted/30"
                            } ${isDragging ? "opacity-30 bg-muted" : ""} ${
                              isDragOver
                                ? dropPosition === "before"
                                  ? "border-t-2 border-primary bg-primary/10"
                                  : "border-b-2 border-primary bg-primary/10"
                                : ""
                            }`}
                          >
                            {activeColumns.map((col) => {
                              // 1. Row Number & Drag Handle
                              if (col.key === "rowNum") {
                                return (
                                  <td
                                    key={col.key}
                                    className="px-1 py-1 text-center font-mono text-[11px] text-muted-foreground border-r border-border/40 relative"
                                  >
                                    <div className="flex items-center justify-center space-x-1">
                                      <div
                                        className="cursor-grab active:cursor-grabbing text-muted-foreground/30 group-hover:text-muted-foreground p-0.5"
                                        title="Arraste para reordenar"
                                      >
                                        <GripVertical className="h-3 w-3" />
                                      </div>
                                      <span>{rowNum}</span>
                                    </div>
                                  </td>
                                );
                              }

                              // 2. Status Circle Checkbox (MS Project Style O / ✔)
                              if (col.key === "status") {
                                return (
                                  <td
                                    key={col.key}
                                    className="px-2 py-1 text-center border-r border-border/40"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTaskStatus(task)}
                                      className="inline-flex items-center justify-center p-0.5 rounded-full hover:scale-110 transition-transform"
                                      title={isCompleted ? "Marcar como pendente" : "Marcar como concluída"}
                                    >
                                      {isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                                      ) : (
                                        <Circle className="h-4 w-4 text-muted-foreground/60 hover:text-primary transition-colors" />
                                      )}
                                    </button>
                                  </td>
                                );
                              }

                              // 3. Task Name (Inline Direct Edit with green focus outline like MS Project)
                              if (col.key === "name") {
                                const isEditing =
                                  activeCell?.taskId === task.id && activeCell?.field === "name";

                                return (
                                  <td
                                    key={col.key}
                                    onClick={() => {
                                      setActiveCell({ taskId: task.id, field: "name" });
                                      setEditingValue(task.name);
                                    }}
                                    className={`px-3 py-1 border-r border-border/40 cursor-text transition-all ${
                                      isEditing
                                        ? "ring-2 ring-emerald-600 dark:ring-emerald-400 bg-background z-20"
                                        : ""
                                    }`}
                                  >
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        autoFocus
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        onBlur={() => {
                                          if (editingValue.trim()) {
                                            handleUpdateTaskField(task.id, "name", editingValue.trim());
                                          }
                                          setActiveCell(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            if (editingValue.trim()) {
                                              handleUpdateTaskField(task.id, "name", editingValue.trim());
                                            }
                                            setActiveCell(null);
                                          } else if (e.key === "Escape") {
                                            setActiveCell(null);
                                          }
                                        }}
                                        className="w-full bg-transparent outline-none font-medium text-xs text-foreground"
                                      />
                                    ) : (
                                      <div
                                        className={`flex items-center space-x-2 truncate ${
                                          groupBy === "project" ? "pl-2" : ""
                                        }`}
                                      >
                                        <span
                                          className={`font-medium truncate ${
                                            isCompleted
                                              ? "line-through text-muted-foreground opacity-70"
                                              : "text-foreground"
                                          }`}
                                        >
                                          {task.name}
                                        </span>
                                        {task.special_marker && task.special_marker !== "none" && (
                                          <span
                                            className="w-1.5 h-1.5 rotate-45 bg-purple-600 shrink-0"
                                            title={`Marcador: ${task.special_marker}`}
                                          />
                                        )}
                                      </div>
                                    )}
                                  </td>
                                );
                              }

                              // 4. Assigned To (Inline Popover with Avatar / Initials)
                              if (col.key === "assigned") {
                                return (
                                  <td
                                    key={col.key}
                                    className="px-2 py-1 border-r border-border/40 cursor-pointer"
                                  >
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <div className="flex items-center space-x-1.5 hover:bg-muted/60 p-1 rounded transition-colors">
                                          {employee ? (
                                            <>
                                              <div
                                                className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 shadow-xs ${getAvatarColor(
                                                  employee.name
                                                )}`}
                                              >
                                                {getEmployeeInitials(employee.name)}
                                              </div>
                                              <span className="truncate text-[11px] font-medium text-foreground">
                                                {employee.name}
                                              </span>
                                            </>
                                          ) : (
                                            <span className="text-muted-foreground/50 italic text-[11px] flex items-center gap-1">
                                              <User className="h-3 w-3" />
                                              <span>Não atribuído</span>
                                            </span>
                                          )}
                                        </div>
                                      </PopoverTrigger>
                                      <PopoverContent align="start" className="w-56 p-2 space-y-1">
                                        <div className="text-xs font-semibold text-muted-foreground px-1 pb-1">
                                          Atribuir Responsável
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdateTaskField(task.id, "assigned_employee_id", null)
                                          }
                                          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted/80 flex items-center justify-between"
                                        >
                                          <span className="text-muted-foreground">Ninguém (Desmarcar)</span>
                                          {!task.assigned_employee_id && (
                                            <Check className="h-3.5 w-3.5 text-primary" />
                                          )}
                                        </button>
                                        <div className="border-t border-border my-1" />
                                        {employees.map((emp) => (
                                          <button
                                            key={emp.id}
                                            type="button"
                                            onClick={() =>
                                              handleUpdateTaskField(
                                                task.id,
                                                "assigned_employee_id",
                                                emp.id
                                              )
                                            }
                                            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted/80 flex items-center space-x-2"
                                          >
                                            <div
                                              className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${getAvatarColor(
                                                emp.name
                                              )}`}
                                            >
                                              {getEmployeeInitials(emp.name)}
                                            </div>
                                            <div className="flex-1 truncate">
                                              <div className="font-medium truncate">{emp.name}</div>
                                              <div className="text-[10px] text-muted-foreground truncate">
                                                {emp.role}
                                              </div>
                                            </div>
                                            {task.assigned_employee_id === emp.id && (
                                              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                            )}
                                          </button>
                                        ))}
                                      </PopoverContent>
                                    </Popover>
                                  </td>
                                );
                              }

                              // 5. Predecessors / Depends on (Numbered badge pills like 2, 4, 9)
                              if (col.key === "dependsOn") {
                                return (
                                  <td
                                    key={col.key}
                                    className="px-2 py-1 border-r border-border/40 cursor-pointer"
                                  >
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <div className="flex items-center gap-1 flex-wrap hover:bg-muted/60 p-1 rounded min-h-[24px]">
                                          {taskDeps.length === 0 ? (
                                            <span className="text-muted-foreground/40 text-[11px]">-</span>
                                          ) : (
                                            taskDeps.map((depId) => {
                                              const depIndex = taskRowIndexMap.get(depId) || "?";
                                              return (
                                                <span
                                                  key={depId}
                                                  className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono font-bold text-foreground"
                                                  title={`Predecessora #${depIndex}`}
                                                >
                                                  {depIndex}
                                                </span>
                                              );
                                            })
                                          )}
                                        </div>
                                      </PopoverTrigger>
                                      <PopoverContent align="start" className="w-72 p-2">
                                        <div className="text-xs font-semibold text-muted-foreground px-1 pb-1">
                                          Selecionar Tarefas Predecessoras
                                        </div>
                                        <div className="max-h-48 overflow-y-auto divide-y divide-border/40 space-y-1">
                                          {tasks
                                            .filter((t) => t.id !== task.id)
                                            .map((cand) => {
                                              const candRowNum = taskRowIndexMap.get(cand.id) || 1;
                                              const isChecked = taskDeps.includes(cand.id);

                                              return (
                                                <label
                                                  key={cand.id}
                                                  className="flex items-center space-x-2 px-2 py-1.5 hover:bg-muted/60 rounded cursor-pointer text-xs"
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                      const nextDeps = e.target.checked
                                                        ? [...taskDeps, cand.id]
                                                        : taskDeps.filter((id) => id !== cand.id);
                                                      handleUpdateTaskField(
                                                        task.id,
                                                        "dependencies",
                                                        nextDeps
                                                      );
                                                    }}
                                                    className="rounded border-border"
                                                  />
                                                  <span className="font-mono text-muted-foreground text-[10px] font-bold">
                                                    #{candRowNum}
                                                  </span>
                                                  <span className="truncate font-medium flex-1">
                                                    {cand.name}
                                                  </span>
                                                </label>
                                              );
                                            })}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </td>
                                );
                              }

                              // 6. Duration (Days)
                              if (col.key === "duration") {
                                const isEditing =
                                  activeCell?.taskId === task.id && activeCell?.field === "duration";

                                return (
                                  <td
                                    key={col.key}
                                    onClick={() => {
                                      setActiveCell({ taskId: task.id, field: "duration" });
                                      setEditingValue(String(durationDays));
                                    }}
                                    className={`px-2 py-1 border-r border-border/40 text-[11px] cursor-text ${
                                      isEditing
                                        ? "ring-2 ring-emerald-600 bg-background z-20"
                                        : ""
                                    }`}
                                  >
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min="1"
                                        autoFocus
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        onBlur={() => {
                                          const days = Math.max(1, Number(editingValue) || 1);
                                          const newEnd = addDays(parseISO(task.start_date), days - 1);
                                          handleUpdateTaskField(
                                            task.id,
                                            "end_date",
                                            format(newEnd, "yyyy-MM-dd")
                                          );
                                          setActiveCell(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            const days = Math.max(1, Number(editingValue) || 1);
                                            const newEnd = addDays(parseISO(task.start_date), days - 1);
                                            handleUpdateTaskField(
                                              task.id,
                                              "end_date",
                                              format(newEnd, "yyyy-MM-dd")
                                            );
                                            setActiveCell(null);
                                          } else if (e.key === "Escape") {
                                            setActiveCell(null);
                                          }
                                        }}
                                        className="w-full bg-transparent outline-none font-medium"
                                      />
                                    ) : (
                                      <span>{durationDays} dias</span>
                                    )}
                                  </td>
                                );
                              }

                              // 7. Effort (Hours)
                              if (col.key === "effort") {
                                const isEditing =
                                  activeCell?.taskId === task.id && activeCell?.field === "effort";

                                return (
                                  <td
                                    key={col.key}
                                    onClick={() => {
                                      setActiveCell({ taskId: task.id, field: "effort" });
                                      setEditingValue(String(task.estimated_time || 8));
                                    }}
                                    className={`px-2 py-1 border-r border-border/40 text-[11px] cursor-text ${
                                      isEditing
                                        ? "ring-2 ring-emerald-600 bg-background z-20"
                                        : ""
                                    }`}
                                  >
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min="1"
                                        autoFocus
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        onBlur={() => {
                                          const val = Math.max(1, Number(editingValue) || 8);
                                          handleUpdateTaskField(task.id, "estimated_time", val);
                                          setActiveCell(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            const val = Math.max(1, Number(editingValue) || 8);
                                            handleUpdateTaskField(task.id, "estimated_time", val);
                                            setActiveCell(null);
                                          } else if (e.key === "Escape") {
                                            setActiveCell(null);
                                          }
                                        }}
                                        className="w-full bg-transparent outline-none font-medium"
                                      />
                                    ) : (
                                      <span>{task.estimated_time || 8} h</span>
                                    )}
                                  </td>
                                );
                              }

                              // Actual Effort (Hours tracked / executed)
                              if (col.key === "actualEffort") {
                                const isEditing =
                                  activeCell?.taskId === task.id && activeCell?.field === "actualEffort";
                                const actualVal = task.actual_time || 0;

                                return (
                                  <td
                                    key={col.key}
                                    onClick={() => {
                                      setActiveCell({ taskId: task.id, field: "actualEffort" });
                                      setEditingValue(String(actualVal));
                                    }}
                                    className={`px-2 py-1 border-r border-border/40 text-[11px] cursor-text font-mono ${
                                      isEditing
                                        ? "ring-2 ring-emerald-600 bg-background z-20"
                                        : ""
                                    }`}
                                  >
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        autoFocus
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        onBlur={() => {
                                          const val = Math.max(0, Number(editingValue) || 0);
                                          handleUpdateTaskField(task.id, "actual_time", val);
                                          setActiveCell(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            const val = Math.max(0, Number(editingValue) || 0);
                                            handleUpdateTaskField(task.id, "actual_time", val);
                                            setActiveCell(null);
                                          } else if (e.key === "Escape") {
                                            setActiveCell(null);
                                          }
                                        }}
                                        className="w-full bg-transparent outline-none font-bold text-emerald-600 dark:text-emerald-400"
                                      />
                                    ) : (
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <Clock className="h-3 w-3 opacity-70" />
                                        <span>{actualVal} h</span>
                                      </span>
                                    )}
                                  </td>
                                );
                              }

                              // Variance / Saldo de Horas
                              if (col.key === "variance") {
                                const est = task.estimated_time || 0;
                                const act = task.actual_time || 0;
                                const diff = Number((act - est).toFixed(1));

                                return (
                                  <td key={col.key} className="px-2 py-1 border-r border-border/40 text-[11px]">
                                    {diff === 0 ? (
                                      <span className="text-muted-foreground font-mono text-[10px]">0.0 h</span>
                                    ) : diff > 0 ? (
                                      <Badge className="text-[10px] py-0 px-1 bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">
                                        +{diff} h
                                      </Badge>
                                    ) : (
                                      <Badge className="text-[10px] py-0 px-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                        {diff} h
                                      </Badge>
                                    )}
                                  </td>
                                );
                              }

                              // 8. Effort Remaining
                              if (col.key === "effortRemaining") {
                                const remHours = isCompleted ? 0 : task.estimated_time || 8;
                                return (
                                  <td
                                    key={col.key}
                                    className="px-2 py-1 border-r border-border/40 text-[11px] text-muted-foreground font-mono"
                                  >
                                    {remHours > 0 ? (
                                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                        {remHours} h
                                      </span>
                                    ) : (
                                      <span>-</span>
                                    )}
                                  </td>
                                );
                              }

                              // 9. Start Date
                              if (col.key === "startDate") {
                                return (
                                  <td
                                    key={col.key}
                                    className="px-2 py-1 border-r border-border/40 text-[11px]"
                                  >
                                    <input
                                      type="date"
                                      value={task.start_date}
                                      onChange={(e) =>
                                        handleUpdateTaskField(task.id, "start_date", e.target.value)
                                      }
                                      className="bg-transparent text-foreground text-[11px] outline-none cursor-pointer hover:bg-muted/50 rounded px-1"
                                    />
                                  </td>
                                );
                              }

                              // 10. Finish Date
                              if (col.key === "finishDate") {
                                return (
                                  <td
                                    key={col.key}
                                    className="px-2 py-1 border-r border-border/40 text-[11px]"
                                  >
                                    <input
                                      type="date"
                                      value={task.end_date}
                                      onChange={(e) =>
                                        handleUpdateTaskField(task.id, "end_date", e.target.value)
                                      }
                                      className="bg-transparent text-foreground text-[11px] outline-none cursor-pointer hover:bg-muted/50 rounded px-1"
                                    />
                                  </td>
                                );
                              }

                              // 11. Project
                              if (col.key === "project") {
                                return (
                                  <td
                                    key={col.key}
                                    className="px-2 py-1 border-r border-border/40 text-[11px]"
                                  >
                                    <Select
                                      value={task.project_id || "none"}
                                      onValueChange={(val) =>
                                        handleUpdateTaskField(
                                          task.id,
                                          "project_id",
                                          val === "none" ? null : val
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-6 text-[10.5px] border-none shadow-none bg-transparent hover:bg-muted/50 p-1">
                                        <SelectValue placeholder="Sem projeto" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Sem projeto</SelectItem>
                                        {projects.map((p) => (
                                          <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                );
                              }

                              // 12. Special Marker
                              if (col.key === "specialMarker") {
                                return (
                                  <td
                                    key={col.key}
                                    className="px-2 py-1 border-r border-border/40 text-[11px]"
                                  >
                                    <Select
                                      value={task.special_marker || "none"}
                                      onValueChange={(val) =>
                                        handleUpdateTaskField(
                                          task.id,
                                          "special_marker",
                                          val === "none" ? null : val
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-6 text-[10.5px] border-none shadow-none bg-transparent hover:bg-muted/50 p-1">
                                        <SelectValue placeholder="Nenhum" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Nenhum</SelectItem>
                                        <SelectItem value="Milestone">Marco de Entrega</SelectItem>
                                        <SelectItem value="Release">Release / Versão</SelectItem>
                                        <SelectItem value="Aprovação">Aprovação de Diretoria</SelectItem>
                                        <SelectItem value="Urgente">Prioridade Alta</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                );
                              }

                              // 13. Actions (Move up/down & Delete)
                              if (col.key === "actions") {
                                return (
                                  <td key={col.key} className="px-1 py-1 text-center">
                                    <div className="flex items-center justify-center space-x-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={() => handleMoveTaskOrder(task.id, "up")}
                                        className="p-0.5 hover:text-primary rounded hover:bg-muted"
                                        title="Mover para cima"
                                      >
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleMoveTaskOrder(task.id, "down")}
                                        className="p-0.5 hover:text-primary rounded hover:bg-muted"
                                        title="Mover para baixo"
                                      >
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="p-0.5 hover:text-rose-500 rounded hover:bg-rose-500/10 text-muted-foreground"
                                        title="Excluir tarefa"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                );
                              }

                              return <td key={col.key} className="px-2 py-1 border-r border-border/40">-</td>;
                            })}
                          </tr>
                        );
                      })}

                    {/* Inline Quick Add Task Button for each group */}
                    {!isGroupCollapsed && (
                      <tr className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-2 py-1.5 text-center text-muted-foreground font-mono text-[11px] border-r border-border/40">
                          +
                        </td>
                        <td
                          colSpan={activeColumns.length - 1}
                          className="px-3 py-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => handleCreateInlineTask(group.project?.id || null)}
                            className="flex items-center space-x-1.5 text-xs text-primary hover:text-primary/80 font-medium cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Adicionar nova tarefa...</span>
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Modals & Dialogs */}

      {/* 1. Modal: Novo / Editar Projeto */}
      <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              <span>{editingProject ? "Editar Projeto" : "Cadastrar Novo Projeto"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingProject
                ? "Atualize as informações do projeto selecionado."
                : "Defina o nome, prazos e categoria estratégica do novo projeto."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome do Projeto *</Label>
              <Input
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="Ex: Expansão de Infraestrutura"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descrição</Label>
              <Textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Objetivos e escopo principal..."
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data de Início</Label>
                <Input
                  type="date"
                  value={projectForm.start_date}
                  onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data de Término</Label>
                <Input
                  type="date"
                  value={projectForm.end_date}
                  onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Categoria Estratégica</Label>
                <Select
                  value={projectForm.categoria_estrategica}
                  onValueChange={(val) => setProjectForm({ ...projectForm, categoria_estrategica: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Estratégico">Estratégico</SelectItem>
                    <SelectItem value="Produto">Produto</SelectItem>
                    <SelectItem value="Infraestrutura">Infraestrutura</SelectItem>
                    <SelectItem value="Inovação">Inovação</SelectItem>
                    <SelectItem value="Operacional">Operacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Marcador Especial</Label>
                <Select
                  value={projectForm.special_marker}
                  onValueChange={(val) => setProjectForm({ ...projectForm, special_marker: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="major_release">Major Release</SelectItem>
                    <SelectItem value="major_deployment">Deploy Crítico</SelectItem>
                    <SelectItem value="major_theme">Iniciativa Chave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewProjectOpen(false)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveProject} className="text-xs h-8">
              {editingProject ? "Salvar Alterações" : "Criar Projeto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Modal: Gerenciar Projetos */}
      <Dialog open={isManageProjectsOpen} onOpenChange={setIsManageProjectsOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <span>Gerenciamento de Projetos</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Visualize, edite ou exclua projetos cadastrados no sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto my-2 border border-border rounded-md">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/70 text-muted-foreground sticky top-0 text-[10.5px] uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="p-2.5">Nome</th>
                  <th className="p-2.5">Categoria</th>
                  <th className="p-2.5">Início / Fim</th>
                  <th className="p-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      Nenhum projeto cadastrado.
                    </td>
                  </tr>
                ) : (
                  projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-2.5 font-medium text-foreground">
                        <div className="font-semibold">{proj.name}</div>
                        {proj.description && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                            {proj.description}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {proj.categoria_estrategica || "Geral"}
                        </Badge>
                      </td>
                      <td className="p-2.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                        {proj.start_date || "-"} a {proj.end_date || "-"}
                      </td>
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsManageProjectsOpen(false);
                              handleOpenEditProject(proj);
                            }}
                            className="h-7 w-7 p-0 hover:text-primary"
                            title="Editar projeto"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProject(proj.id)}
                            className="h-7 w-7 p-0 hover:text-destructive text-muted-foreground"
                            title="Excluir projeto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsManageProjectsOpen(false);
                setEditingProject(null);
                setProjectForm({
                  name: "",
                  description: "",
                  start_date: new Date().toISOString().split("T")[0],
                  end_date: addDays(new Date(), 30).toISOString().split("T")[0],
                  categoria_estrategica: "Estratégico",
                  special_marker: "none",
                });
                setIsNewProjectOpen(true);
              }}
              className="text-xs h-8 gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Novo Projeto</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsManageProjectsOpen(false)}
              className="text-xs h-8"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectGridSheet;
