import React, { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Search, Filter, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import GanttChart from "./GanttChart";
import GanttTaskModal from "./GanttTaskModal";
import {
  taskService,
  projectService,
  employeeService,
  type Task as DBTask,
  type Project,
  type Employee,
} from "@/lib/supabaseClient";
import type { Task as GanttTask } from "../types";
import { useToast } from "./ui/use-toast";
import { MultiSelect } from "./ui/MultiSelect";

const ProjectVisualization: React.FC = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<DBTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  
  // Modal de edição
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, projectsData, employeesData] = await Promise.all([
        taskService.getAll(),
        projectService.getAll(),
        employeeService.getAll(),
      ]);

      setTasks(tasksData);
      setProjects(projectsData);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar tarefas
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Filtro de busca por texto
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

      // Filtro de projetos
      const projectMatch =
        selectedProjects.length === 0 ||
        (task.project_id && selectedProjects.includes(task.project_id));

      return searchMatch && projectMatch;
    });
  }, [tasks, searchTerm, selectedProjects, projects, employees]);

  // Converter tarefas do banco para formato do Gantt
  const ganttTasks: GanttTask[] = useMemo(() => {
    return filteredTasks.map((task) => {
      const employee = employees.find(
        (emp) => emp.id === task.assigned_employee_id,
      );

      return {
        id: task.id,
        name: task.name,
        startDate: task.start_date,
        endDate: task.end_date,
        progress: task.progress || (task.status === "completed" ? 100 : task.status === "in_progress" ? 50 : 0),
        dependencies: task.dependencies || [],
        status:
          task.status === "completed"
            ? "Concluído"
            : task.status === "in_progress"
              ? "Em Progresso"
              : "A Fazer",
        responsible: employee?.name || "Não atribuído",
      };
    });
  }, [filteredTasks, employees]);

  // Atualizar ou criar tarefa
const handleGanttTaskUpdate = async (
  taskId: string,
  formData: Partial<GanttTask>,
  dependencies: string[],
) => {
  try {
    const isNewTask = taskId === "new";

    // Centralized data processing and formatting
    const startDate = formData.start_date ? new Date(formData.start_date) : new Date();
    const duration = formData.duration || 1;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration);

    const taskPayload = {
      name: formData.text || "Nova Tarefa",
      description: formData.description,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      estimated_time: formData.estimated_time || 0,
      dependencies: dependencies,
      project_id: formData.project_id,
      assigned_employee_id: formData.assignee,
      status: formData.status,
      special_marker: formData.special_marker,
    };

    if (isNewTask) {
      await taskService.create(taskPayload);
      toast({
        title: "Tarefa criada",
        description: "A nova tarefa foi adicionada com sucesso.",
      });
    } else {
      await taskService.update(taskId, taskPayload);
      toast({
        title: "Tarefa atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    }

    // Recarregar dados para refletir a mudança
    await loadData();
  } catch (error: any) {
    console.error("Erro ao salvar tarefa:", error);
    toast({
      title: "Erro ao salvar tarefa",
      description: `Não foi possível salvar a tarefa: ${error.message}`,
      variant: "destructive",
    });
  }
};

  // Abrir modal de edição/criação
  const handleEditTask = (taskId: string) => {
    setEditingTaskId(taskId);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Barra de filtros */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="w-64">
            <MultiSelect
              options={projects.map((p) => ({
                label: p.name,
                value: p.id,
              }))}
              defaultValue={selectedProjects}
              onValueChange={setSelectedProjects}
              placeholder="Selecione projetos..."
            />
          </div>
        </div>
      </div>

      {/* Gráfico de Gantt */}
      <div className="bg-white rounded-lg border">
        <GanttChart
          tasks={ganttTasks}
          theme="light"
          editingTaskId={editingTaskId}
          onTasksUpdated={handleGanttTaskUpdate}
          onEditTask={handleEditTask}
        />
      </div>

      {/* Modal de edição de tarefa */}
      {editingTaskId && (
        <GanttTaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTaskId(null);
          }}
          taskId={editingTaskId}
          task={tasks.find(t => t.id === editingTaskId) || null}
          employees={employees}
          projects={projects}
          onSave={async (formData, dependencies) => {
            await handleGanttTaskUpdate(editingTaskId, formData, dependencies);
            setIsModalOpen(false);
            setEditingTaskId(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectVisualization;