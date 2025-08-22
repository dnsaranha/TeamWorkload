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
import {
  taskService,
  projectService,
  employeeService,
  type Task,
  type Project,
  type Employee,
} from "@/lib/supabaseClient";
import NewTaskScheduler from "./NewTaskScheduler";

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
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
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
      "Task Name": task.name,
      Description: task.description || "",
      Project: task.project?.name || "No project",
      "Strategic Category": task.project?.categoria_estrategica || "",
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

        // Process imported data and create tasks
        jsonData.forEach(async (row: any) => {
          if (row["Task Name"]) {
            try {
              const repeatsWeekly =
                row["Repeats Weekly"]?.toLowerCase() === "yes";
              const repeatDays = repeatsWeekly
                ? row["Repeat Days"]
                    ?.split(",")
                    .map((d: string) => d.trim()) || []
                : null;
              const hoursPerDay = repeatsWeekly
                ? Number(row["Hours per Day"]) || 0
                : null;

              const taskData = {
                name: row["Task Name"],
                description: row["Description"] || "",
                estimated_time: Number(row["Estimated Hours"]) || 1,
                start_date:
                  row["Start Date"] || new Date().toISOString().split("T")[0],
                end_date:
                  row["End Date"] || new Date().toISOString().split("T")[0],
                project_id: null, // Note: Project linking from import is not implemented
                assigned_employee_id: null, // Note: Employee linking from import is not implemented
                status: "pending" as "pending" | "in_progress" | "completed",
                completion_date: null,
                repeats_weekly: repeatsWeekly,
                repeat_days: repeatDays,
                hours_per_day: hoursPerDay,
              };

              const createdTask = await taskService.create(taskData);
              setTasks((prev) => [createdTask as TaskWithRelations, ...prev]);
            } catch (error) {
              console.error("Error importing task:", error);
            }
          }
        });

        alert("Import completed! Please refresh to see the new tasks.");
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
import NewTaskScheduler from "./NewTaskScheduler";

// ... inside component
          <Button
            variant="outline"
            onClick={() => setIsSchedulerOpen(true)}
            className="flex items-center gap-2"
          >
            <Grid3X3 size={16} />
            Task Scheduler
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
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
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
                      <Label className="text-right pt-2">Dias da Semana</Label>
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
                              checked={newTask.repeat_days.includes(day.value)}
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
                      {format(new Date(task.start_date), "MMM d")} -{" "}
                      {format(new Date(task.end_date), "MMM d, yyyy")}
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
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(task)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 size={16} />
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
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details and time estimates.
            </DialogDescription>
          </DialogHeader>
          {currentTask && (
            <ScrollArea className="h-96">
              <div className="grid gap-4 p-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Task Name
                </Label>
                <Input
                  id="edit-name"
                  value={currentTask.name}
                  onChange={(e) =>
                    setCurrentTask({ ...currentTask, name: e.target.value })
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
                <Label htmlFor="edit-estimatedTime" className="text-right">
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
                        {format(new Date(currentTask.start_date), "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={new Date(currentTask.start_date + "T00:00:00Z")}
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
                        {format(new Date(currentTask.end_date), "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={new Date(currentTask.end_date + "T00:00:00Z")}
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
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {currentTask.status === "completed" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-completion_date" className="text-right">
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
                <Label htmlFor="edit-special_marker" className="text-right">
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
                    <SelectItem value="major_release">Major Release</SelectItem>
                    <SelectItem value="major_deployment">
                      Major Deployment
                    </SelectItem>
                    <SelectItem value="major_theme">Major Theme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-repeats_weekly" className="text-right">
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
                  <Label htmlFor="edit-repeats_weekly" className="text-sm">
                    Esta tarefa se repete semanalmente
                  </Label>
                </div>
              </div>
              {currentTask.repeats_weekly && (
                <>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Dias da Semana</Label>
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
                            checked={(currentTask.repeat_days || []).includes(
                              day.value,
                            )}
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
                    <Label htmlFor="edit-hours_per_day" className="text-right">
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
                <Label htmlFor="edit-assigned-employee" className="text-right">
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

      <NewTaskScheduler
        isOpen={isSchedulerOpen}
        onOpenChange={setIsSchedulerOpen}
      />
    </div>
  );
};

export default TaskManagement;
