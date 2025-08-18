import React, { useState, useEffect, useRef, useMemo } from "react";
import { Timeline } from "vis-timeline/standalone";
import { DataSet } from "vis-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  ZoomIn,
  ZoomOut,
  Filter,
  Calendar,
  Target,
  Rocket,
  Layers,
  Search,
} from "lucide-react";
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

interface RoadmapItem {
  id: string;
  content: string;
  start: Date;
  end?: Date;
  group: string;
  className: string;
  title: string;
  type?: string;
}

interface RoadmapGroup {
  id: string;
  content: string;
  className?: string;
}

interface FilterState {
  categories: string[];
  status: string[];
  timeScale: "weeks" | "months" | "quarters";
  itemType: "all" | "tasks" | "projects";
}

const STRATEGIC_CATEGORIES = [
  { id: "user_growth", name: "Crescimento de Usuários", color: "#3B82F6" },
  { id: "scalability", name: "Escalabilidade", color: "#10B981" },
  { id: "reduce_churn", name: "Redução de Churn", color: "#F59E0B" },
  { id: "product_dev", name: "Desenvolvimento de Produto", color: "#8B5CF6" },
  { id: "infrastructure", name: "Infraestrutura", color: "#EF4444" },
  { id: "marketing", name: "Marketing", color: "#EC4899" },
];

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

const Roadmap = () => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<Timeline | null>(null);
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dynamicCategories, setDynamicCategories] = useState<
    { id: string; name: string; color: string }[]
  >([]);
  const [filters, setFilters] = useState<FilterState & { employee: string }>({
    categories: STRATEGIC_CATEGORIES.map((cat) => cat.id),
    status: ["pending", "in_progress", "completed"],
    timeScale: "months",
    employee: "all",
    itemType: "all",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const category = getCategoryFor(task, "task");
      const statusMatch = filters.status.includes(task.status);
      const categoryMatch = filters.categories.includes(category);
      const employeeMatch =
        filters.employee === "all" ||
        task.assigned_employee_id === filters.employee;

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

      return statusMatch && categoryMatch && employeeMatch && searchMatch;
    });
  }, [tasks, filters, searchTerm]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const category = getCategoryFor(project, "project");
      const categoryMatch = filters.categories.includes(category);

      const searchMatch =
        !searchTerm ||
        searchTerm
          .toLowerCase()
          .split(" ")
          .every((word) => {
            const projectText = `
            ${project.name}
            ${project.description || ""}
          `.toLowerCase();
            return projectText.includes(word);
          });

      return categoryMatch && searchMatch;
    });
  }, [projects, filters, searchTerm]);

  useEffect(() => {
    if ((tasks.length > 0 || projects.length > 0) && timelineRef.current) {
      initializeTimeline();
    }
    return () => {
      if (timelineInstance.current) {
        try {
          timelineInstance.current.destroy();
          timelineInstance.current = null;
        } catch (error) {
          console.warn("Error destroying timeline:", error);
          timelineInstance.current = null;
        }
      }
    };
  }, [filteredTasks, filteredProjects, filters]);

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

      const categoriesFromProjects = projectsData.map(p => p.categoria_estrategica);
      const categoriesFromTasks = (tasksData as TaskWithRelations[]).map(t => t.project?.categoria_estrategica);

      const allCategoriesInUse = [...categoriesFromProjects, ...categoriesFromTasks]
        .filter((cat): cat is string => cat !== null && cat !== undefined && cat !== "")
        .filter((cat, index, arr) => arr.indexOf(cat) === index);

      const uniqueCategories = allCategoriesInUse.map((cat, index) => ({
        id: cat.replace(/\s+/g, "_").toLowerCase(),
        name: cat,
        color: COLORS[index % COLORS.length] || "#8884D8",
      }));

      setDynamicCategories(uniqueCategories);

      const allCategoryIds = [
        ...STRATEGIC_CATEGORIES.map((cat) => cat.id),
        ...uniqueCategories.map((cat) => cat.id),
      ];
      setFilters((prev) => ({
        ...prev,
        categories: allCategoryIds,
      }));
    } catch (error) {
      console.error("Error loading roadmap data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryFor = (
    item: TaskWithRelations | Project,
    type: "task" | "project",
  ): string => {
    const strategicCategory =
      type === "task"
        ? (item as TaskWithRelations).project?.categoria_estrategica
        : (item as Project).categoria_estrategica;

    if (strategicCategory) {
      const normalizedCategory = strategicCategory
        .toLowerCase()
        .replace(/\s+/g, "_");
      const allCategories = [...STRATEGIC_CATEGORIES, ...dynamicCategories];
      const matchingCategory = allCategories.find(
        (cat) => cat.id === normalizedCategory,
      );
      if (matchingCategory) return matchingCategory.id;
      return normalizedCategory;
    }

    if (type === "project") return "product_dev"; // Default for projects without category

    const text =
      `${item.name} ${item.description || ""}`.toLowerCase();
    if (text.includes("usuário")) return "user_growth";
    if (text.includes("escala")) return "scalability";
    if (text.includes("churn")) return "reduce_churn";
    if (text.includes("infraestrutura")) return "infrastructure";
    if (text.includes("marketing")) return "marketing";
    return "product_dev";
  };

  const initializeTimeline = () => {
    if (!timelineRef.current) return;

    const allCategories = [...STRATEGIC_CATEGORIES, ...dynamicCategories];

    const groups = new DataSet<RoadmapGroup>(
      allCategories
        .filter((cat) => filters.categories.includes(cat.id))
        .map((category) => ({
          id: category.id,
          content: `<div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 12px; height: 12px; background-color: ${category.color}; border-radius: 50%;"></div>
          <span style="font-weight: 500;">${category.name}</span>
        </div>`,
          className: "roadmap-group",
        })),
    );

    const taskItems = filters.itemType !== 'projects' ? filteredTasks.map((task) => {
      const category = getCategoryFor(task, "task");
      const specialMarker = task.special_marker;
      let className = `roadmap-item status-${task.status}`;
      if (specialMarker) className += ` special-${specialMarker}`;

      return {
        id: `task-${task.id}`,
        content: `<div class="roadmap-item-content">
          <div class="item-title">${task.name}</div>
          ${specialMarker ? `<div class="special-marker">${specialMarker.replace(/_/g, " ").toUpperCase()}</div>` : ""}
          <div class="item-project">${task.project?.name || "Sem projeto"}</div>
        </div>`,
        start: new Date(task.start_date),
        end: new Date(task.end_date),
        group: category,
        className,
        title: `${task.name}\n\nProjeto: ${task.project?.name || "Sem projeto"}\nStatus: ${task.status}\nDuração: ${task.estimated_time}h`,
        type: "range",
      };
    }) : [];

    const projectMarkerItems = filters.itemType !== 'tasks' ? filteredProjects
      .filter((p) => p.special_marker && p.end_date)
      .map((project) => {
        const category = getCategoryFor(project, "project");
        const specialMarker = project.special_marker;
        let className = `roadmap-item special-marker-project special-${specialMarker}`;

        return {
          id: `project-${project.id}`,
          content: `<div class="roadmap-item-content">
            <div class="item-title">${project.name} - ${specialMarker?.replace(/_/g, " ").toUpperCase()}</div>
          </div>`,
          start: new Date(project.end_date!),
          group: category,
          className,
          title: `${project.name} - ${specialMarker?.replace(/_/g, " ").toUpperCase()}`,
          type: "point",
        };
      }) : [];

    const items = new DataSet<RoadmapItem>([...taskItems, ...projectMarkerItems]);

    const options = {
      orientation: "top",
      stack: true,
      showCurrentTime: true,
      zoomMin: 1000 * 60 * 60 * 24 * 7,
      zoomMax: 1000 * 60 * 60 * 24 * 365 * 2,
      editable: {
        add: false,
        updateTime: true,
        updateGroup: true,
        remove: false,
      },
      onMove: (item: any, callback: any) => {
        handleItemMove(item, callback);
      },
      tooltip: {
        followMouse: true,
        overflowMethod: "cap",
      },
    };

    if (timelineInstance.current) {
      timelineInstance.current.destroy();
    }

    timelineInstance.current = new Timeline(
      timelineRef.current,
      items,
      groups,
      options as any,
    );

    const now = new Date();
    let start: Date, end: Date;
    switch (filters.timeScale) {
      case "weeks":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 42);
        break;
      case "quarters":
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 9, 0);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 4, 0);
    }
    timelineInstance.current.setWindow(start, end);
  };

  const handleItemMove = async (item: any, callback: any) => {
    if (!item.id.startsWith("task-")) {
      callback(null);
      return;
    }
    try {
      await taskService.update(item.id.replace("task-", ""), {
        start_date: item.start.toISOString().split("T")[0],
        end_date: item.end.toISOString().split("T")[0],
      });

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === item.id.replace("task-", "")
            ? {
                ...task,
                start_date: item.start.toISOString().split("T")[0],
                end_date: item.end.toISOString().split("T")[0],
              }
            : task,
        ),
      );
      callback(item);
    } catch (error) {
      console.error("Error updating task:", error);
      callback(null);
    }
  };

  const handleZoom = (direction: "in" | "out") => {
    if (timelineInstance.current) {
      const { start, end } = timelineInstance.current.getWindow();
      const interval = end.getTime() - start.getTime();
      // The zoom is exponential, so we use a fixed factor.
      const zoomFactor = 0.2;
      let newStart, newEnd;

      if (direction === 'in') {
        newStart = new Date(start.getTime() + interval * zoomFactor);
        newEnd = new Date(end.getTime() - interval * zoomFactor);
      } else {
        newStart = new Date(start.getTime() - interval * zoomFactor);
        newEnd = new Date(end.getTime() + interval * zoomFactor);
      }

      timelineInstance.current.setWindow(newStart, newEnd, { animation: true });
    }
  };

  const handleCategoryFilter = (categoryId: string, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      categories: checked
        ? [...prev.categories, categoryId]
        : prev.categories.filter((id) => id !== categoryId),
    }));
  };

  const handleStatusFilter = (status: string, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      status: checked
        ? [...prev.status, status]
        : prev.status.filter((s) => s !== status),
    }));
  };

  if (loading) {
    return (
      <div className="bg-background p-6 w-full">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background p-6 w-full">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Roadmap Estratégico</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom("in")}
              className="flex items-center gap-2"
            >
              <ZoomIn className="h-4 w-4" />
              Zoom In
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom("out")}
              className="flex items-center gap-2"
            >
              <ZoomOut className="h-4 w-4" />
              Zoom Out
            </Button>
          </div>
        </div>

        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros do Roadmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Escala de Tempo
                  </label>
                  <Select
                    value={filters.timeScale}
                    onValueChange={(value: "weeks" | "months" | "quarters") =>
                      setFilters((prev) => ({ ...prev, timeScale: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weeks">Semanas</SelectItem>
                      <SelectItem value="months">Meses</SelectItem>
                      <SelectItem value="quarters">Trimestres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Mostrar
                  </label>
                  <Select
                    value={filters.itemType}
                    onValueChange={(value: "all" | "tasks" | "projects") =>
                      setFilters((prev) => ({ ...prev, itemType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="tasks">Apenas Tarefas</SelectItem>
                      <SelectItem value="projects">Apenas Projetos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Categorias Estratégicas
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {[...STRATEGIC_CATEGORIES, ...dynamicCategories].map(
                      (category) => (
                        <div
                          key={category.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={filters.categories.includes(category.id)}
                            onCheckedChange={(checked) =>
                              handleCategoryFilter(category.id, !!checked)
                            }
                          />
                          <label
                            htmlFor={`category-${category.id}`}
                            className="text-sm flex items-center gap-2"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            ></div>
                            {category.name}
                          </label>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: "pending", name: "Pendente" },
                      { id: "in_progress", name: "Em Andamento" },
                      { id: "completed", name: "Concluído" },
                    ].map((status) => (
                      <div
                        key={status.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`status-${status.id}`}
                          checked={filters.status.includes(status.id)}
                          onCheckedChange={(checked) =>
                            handleStatusFilter(status.id, !!checked)
                          }
                        />
                        <label
                          htmlFor={`status-${status.id}`}
                          className="text-sm"
                        >
                          {status.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Funcionário
                  </label>
                  <Select
                    value={filters.employee}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, employee: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Legenda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Marcadores Especiais</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-blue-600" />
                    <span>Major Release</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span>Major Deployment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    <span>Major Theme</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Status das Atividades</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Pendente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Em Andamento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Concluído</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div
              ref={timelineRef}
              className="roadmap-timeline"
              style={{ height: "600px", width: "100%" }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Roadmap;
