import React, { useState, useEffect } from "react";
import {
  taskService,
  projectService,
  employeeService,
  type Project,
  type Employee,
} from "@/lib/supabaseClient";
import {
  TaskWithRelations,
  NewTask,
  NewProject,
} from "./task/types";
import { TaskActions } from "./task/TaskActions";
import { NewProjectDialog } from "./task/NewProjectDialog";
import { NewTaskDialog } from "./task/NewTaskDialog";
import { FilterPanel } from "./task/FilterPanel";
import { TaskList } from "./task/TaskList";
import { EditTaskDialog } from "./task/EditTaskDialog";
import { AssignTaskDialog } from "./task/AssignTaskDialog";
import { DragDropGrid } from "./task/DragDropGrid";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog } from "./ui/dialog";
import * as XLSX from "xlsx";

const TaskManagement = () => {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [newTask, setNewTask] = useState<NewTask>({
    name: "",
    description: "",
    estimated_time: 0,
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    project_id: "none",
    assigned_employee_id: "none",
    status: "pending",
    completion_date: "",
    repeats_weekly: false,
    repeat_days: [],
    hours_per_day: 0,
    special_marker: "none",
  });
  const [newProject, setNewProject] = useState<NewProject>({
    name: "",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    categoria_estrategica: "",
  });
  const [strategicCategories, setStrategicCategories] = useState<string[]>([]);

  useEffect(() => {
    loadStrategicCategories();
    loadData();
  }, []);

  useEffect(() => {
    if (newTask.repeats_weekly) {
      const calculatedHours =
        (newTask.repeat_days?.length || 0) * (newTask.hours_per_day || 0);
      setNewTask((prev) => ({ ...prev, estimated_time: calculatedHours }));
    }
  }, [newTask.repeats_weekly, newTask.repeat_days, newTask.hours_per_day]);

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

  const loadStrategicCategories = async () => {
    try {
      const projectsData = await projectService.getAll();
      const categories = projectsData
        .map((p) => p.categoria_estrategica)
        .filter(
          (cat): cat is string =>
            cat !== null && cat !== undefined && cat !== "",
        )
        .filter((cat, index, arr) => arr.indexOf(cat) === index);
      setStrategicCategories(categories);
    } catch (error) {
      console.error("Error loading strategic categories:", error);
    }
  };

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
        ...newTask,
        project_id:
          newTask.project_id === "none" ? null : newTask.project_id || null,
        assigned_employee_id:
          newTask.assigned_employee_id === "none"
            ? null
            : newTask.assigned_employee_id || null,
        completion_date:
          newTask.status === "completed" && newTask.completion_date
            ? newTask.completion_date
            : null,
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
        status: "pending",
        completion_date: "",
        repeats_weekly: false,
        repeat_days: [],
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
      const updateData = {
        ...currentTask,
        project_id:
          currentTask.project_id === "none" ? null : currentTask.project_id,
        assigned_employee_id:
          currentTask.assigned_employee_id === "none"
            ? null
            : currentTask.assigned_employee_id,
        completion_date:
          currentTask.status === "completed" && currentTask.completion_date
            ? currentTask.completion_date
            : null,
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
      setTasks(
        tasks.map((task) =>
          task.id === currentTask.id
            ? (updatedTask as TaskWithRelations)
            : task,
        ),
      );
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
      setTasks(
        tasks.map((task) =>
          task.id === currentTask.id
            ? (updatedTask as TaskWithRelations)
            : task,
        ),
      );
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

  const handleRepeatDayChange = (day: string, checked: boolean) => {
    setNewTask((prev) => ({
      ...prev,
      repeat_days: checked
        ? [...prev.repeat_days, day]
        : prev.repeat_days.filter((d) => d !== day),
    }));
  };

  const handleCurrentTaskRepeatDayChange = (day: string, checked: boolean) => {
    if (!currentTask) return;
    const currentDays = currentTask.repeat_days || [];
    setCurrentTask((prev) =>
      prev
        ? {
            ...prev,
            repeat_days: checked
              ? [...currentDays, day]
              : currentDays.filter((d) => d !== day),
          }
        : null,
    );
  };

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

              let projectId = row["Project ID"];
              if (!projectId && row["Project"]) {
                const project = projects.find(
                  (p) => p.name === row["Project"],
                );
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
                  row["Start Date"] ||
                  new Date().toISOString().split("T")[0],
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
        alert(
          "Error reading file. Please make sure it's a valid Excel file.",
        );
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const clearFilters = () => {
    setFilters({ project: "all", employee: "all", status: "all" });
  };

  return (
    <div className="bg-background p-6 w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Task Management</h1>
        <TaskActions
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onExport={exportToExcel}
          onImport={handleFileImport}
          onToggleDragDropGrid={() => setIsDragDropGridOpen(true)}
          onNewProject={() => setIsNewProjectDialogOpen(true)}
          onNewTask={() => setIsNewTaskDialogOpen(true)}
        />
      </div>

      {showFilters && (
        <FilterPanel
          filters={filters}
          onFilterChange={(filter, value) =>
            setFilters((prev) => ({ ...prev, [filter]: value }))
          }
          projects={projects}
          employees={employees}
          projectSearchTerm={projectSearchTerm}
          onProjectSearchTermChange={setProjectSearchTerm}
          onClearFilters={clearFilters}
          onHideFilters={() => setShowFilters(false)}
        />
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
          <TaskList
            loading={loading}
            tasks={tasks}
            filteredTasks={filteredTasks}
            onEdit={openEditDialog}
            onDelete={handleDeleteTask}
            onAssign={openAssignDialog}
          />
        </CardContent>
      </Card>

      <Dialog
        open={isNewProjectDialogOpen}
        onOpenChange={setIsNewProjectDialogOpen}
      >
        <NewProjectDialog
          newProject={newProject}
          onNewProjectChange={(field, value) =>
            setNewProject((prev) => ({ ...prev, [field]: value }))
          }
          strategicCategories={strategicCategories}
          onSubmit={handleCreateProject}
        />
      </Dialog>

      <Dialog
        open={isNewTaskDialogOpen}
        onOpenChange={setIsNewTaskDialogOpen}
      >
        <NewTaskDialog
          newTask={newTask}
          onNewTaskChange={(field, value) =>
            setNewTask((prev) => ({ ...prev, [field]: value }))
          }
          projects={projects}
          employees={employees}
          onSubmit={handleCreateTask}
          handleRepeatDayChange={handleRepeatDayChange}
        />
      </Dialog>

      <Dialog
        open={isEditTaskDialogOpen}
        onOpenChange={setIsEditTaskDialogOpen}
      >
        {currentTask && (
          <EditTaskDialog
            currentTask={currentTask}
            onCurrentTaskChange={(field, value) =>
              setCurrentTask((prev) =>
                prev ? { ...prev, [field]: value } : null,
              )
            }
            projects={projects}
            employees={employees}
            onSubmit={handleUpdateTask}
            handleCurrentTaskRepeatDayChange={handleCurrentTaskRepeatDayChange}
          />
        )}
      </Dialog>

      <Dialog
        open={isAssignTaskDialogOpen}
        onOpenChange={setIsAssignTaskDialogOpen}
      >
        {currentTask && (
          <AssignTaskDialog
            currentTask={currentTask}
            onCurrentTaskChange={(field, value) =>
              setCurrentTask((prev) =>
                prev ? { ...prev, [field]: value } : null,
              )
            }
            employees={employees}
            onSubmit={handleAssignTask}
          />
        )}
      </Dialog>

      <DragDropGrid
        isOpen={isDragDropGridOpen}
        onOpenChange={setIsDragDropGridOpen}
        tasks={tasks}
        employees={employees}
        onTasksChange={setTasks}
      />
    </div>
  );
};

export default TaskManagement;