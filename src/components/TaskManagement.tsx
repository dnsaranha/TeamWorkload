import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import {
  CalendarIcon,
  Edit,
  Plus,
  Trash2,
  Filter,
  Download,
  Upload,
  X,
  Grid3X3,
  Info,
} from "lucide-react";
import * as XLSX from "xlsx";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  taskService,
  projectService,
  employeeService,
  type Task,
  type Project,
  type Employee,
} from "@/lib/supabaseClient";

type TaskWithRelations = Task & {
  project: Project | null;
  assigned_employee: Employee | null;
};

const TaskManagement = () => {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filters, setFilters] = useState({
    project: "all",
    employee: "all",
    status: "all",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [isAssignTaskDialogOpen, setIsAssignTaskDialogOpen] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isDragDropGridOpen, setIsDragDropGridOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskWithRelations | null>(
    null,
  );

  const [newTask, setNewTask] = useState({
    name: "",
    description: "",
    estimated_time: 0,
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    project_id: "none",
    assigned_employee_id: "none",
    status: "pending" as "pending" | "in_progress" | "completed",
    completion_date: "",
    repeats_weekly: false,
    repeat_days: [] as string[],
    hours_per_day: 0,
    special_marker: "none",
  });

  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    categoria_estrategica: "",
  });

  // Strategic categories for projects
  const [strategicCategories, setStrategicCategories] = useState<string[]>([]);

  // Load existing strategic categories
  useEffect(() => {
    loadStrategicCategories();
  }, []);

  const loadStrategicCategories = async () => {
    try {
      const projectsData = await projectService.getAll();
      const categories = projectsData
        .map((p) => p.categoria_estrategica)
        .filter(
          (cat): cat is string =>
            cat !== null && cat !== undefined && cat !== "",
        )
        .filter((cat, index, arr) => arr.indexOf(cat) === index); // Remove duplicates
      setStrategicCategories(categories);
    } catch (error) {
      console.error("Error loading strategic categories:", error);
    }
  };

  // Load data from database
  useEffect(() => {
    loadData();
  }, []);

  // Effect to automatically calculate estimated_time for new task
  useEffect(() => {
    if (newTask.repeats_weekly) {
      const calculatedHours =
        (newTask.repeat_days?.length || 0) * (newTask.hours_per_day || 0);
      setNewTask((prev) => ({ ...prev, estimated_time: calculatedHours }));
    }
  }, [newTask.repeats_weekly, newTask.repeat_days, newTask.hours_per_day]);

  // Effect to automatically calculate estimated_time for editing task
  useEffect(() => {
    if (currentTask?.repeats_weekly) {
      const calculatedHours =
        (currentTask.repeat_days?.length || 0) *
        (currentTask.hours_per_day || 0);
      setCurrentTask((prev) =>
        prev ? { ...prev, estimated_time: calculatedHours } : null,
      );
    }
  }, [
    currentTask?.repeats_weekly,
    currentTask?.repeat_days,
    currentTask?.hours_per_day,
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, projectsData, employeesData] = await Promise.all([
        taskService.getAll(),
        projectService.getAll(),
        employeeService.getAll(),
      ]);

      setTasks(tasksData as TaskWithRelations[]);
      setProjects(projectsData);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    try {
      const taskData = {
        name: newTask.name,
        description: newTask.description,
        estimated_time: newTask.estimated_time,
        start_date: newTask.start_date,
        end_date: newTask.end_date,
        project_id:
          newTask.project_id === "none" ? null : newTask.project_id || null,
        assigned_employee_id:
          newTask.assigned_employee_id === "none"
            ? null
            : newTask.assigned_employee_id || null,
        status: newTask.status,
        completion_date:
          newTask.status === "completed" && newTask.completion_date
            ? newTask.completion_date
            : null,
        repeats_weekly: newTask.repeats_weekly,
        repeat_days: newTask.repeats_weekly ? newTask.repeat_days : null,
        hours_per_day: newTask.repeats_weekly ? newTask.hours_per_day : null,
        special_marker:
          newTask.special_marker === "none" ? null : newTask.special_marker,
      };

      const createdTask = await taskService.create(taskData);
      setTasks([createdTask as TaskWithRelations, ...tasks]);

      setNewTask({
        name: "",
        description: "",
        estimated_time: 0,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        project_id: "none",
        assigned_employee_id: "none",
        status: "pending" as "pending" | "in_progress" | "completed",
        completion_date: "",
        repeats_weekly: false,
        repeat_days: [] as string[],
        hours_per_day: 0,
        special_marker: "none",
      });
      setIsNewTaskDialogOpen(false);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleUpdateTask = async () => {
    if (!currentTask) return;

    try {
      const updateData: any = {
        name: currentTask.name,
        description: currentTask.description || null,
        estimated_time: currentTask.estimated_time,
        start_date: currentTask.start_date,
        end_date: currentTask.end_date,
        project_id:
          currentTask.project_id === "none" ? null : currentTask.project_id,
        assigned_employee_id:
          currentTask.assigned_employee_id === "none"
            ? null
            : currentTask.assigned_employee_id,
        status: currentTask.status,
        completion_date:
          currentTask.status === "completed" && currentTask.completion_date
            ? currentTask.completion_date
            : null,
        repeats_weekly: currentTask.repeats_weekly || false,
        repeat_days: currentTask.repeats_weekly
          ? currentTask.repeat_days
          : null,
        hours_per_day: currentTask.repeats_weekly
          ? currentTask.hours_per_day
          : null,
        special_marker:
          currentTask.special_marker === "none"
            ? null
            : currentTask.special_marker,
      };

      const updatedTask = await taskService.update(currentTask.id, updateData);

      const updatedTasks = tasks.map((task) =>
        task.id === currentTask.id ? (updatedTask as TaskWithRelations) : task,
      );

      setTasks(updatedTasks);
      setCurrentTask(null);
      setIsEditTaskDialogOpen(false);
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Erro ao atualizar tarefa. Verifique os dados e tente novamente.");
    }
  };

  const handleExceptionChange = (index: number, field: string, value: any) => {
    if (!currentTask) return;

    const updatedExceptions = [...(currentTask.exceptions || [])];
    updatedExceptions[index] = { ...updatedExceptions[index], [field]: value };

    // Se a data for alterada, garantir que é única
    if (field === "date") {
      const isDuplicate = updatedExceptions.some(
        (exception, i) => i !== index && exception.date === value,
      );
      if (isDuplicate) {
        alert("Já existe uma exceção para esta data. Escolha outra data.");
        return; // Impede a atualização se a data for duplicada
      }
    }

    setCurrentTask({
      ...currentTask,
      exceptions: updatedExceptions,
    });
  };

  const handleAddException = () => {
    if (!currentTask) return;

    // Encontrar uma data que ainda não tenha exceção
    let newExceptionDate = new Date();
    const existingDates = (currentTask.exceptions || []).map((ex) => ex.date);
    while (
      existingDates.includes(newExceptionDate.toISOString().split("T")[0])
    ) {
      newExceptionDate.setDate(newExceptionDate.getDate() + 1);
    }

    const newException = {
      date: newExceptionDate.toISOString().split("T")[0],
      estimated_hours: currentTask.hours_per_day,
      assigned_employee_id: currentTask.assigned_employee_id,
      completed: false,
      removed: false,
    };

    setCurrentTask({
      ...currentTask,
      exceptions: [...(currentTask.exceptions || []), newException],
    });
  };

  const handleRemoveException = (index: number) => {
    if (!currentTask) return;

    const updatedExceptions = [...(currentTask.exceptions || [])];
    updatedExceptions.splice(index, 1);

    setCurrentTask({
      ...currentTask,
      exceptions: updatedExceptions,
    });
  };

  const handleAssignTask = async () => {
    if (!currentTask) return;

    try {
      const updatedTask = await taskService.update(currentTask.id, {
        assigned_employee_id:
          currentTask.assigned_employee_id === "none"
            ? null
            : currentTask.assigned_employee_id,
      });

      const updatedTasks = tasks.map((task) =>
        task.id === currentTask.id ? (updatedTask as TaskWithRelations) : task,
      );

      setTasks(updatedTasks);
      setIsAssignTaskDialogOpen(false);
    } catch (error) {
      console.error("Error assigning task:", error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await taskService.delete(id);
      setTasks(tasks.filter((task) => task.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleCreateProject = async () => {
    try {
      const createdProject = await projectService.create(newProject);
      setProjects([...projects, createdProject]);

      // Update strategic categories if a new one was added
      if (
        newProject.categoria_estrategica &&
        !strategicCategories.includes(newProject.categoria_estrategica)
      ) {
        setStrategicCategories([
          ...strategicCategories,
          newProject.categoria_estrategica,
        ]);
      }

      setNewProject({
        name: "",
        description: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        categoria_estrategica: "",
      });
      setIsNewProjectDialogOpen(false);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const openEditDialog = (task: TaskWithRelations) => {
    setCurrentTask(task);
    setIsEditTaskDialogOpen(true);
  };

  const openAssignDialog = (task: TaskWithRelations) => {
    setCurrentTask(task);
    setIsAssignTaskDialogOpen(true);
  };

  // Helper function to handle repeat day changes
  const handleRepeatDayChange = (day: string, checked: boolean) => {
    if (checked) {
      setNewTask({
        ...newTask,
        repeat_days: [...newTask.repeat_days, day],
      });
    } else {
      setNewTask({
        ...newTask,
        repeat_days: newTask.repeat_days.filter((d) => d !== day),
      });
    }
  };

  const handleCurrentTaskRepeatDayChange = (day: string, checked: boolean) => {
    if (!currentTask) return;
    const currentDays = currentTask.repeat_days || [];
    if (checked) {
      setCurrentTask({
        ...currentTask,
        repeat_days: [...currentDays, day],
      });
    } else {
      setCurrentTask({
        ...currentTask,
        repeat_days: currentDays.filter((d) => d !== day),
      });
    }
  };

  // Filter tasks based on selected filters
  const filteredTasks = tasks.filter((task) => {
    const projectMatch =
      filters.project === "all" || task.project_id === filters.project;
    const employeeMatch =
      filters.employee === "all" ||
      task.assigned_employee_id === filters.employee;
    const statusMatch =
      filters.status === "all" ||
      (filters.status === "assigned" && task.assigned_employee_id) ||
      (filters.status === "unassigned" && !task.assigned_employee_id) ||
      (filters.status === "completed" &&
        new Date(task.end_date) < new Date()) ||
      (filters.status === "active" &&
        new Date(task.start_date) <= new Date() &&
        new Date(task.end_date) >= new Date());

    const searchMatch =
      !searchTerm ||
      searchTerm
        .toLowerCase()
        .split(" ")
        .every((word) => {
          const taskText = `
            ${task.name}
            ${task.description || ""}
            ${task.project?.name || ""}
            ${task.assigned_employee?.name || ""}
          `.toLowerCase();
          return taskText.includes(word);
        });

    return projectMatch && employeeMatch && statusMatch && searchMatch;
  });

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredTasks.map((task) => ({
      "Task ID": task.id,
      "Task Name": task.name,
      Description: task.description || "",
      "Project ID": task.project_id,
      Project: task.project?.name || "No project",
      "Strategic Category": task.project?.categoria_estrategica || "",
      "Assigned To ID": task.assigned_employee_id,
      "Assigned To": task.assigned_employee?.name || "Unassigned",
      "Estimated Hours": task.estimated_time,
      "Start Date": task.start_date,
      "End Date": task.end_date,
      "Repeats Weekly": task.repeats_weekly ? "Yes" : "No",
      "Repeat Days": task.repeat_days?.join(", ") || "",
      "Hours per Day": task.hours_per_day || "",
      "Created At": new Date(task.created_at).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(
      wb,
      `tasks_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  // Import from Excel
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Process imported data and create/update tasks
        jsonData.forEach(async (row: any) => {
          if (row["Task Name"]) {
            try {
              const repeatsWeekly =
                row["Repeats Weekly"]?.toLowerCase() === "yes";
              const repeatDays = repeatsWeekly
                ? row["Repeat Days"]?.split(",").map((d: string) => d.trim()) ||
                  []
                : null;
              const hoursPerDay = repeatsWeekly
                ? Number(row["Hours per Day"]) || 0
                : null;

              let projectId = row["Project ID"];
              if (!projectId && row["Project"]) {
                const project = projects.find((p) => p.name === row["Project"]);
                if (project) {
                  projectId = project.id;
                }
              }

              let employeeId = row["Assigned To ID"];
              if (!employeeId && row["Assigned To"]) {
                const employee = employees.find(
                  (e) => e.name === row["Assigned To"],
                );
                if (employee) {
                  employeeId = employee.id;
                }
              }

              const taskData: any = {
                name: row["Task Name"],
                description: row["Description"] || "",
                estimated_time: Number(row["Estimated Hours"]) || 1,
                start_date:
                  row["Start Date"] || new Date().toISOString().split("T")[0],
                end_date:
                  row["End Date"] || new Date().toISOString().split("T")[0],
                project_id: projectId || null,
                assigned_employee_id: employeeId || null,
                status: "pending",
                completion_date: null,
                repeats_weekly: repeatsWeekly,
                repeat_days: repeatDays,
                hours_per_day: hoursPerDay,
              };

              if (row["Task ID"]) {
                taskData.id = row["Task ID"];
              }

              const upsertedTask = await taskService.upsert(taskData);

              setTasks((prev) => {
                const existingTaskIndex = prev.findIndex(
                  (t) => t.id === upsertedTask.id,
                );
                if (existingTaskIndex > -1) {
                  const newTasks = [...prev];
                  newTasks[existingTaskIndex] =
                    upsertedTask as TaskWithRelations;
                  return newTasks;
                } else {
                  return [upsertedTask as TaskWithRelations, ...prev];
                }
              });
            } catch (error) {
              console.error("Error importing task:", error);
            }
          }
        });

        alert("Import completed!");
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Error reading file. Please make sure it's a valid Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const clearFilters = () => {
    setFilters({
      project: "all",
      employee: "all",
      status: "all",
    });
  };

  // Drag and Drop Grid Components
  const DraggableTask = ({ task }: { task: TaskWithRelations }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: "task",
      item: { task },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }));

    return (
      <div
        ref={drag}
        className={`p-2 mb-2 bg-blue-50 border border-blue-200 rounded cursor-move transition-opacity ${
          isDragging ? "opacity-50" : "opacity-100"
        }`}
      >
        <div className="font-medium text-sm text-blue-900 truncate">
          {task.name}
        </div>
        <div className="text-xs text-blue-600">
          {task.estimated_time}h - {task.project?.name || "No project"}
        </div>
      </div>
    );
  };

  const DroppableCell = ({
    date,
    employee,
    tasks,
  }: {
    date: string;
    employee: Employee;
    tasks: TaskWithRelations[];
  }) => {
    const [{ isOver }, drop] = useDrop(() => ({
      accept: "task",
      drop: (item: { task: TaskWithRelations }) => {
        handleTaskDrop(item.task, employee.id, date);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }));

    const [editingTask, setEditingTask] = useState<string | null>(null);
    const [tempStartDate, setTempStartDate] = useState("");
    const [tempEndDate, setTempEndDate] = useState("");

    const cellTasks = tasks.filter((task) => {
      if (task.assigned_employee_id !== employee.id) {
        return false;
      }

      // Important: Use T00:00:00Z to parse dates as UTC and avoid timezone shifts.
      const cellDate = new Date(date + "T00:00:00Z");
      const startDate = new Date(task.start_date + "T00:00:00Z");
      const endDate = new Date(task.end_date + "T00:00:00Z");

      // 1. Check if the cell's date is within the task's overall start/end range
      if (cellDate < startDate || cellDate > endDate) {
        return false;
      }

      const cellDayOfWeekJs = cellDate.getUTCDay(); // Use UTC day to be consistent
      const dayNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const cellDayName = dayNames[cellDayOfWeekJs];

      // 2. For repeating tasks, visibility is strictly determined by repeat_days
      if (task.repeats_weekly) {
        return (
          Array.isArray(task.repeat_days) &&
          task.repeat_days.includes(cellDayName)
        );
      }

      // 3. For non-repeating tasks, hide on non-working days for the employee
      const employeeWorkDays = employee.dias_de_trabalho || [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ];
      if (!employeeWorkDays.includes(cellDayName)) {
        return false;
      }

      // If all checks pass for a non-repeating task, show it
      return true;
    });

    const totalHours = cellTasks.reduce((sum, task) => {
      const startDate = new Date(task.start_date);
      const endDate = new Date(task.end_date);
      const daysDiff = Math.max(
        1,
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1,
      );
      return sum + task.estimated_time / daysDiff;
    }, 0);

    const dailyCapacity = employee.weekly_hours / 5;
    const percentage = (totalHours / dailyCapacity) * 100;

    const getWorkloadColor = (percentage: number) => {
      if (percentage > 100) return "bg-red-100 border-red-300";
      if (percentage >= 50) return "bg-yellow-100 border-yellow-300";
      return "bg-green-100 border-green-300";
    };

    const handleEditTask = (task: TaskWithRelations) => {
      setEditingTask(task.id);
      setTempStartDate(task.start_date);
      setTempEndDate(task.end_date);
    };

    const handleSaveTaskDates = async (taskId: string) => {
      try {
        const updatedTask = await taskService.update(taskId, {
          start_date: tempStartDate,
          end_date: tempEndDate,
        });

        const updatedTasks = tasks.map((t) =>
          t.id === taskId ? (updatedTask as TaskWithRelations) : t,
        );

        setTasks(updatedTasks);
        setEditingTask(null);
      } catch (error) {
        console.error("Error updating task dates:", error);
      }
    };

    const handleCancelEdit = () => {
      setEditingTask(null);
      setTempStartDate("");
      setTempEndDate("");
    };

    return (
      <div
        ref={drop}
        className={`min-h-[100px] p-2 border-2 border-dashed transition-colors ${
          isOver ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
        } ${getWorkloadColor(percentage)}`}
      >
        <div className="text-xs text-gray-600 mb-1">
          {totalHours.toFixed(1)}h ({percentage.toFixed(0)}%)
        </div>
        <div className="space-y-1">
          {cellTasks.map((task) => (
            <div key={task.id}>
              {editingTask === task.id ? (
                <div className="text-xs p-2 bg-white border border-blue-300 rounded space-y-2">
                  <div className="font-medium truncate text-blue-900">
                    {task.name}
                  </div>
                  <div className="space-y-1">
                    <div>
                      <Label className="text-xs text-gray-600">Início:</Label>
                      <Input
                        type="date"
                        value={tempStartDate}
                        onChange={(e) => setTempStartDate(e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Fim:</Label>
                      <Input
                        type="date"
                        value={tempEndDate}
                        onChange={(e) => setTempEndDate(e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 mt-1">
                    <Button
                      size="sm"
                      onClick={() => handleSaveTaskDates(task.id)}
                      className="h-6 px-2 text-xs flex-1"
                    >
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="h-6 px-2 text-xs flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-xs p-1 bg-white border border-gray-300 rounded truncate cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  onClick={() => handleEditTask(task)}
                >
                  <div className="font-medium truncate">{task.name}</div>
                  <div className="text-gray-500">{task.estimated_time}h</div>
                  <div className="text-xs text-gray-400">
                    {format(new Date(task.start_date + "T00:00:00"), "dd/MM")} -{" "}
                    {format(new Date(task.end_date + "T00:00:00"), "dd/MM")}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleTaskDrop = async (
    task: TaskWithRelations,
    employeeId: string,
    date: string,
  ) => {
    try {
      const updatedTask = await taskService.update(task.id, {
        assigned_employee_id: employeeId,
        start_date: date,
        end_date: date, // For simplicity, setting end date same as start date
      });

      const updatedTasks = tasks.map((t) =>
        t.id === task.id ? (updatedTask as TaskWithRelations) : t,
      );

      setTasks(updatedTasks);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const getWeekDates = (startDate: Date) => {
    const dates = [];
    const start = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
      ),
    );
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }
    return dates;
  };

  const [gridStartDate, setGridStartDate] = useState(() => {
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    const date = today.getUTCDate();
    const day = today.getUTCDay();
    // Calculate Monday of the current week in UTC
    const mondayUTCDate = new Date(
      Date.UTC(year, month, date - day + (day === 0 ? -6 : 1)),
    );
    return mondayUTCDate;
  });

  const weekDates = getWeekDates(gridStartDate);
  const unassignedTasks = tasks.filter((task) => !task.assigned_employee_id);

  return (
    <div className="bg-background p-6 w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Task Management</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter size={16} />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={exportToExcel}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsDragDropGridOpen(true)}
            className="flex items-center gap-2"
          >
            <Grid3X3 size={16} />
            Drag & Drop Grid
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="file-import"
            />
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => document.getElementById("file-import")?.click()}
            >
              <Upload size={16} />
              Import
            </Button>
          </div>
          <Dialog
            open={isNewProjectDialogOpen}
            onOpenChange={setIsNewProjectDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Plus size={16} />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new project to organize your tasks.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="project-name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="project-name"
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="project-description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="project-description"
                    value={newProject.description}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        description: e.target.value,
                      })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="project-start-date" className="text-right">
                    Start Date
                  </Label>
                  <Input
                    id="project-start-date"
                    type="date"
                    value={newProject.start_date}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        start_date: e.target.value,
                      })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="project-end-date" className="text-right">
                    End Date
                  </Label>
                  <Input
                    id="project-end-date"
                    type="date"
                    value={newProject.end_date}
                    onChange={(e) =>
                      setNewProject({ ...newProject, end_date: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="project-categoria" className="text-right">
                    Categoria Estratégica
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="project-categoria"
                      list="strategic-categories"
                      value={newProject.categoria_estrategica}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          categoria_estrategica: e.target.value,
                        })
                      }
                      placeholder="Digite ou selecione uma categoria"
                      className="w-full"
                    />
                    <datalist id="strategic-categories">
                      {strategicCategories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateProject}>
                  Create Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog
            open={isNewTaskDialogOpen}
            onOpenChange={setIsNewTaskDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                className="flex items-center gap-2"
                data-testid="create-new-task-button"
              >
                <Plus size={16} />
                Create New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Add a new task with details and time estimates.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-96">
                <div className="grid gap-4 p-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Task Name
                    </Label>
                    <Input
                      id="name"
                      value={newTask.name}
                      onChange={(e) =>
                        setNewTask({ ...newTask, name: e.target.value })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) =>
                        setNewTask({ ...newTask, description: e.target.value })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="estimatedTime" className="text-right">
                      Est. Hours
                    </Label>
                    <Input
                      id="estimated_time"
                      type="number"
                      value={newTask.estimated_time}
                      readOnly={newTask.repeats_weekly}
                      onChange={(e) =>
                        !newTask.repeats_weekly &&
                        setNewTask({
                          ...newTask,
                          estimated_time: Number(e.target.value),
                        })
                      }
                      className={`col-span-3 ${
                        newTask.repeats_weekly
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="startDate" className="text-right">
                      Start Date
                    </Label>
                    <div className="col-span-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Input
                            id="startDate"
                            type="date"
                            value={newTask.start_date}
                            onChange={(e) =>
                              setNewTask({
                                ...newTask,
                                start_date: e.target.value,
                              })
                            }
                            className="w-full"
                          />
                        </PopoverTrigger>
                      </Popover>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="endDate" className="text-right">
                      End Date
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="endDate"
                        type="date"
                        value={newTask.end_date}
                        onChange={(e) =>
                          setNewTask({ ...newTask, end_date: e.target.value })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="project" className="text-right">
                      Project
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setNewTask({ ...newTask, project_id: value })
                      }
                      value={newTask.project_id}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="assigned_employee" className="text-right">
                      Responsável
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setNewTask({ ...newTask, assigned_employee_id: value })
                      }
                      value={newTask.assigned_employee_id}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não atribuído</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">
                      Status
                    </Label>
                    <Select
                      onValueChange={(
                        value: "pending" | "in_progress" | "completed",
                      ) => setNewTask({ ...newTask, status: value })}
                      value={newTask.status}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">
                          Em Andamento
                        </SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newTask.status === "completed" && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="completion_date" className="text-right">
                        Data de Conclusão
                      </Label>
                      <Input
                        id="completion_date"
                        type="date"
                        value={newTask.completion_date}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            completion_date: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="special_marker" className="text-right">
                      Marcador Especial
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setNewTask({ ...newTask, special_marker: value })
                      }
                      value={newTask.special_marker}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecione um marcador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        <SelectItem value="major_release">
                          Major Release
                        </SelectItem>
                        <SelectItem value="major_deployment">
                          Major Deployment
                        </SelectItem>
                        <SelectItem value="major_theme">Major Theme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="repeats_weekly" className="text-right">
                      Repetição Semanal
                    </Label>
                    <div className="col-span-3 flex items-center space-x-2">
                      <input
                        id="repeats_weekly"
                        type="checkbox"
                        checked={newTask.repeats_weekly}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            repeats_weekly: e.target.checked,
                            repeat_days: e.target.checked
                              ? newTask.repeat_days
                              : [],
                            hours_per_day: e.target.checked
                              ? newTask.hours_per_day
                              : 0,
                          })
                        }
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <Label htmlFor="repeats_weekly" className="text-sm">
                        Esta tarefa se repete semanalmente
                      </Label>
                    </div>
                  </div>
                  {newTask.repeats_weekly && (
                    <>
                      <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">
                          Dias da Semana
                        </Label>
                        <div className="col-span-3 grid grid-cols-2 gap-2">
                          {[
                            { value: "monday", label: "Segunda" },
                            { value: "tuesday", label: "Terça" },
                            { value: "wednesday", label: "Quarta" },
                            { value: "thursday", label: "Quinta" },
                            { value: "friday", label: "Sexta" },
                            { value: "saturday", label: "Sábado" },
                            { value: "sunday", label: "Domingo" },
                          ].map((day) => (
                            <div
                              key={day.value}
                              className="flex items-center space-x-2"
                            >
                              <input
                                id={`day-${day.value}`}
                                type="checkbox"
                                checked={newTask.repeat_days.includes(
                                  day.value,
                                )}
                                onChange={(e) =>
                                  handleRepeatDayChange(
                                    day.value,
                                    e.target.checked,
                                  )
                                }
                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                              />
                              <Label
                                htmlFor={`day-${day.value}`}
                                className="text-sm"
                              >
                                {day.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="hours_per_day" className="text-right">
                          Horas por Dia
                        </Label>
                        <Input
                          id="hours_per_day"
                          type="number"
                          min="0"
                          step="0.5"
                          value={newTask.hours_per_day}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              hours_per_day: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="col-span-3"
                          placeholder="Ex: 2.5"
                        />
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateTask}>
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filters</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                <X size={16} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="project-filter">Project</Label>
                <Select
                  value={filters.project}
                  onValueChange={(value) =>
                    setFilters({ ...filters, project: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <Input
                      placeholder="Search projects..."
                      value={projectSearchTerm}
                      onChange={(e) => setProjectSearchTerm(e.target.value)}
                      className="w-full mb-2"
                    />
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects
                      .filter((project) =>
                        project.name
                          .toLowerCase()
                          .includes(projectSearchTerm.toLowerCase()),
                      )
                      .map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="employee-filter">Employee</Label>
                <Select
                  value={filters.employee}
                  onValueChange={(value) =>
                    setFilters({ ...filters, employee: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters({ ...filters, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Active Filters Display */}
            <div className="flex flex-wrap gap-2 mt-4">
              {filters.project !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Project:{" "}
                  {projects.find((p) => p.id === filters.project)?.name}
                  <X
                    size={12}
                    className="cursor-pointer"
                    onClick={() => setFilters({ ...filters, project: "all" })}
                  />
                </Badge>
              )}
              {filters.employee !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Employee:{" "}
                  {employees.find((e) => e.id === filters.employee)?.name}
                  <X
                    size={12}
                    className="cursor-pointer"
                    onClick={() => setFilters({ ...filters, employee: "all" })}
                  />
                </Badge>
              )}
              {filters.status !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filters.status}
                  <X
                    size={12}
                    className="cursor-pointer"
                    onClick={() => setFilters({ ...filters, status: "all" })}
                  />
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Task List</CardTitle>
            <div className="text-sm text-muted-foreground">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Est. Hours</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    {tasks.length === 0
                      ? "No tasks found"
                      : "No tasks match the current filters"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell>{task.project?.name || "No project"}</TableCell>
                    <TableCell>{task.estimated_time}h</TableCell>
                    <TableCell>
                      {format(new Date(task.start_date + "T00:00:00"), "MMM d")}{" "}
                      -{" "}
                      {format(
                        new Date(task.end_date + "T00:00:00"),
                        "MMM d, yyyy",
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          task.status === "completed"
                            ? "default"
                            : task.status === "in_progress"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {task.status === "pending"
                          ? "Pendente"
                          : task.status === "in_progress"
                            ? "Em Andamento"
                            : "Concluída"}
                      </Badge>
                      {task.status === "completed" && task.completion_date && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Concluída em{" "}
                          {format(new Date(task.completion_date), "dd/MM/yyyy")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.assigned_employee?.name || (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignDialog(task)}
                        >
                          Assign
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(task)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Edit Task Dialog */}
      <Dialog
        open={isEditTaskDialogOpen}
        onOpenChange={setIsEditTaskDialogOpen}
      >
        <DialogContent className="sm:max-w-[700px] w-[740px] container">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details and time estimates.
            </DialogDescription>
          </DialogHeader>
          {currentTask && (
            <ScrollArea className="max-h-[75vh]">
              <div className="grid gap-4 p-4">
                <div className="min-h-[600px]">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-name" className="text-right">
                        Task Name
                      </Label>
                      <Input
                        id="edit-name"
                        value={currentTask.name}
                        onChange={(e) =>
                          setCurrentTask({
                            ...currentTask,
                            name: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-description" className="text-right">
                        Description
                      </Label>
                      <Textarea
                        id="edit-description"
                        value={currentTask.description || ""}
                        onChange={(e) =>
                          setCurrentTask({
                            ...currentTask,
                            description: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="edit-estimatedTime"
                        className="text-right"
                      >
                        Est. Hours
                      </Label>
                      <Input
                        id="edit-estimated_time"
                        type="number"
                        value={currentTask.estimated_time}
                        readOnly={currentTask.repeats_weekly}
                        onChange={(e) =>
                          !currentTask.repeats_weekly &&
                          setCurrentTask({
                            ...currentTask,
                            estimated_time: Number(e.target.value),
                          })
                        }
                        className={`col-span-3 ${
                          currentTask.repeats_weekly
                            ? "bg-gray-100 cursor-not-allowed"
                            : ""
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-startDate" className="text-right">
                        Start Date
                      </Label>
                      <div className="col-span-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(
                                new Date(currentTask.start_date + "T00:00:00"),
                                "PPP",
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={
                                new Date(currentTask.start_date + "T00:00:00")
                              }
                              onSelect={(date) =>
                                date &&
                                setCurrentTask({
                                  ...currentTask,
                                  start_date: date.toISOString().split("T")[0],
                                })
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-endDate" className="text-right">
                        End Date
                      </Label>
                      <div className="col-span-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(
                                new Date(currentTask.end_date + "T00:00:00"),
                                "PPP",
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={
                                new Date(currentTask.end_date + "T00:00:00")
                              }
                              onSelect={(date) =>
                                date &&
                                setCurrentTask({
                                  ...currentTask,
                                  end_date: date.toISOString().split("T")[0],
                                })
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-project" className="text-right">
                        Project
                      </Label>
                      <Select
                        onValueChange={(value) =>
                          setCurrentTask({ ...currentTask, project_id: value })
                        }
                        value={currentTask.project_id || "none"}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No project</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-status" className="text-right">
                        Status
                      </Label>
                      <Select
                        onValueChange={(
                          value: "pending" | "in_progress" | "completed",
                        ) => setCurrentTask({ ...currentTask, status: value })}
                        value={currentTask.status}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="in_progress">
                            Em Andamento
                          </SelectItem>
                          <SelectItem value="completed">Concluída</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {currentTask.status === "completed" && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label
                          htmlFor="edit-completion_date"
                          className="text-right"
                        >
                          Data de Conclusão
                        </Label>
                        <Input
                          id="edit-completion_date"
                          type="date"
                          value={currentTask.completion_date || ""}
                          onChange={(e) =>
                            setCurrentTask({
                              ...currentTask,
                              completion_date: e.target.value,
                            })
                          }
                          className="col-span-3"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="edit-special_marker"
                        className="text-right"
                      >
                        Marcador Especial
                      </Label>
                      <Select
                        onValueChange={(value) =>
                          setCurrentTask({
                            ...currentTask,
                            special_marker: value,
                          })
                        }
                        value={currentTask.special_marker || "none"}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione um marcador" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="major_release">
                            Major Release
                          </SelectItem>
                          <SelectItem value="major_deployment">
                            Major Deployment
                          </SelectItem>
                          <SelectItem value="major_theme">
                            Major Theme
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="edit-repeats_weekly"
                        className="text-right"
                      >
                        Repetição Semanal
                      </Label>
                      <div className="col-span-3 flex items-center space-x-2">
                        <input
                          id="edit-repeats_weekly"
                          type="checkbox"
                          checked={currentTask.repeats_weekly || false}
                          onChange={(e) =>
                            setCurrentTask({
                              ...currentTask,
                              repeats_weekly: e.target.checked,
                              repeat_days: e.target.checked
                                ? currentTask.repeat_days || []
                                : null,
                              hours_per_day: e.target.checked
                                ? currentTask.hours_per_day || 0
                                : null,
                            })
                          }
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <Label
                          htmlFor="edit-repeats_weekly"
                          className="text-sm"
                        >
                          Esta tarefa se repete semanalmente
                        </Label>
                      </div>
                    </div>
                    {currentTask.repeats_weekly && (
                      <>
                        <div className="grid grid-cols-4 items-start gap-4">
                          <Label className="text-right pt-2">
                            Dias da Semana
                          </Label>
                          <div className="col-span-3 grid grid-cols-2 gap-2">
                            {[
                              { value: "monday", label: "Segunda" },
                              { value: "tuesday", label: "Terça" },
                              { value: "wednesday", label: "Quarta" },
                              { value: "thursday", label: "Quinta" },
                              { value: "friday", label: "Sexta" },
                              { value: "saturday", label: "Sábado" },
                              { value: "sunday", label: "Domingo" },
                            ].map((day) => (
                              <div
                                key={day.value}
                                className="flex items-center space-x-2"
                              >
                                <input
                                  id={`edit-day-${day.value}`}
                                  type="checkbox"
                                  checked={(
                                    currentTask.repeat_days || []
                                  ).includes(day.value)}
                                  onChange={(e) =>
                                    handleCurrentTaskRepeatDayChange(
                                      day.value,
                                      e.target.checked,
                                    )
                                  }
                                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                />
                                <Label
                                  htmlFor={`edit-day-${day.value}`}
                                  className="text-sm"
                                >
                                  {day.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label
                            htmlFor="edit-hours_per_day"
                            className="text-right"
                          >
                            Horas por Dia
                          </Label>
                          <Input
                            id="edit-hours_per_day"
                            type="number"
                            min="0"
                            step="0.5"
                            value={currentTask.hours_per_day || 0}
                            onChange={(e) =>
                              setCurrentTask({
                                ...currentTask,
                                hours_per_day: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="col-span-3"
                            placeholder="Ex: 2.5"
                          />
                        </div>
                      </>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="edit-assigned-employee"
                        className="text-right"
                      >
                        Responsável
                      </Label>
                      <Select
                        onValueChange={(value) =>
                          setCurrentTask({
                            ...currentTask,
                            assigned_employee_id: value,
                          })
                        }
                        value={currentTask.assigned_employee_id || "none"}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não atribuído</SelectItem>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {currentTask.repeats_weekly && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-md font-semibold mb-4 text-center text-gray-700">
                        Exceções da Repetição
                      </h4>
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Data</TableHead>
                              <TableHead className="text-xs">Horas</TableHead>
                              <TableHead className="text-xs">
                                Responsável
                              </TableHead>
                              <TableHead className="text-xs">
                                Realizado
                              </TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(currentTask.exceptions || []).map(
                              (exception, index) => (
                                <TableRow
                                  key={index}
                                  className={
                                    exception.removed ? "bg-red-50" : ""
                                  }
                                >
                                  <TableCell className="p-2">
                                    <Input
                                      type="date"
                                      value={exception.date}
                                      onChange={(e) =>
                                        handleExceptionChange(
                                          index,
                                          "date",
                                          e.target.value,
                                        )
                                      }
                                      className="text-xs"
                                      disabled={exception.removed}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      type="number"
                                      value={exception.estimated_hours || ""}
                                      onChange={(e) =>
                                        handleExceptionChange(
                                          index,
                                          "estimated_hours",
                                          parseFloat(e.target.value) || null,
                                        )
                                      }
                                      className="text-xs"
                                      disabled={exception.removed}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Select
                                      value={
                                        exception.assigned_employee_id || "none"
                                      }
                                      onValueChange={(value) =>
                                        handleExceptionChange(
                                          index,
                                          "assigned_employee_id",
                                          value === "none" ? null : value,
                                        )
                                      }
                                      disabled={exception.removed}
                                    >
                                      <SelectTrigger className="text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">
                                          Padrão
                                        </SelectItem>
                                        {employees.map((employee) => (
                                          <SelectItem
                                            key={employee.id}
                                            value={employee.id}
                                          >
                                            {employee.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="text-center p-2">
                                    <input
                                      type="checkbox"
                                      checked={exception.completed || false}
                                      onChange={(e) =>
                                        handleExceptionChange(
                                          index,
                                          "completed",
                                          e.target.checked,
                                        )
                                      }
                                      className="h-4 w-4"
                                      disabled={exception.removed}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    {exception.removed ? (
                                      <span className="text-xs text-red-600 font-medium">
                                        Removida
                                      </span>
                                    ) : (
                                      <span className="text-xs text-green-600 font-medium">
                                        Ativa
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="p-2">
                                    {exception.removed ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleExceptionChange(
                                            index,
                                            "removed",
                                            false,
                                          )
                                        }
                                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                                        title="Restaurar exceção"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="12"
                                          height="12"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                          <path d="M21 3v5h-5" />
                                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                          <path d="M3 21v-5h5" />
                                        </svg>
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleExceptionChange(
                                            index,
                                            "removed",
                                            true,
                                          )
                                        }
                                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                        title="Remover exceção"
                                      >
                                        <Trash2 size={12} />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={handleAddException}
                        >
                          <Plus size={16} className="mr-2" />
                          Adicionar Exceção
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateTask}>
              Update Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Assign Task Dialog */}
      <Dialog
        open={isAssignTaskDialogOpen}
        onOpenChange={setIsAssignTaskDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
            <DialogDescription>
              Assign this task to an employee and schedule it on the calendar.
            </DialogDescription>
          </DialogHeader>
          {currentTask && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-name" className="text-right">
                  Task
                </Label>
                <div className="col-span-3 font-medium">{currentTask.name}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assign-employee" className="text-right">
                  Employee
                </Label>
                <Select
                  onValueChange={(value) =>
                    setCurrentTask({
                      ...currentTask,
                      assigned_employee_id: value,
                    })
                  }
                  value={currentTask.assigned_employee_id || "none"}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No employee</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right col-span-4 text-sm text-muted-foreground">
                  Note: After assigning, you can drag and position this task on
                  the calendar view.
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" onClick={handleAssignTask}>
              Assign Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Drag and Drop Grid Dialog */}
      <Dialog open={isDragDropGridOpen} onOpenChange={setIsDragDropGridOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 size={20} />
              Drag & Drop Task Scheduler
            </DialogTitle>
            <DialogDescription>
              Drag tasks from the unassigned list to employee cells to schedule
              them.
            </DialogDescription>
          </DialogHeader>

          <DndProvider backend={HTML5Backend}>
            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>Como usar:</strong>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                      <li>
                        Arraste tarefas não atribuídas para as células dos
                        funcionários
                      </li>
                      <li>
                        As cores indicam a carga de trabalho: Verde (&lt;50%),
                        Amarelo (50-100%), Vermelho (&gt;100%)
                      </li>
                      <li>
                        As tarefas são automaticamente reatribuídas quando
                        soltas
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Week Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    const newDate = new Date(gridStartDate);
                    newDate.setDate(gridStartDate.getDate() - 7);
                    setGridStartDate(newDate);
                  }}
                >
                  ← Semana Anterior
                </Button>
                <h3 className="text-lg font-semibold">
                  Semana de {format(gridStartDate, "dd/MM/yyyy")}
                </h3>
                <Button
                  variant="outline"
                  onClick={() => {
                    const newDate = new Date(gridStartDate);
                    newDate.setDate(gridStartDate.getDate() + 7);
                    setGridStartDate(newDate);
                  }}
                >
                  Próxima Semana →
                </Button>
              </div>

              <div className="grid grid-cols-12 gap-4">
                {/* Unassigned Tasks Column */}
                <div className="col-span-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Tarefas Não Atribuídas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-96 overflow-y-auto">
                      {unassignedTasks.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Todas as tarefas estão atribuídas
                        </p>
                      ) : (
                        unassignedTasks.map((task) => (
                          <DraggableTask key={task.id} task={task} />
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Grid Calendar */}
                <div className="col-span-9">
                  <div className="border rounded-lg overflow-hidden">
                    {/* Header with dates */}
                    <div className="grid grid-cols-8 bg-gray-50">
                      <div className="p-3 font-medium text-sm border-r">
                        Funcionário
                      </div>
                      {weekDates.map((date) => (
                        <div
                          key={date}
                          className="p-3 font-medium text-sm border-r text-center"
                        >
                          <div>{format(new Date(date), "EEE")}</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(date), "dd/MM")}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Employee rows */}
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className="grid grid-cols-8 border-t"
                      >
                        <div className="p-3 font-medium text-sm border-r bg-gray-50 flex items-center">
                          <div>
                            <div>{employee.name}</div>
                            <div className="text-xs text-gray-500">
                              {employee.weekly_hours}h/semana
                            </div>
                          </div>
                        </div>
                        {weekDates.map((date) => (
                          <div
                            key={`${employee.id}-${date}`}
                            className="border-r"
                          >
                            <DroppableCell
                              date={date}
                              employee={employee}
                              tasks={tasks}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </DndProvider>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDragDropGridOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManagement;
