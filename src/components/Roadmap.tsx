import React, { useState, useEffect, useRef } from "react";
import { Timeline } from "vis-timeline/standalone";
import { DataSet } from "vis-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ZoomIn,
  ZoomOut,
  Filter,
  Calendar,
  Target,
  Rocket,
  Layers,
} from "lucide-react";
import {
  taskService,
  projectService,
  type Task,
  type Project,
} from "@/lib/supabaseClient";

type TaskWithRelations = Task & {
  project: Project | null;
};

interface RoadmapItem {
  id: string;
  content: string;
  start: Date;
  end: Date;
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
}

const STRATEGIC_CATEGORIES = [
  { id: "user_growth", name: "Crescimento de Usuários", color: "#3B82F6" },
  { id: "scalability", name: "Escalabilidade", color: "#10B981" },
  { id: "reduce_churn", name: "Redução de Churn", color: "#F59E0B" },
  { id: "product_dev", name: "Desenvolvimento de Produto", color: "#8B5CF6" },
  { id: "infrastructure", name: "Infraestrutura", color: "#EF4444" },
  { id: "marketing", name: "Marketing", color: "#EC4899" },
];

const STATUS_COLORS = {
  pending: "#F59E0B",
  in_progress: "#3B82F6",
  completed: "#10B981",
};

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
  const [loading, setLoading] = useState(true);
  const [dynamicCategories, setDynamicCategories] = useState<
    { id: string; name: string; color: string }[]
  >([]);
  const [filters, setFilters] = useState<FilterState>({
    categories: STRATEGIC_CATEGORIES.map((cat) => cat.id),
    status: ["pending", "in_progress", "completed"],
    timeScale: "months",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (tasks.length > 0 && timelineRef.current) {
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
  }, [tasks, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, projectsData] = await Promise.all([
        taskService.getAll(),
        projectService.getAll(),
      ]);

      setTasks(tasksData as TaskWithRelations[]);
      setProjects(projectsData);

      // Extract unique strategic categories from projects
      const uniqueCategories = projectsData
        .map((p) => p.categoria_estrategica)
        .filter(
          (cat): cat is string =>
            cat !== null && cat !== undefined && cat !== "",
        )
        .filter((cat, index, arr) => arr.indexOf(cat) === index)
        .map((cat, index) => ({
          id: cat.replace(/\s+/g, "_").toLowerCase(),
          name: cat,
          color: COLORS[index % COLORS.length] || "#8884D8",
        }));

      setDynamicCategories(uniqueCategories);

      // Update filters to include dynamic categories
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

  const getTaskCategory = (task: TaskWithRelations): string => {
    // First, check if the project has a strategic category defined
    if (task.project?.categoria_estrategica) {
      // Map the strategic category to our predefined categories or use it directly
      const strategicCategory =
        task.project.categoria_estrategica.toLowerCase();

      // Try to find a matching predefined category
      const matchingCategory = STRATEGIC_CATEGORIES.find(
        (cat) =>
          cat.name.toLowerCase().includes(strategicCategory) ||
          strategicCategory.includes(cat.name.toLowerCase()) ||
          cat.id === strategicCategory,
      );

      if (matchingCategory) {
        return matchingCategory.id;
      }

      // If no match found, create a dynamic category based on the strategic category
      return strategicCategory.replace(/\s+/g, "_").toLowerCase();
    }

    // Fallback to keyword-based categorization
    const text =
      `${task.name} ${task.description || ""} ${task.project?.name || ""} ${task.project?.description || ""}`.toLowerCase();

    if (
      text.includes("usuário") ||
      text.includes("user") ||
      text.includes("cliente")
    ) {
      return "user_growth";
    }
    if (
      text.includes("escala") ||
      text.includes("performance") ||
      text.includes("otimiz")
    ) {
      return "scalability";
    }
    if (
      text.includes("churn") ||
      text.includes("retenção") ||
      text.includes("retention")
    ) {
      return "reduce_churn";
    }
    if (
      text.includes("produto") ||
      text.includes("feature") ||
      text.includes("funcional")
    ) {
      return "product_dev";
    }
    if (
      text.includes("infraestrutura") ||
      text.includes("servidor") ||
      text.includes("deploy")
    ) {
      return "infrastructure";
    }
    if (
      text.includes("marketing") ||
      text.includes("campanha") ||
      text.includes("promo")
    ) {
      return "marketing";
    }

    return "product_dev"; // default category
  };

  const getSpecialMarker = (task: TaskWithRelations): string | undefined => {
    const text = `${task.name} ${task.description || ""}`.toLowerCase();

    if (text.includes("release") || text.includes("lançamento")) {
      return "major_release";
    }
    if (text.includes("deploy") || text.includes("implantação")) {
      return "major_deployment";
    }
    if (text.includes("theme") || text.includes("tema")) {
      return "major_theme";
    }

    return undefined;
  };

  const initializeTimeline = () => {
    if (!timelineRef.current) return;

    // Filter tasks based on current filters
    const filteredTasks = tasks.filter((task) => {
      const category = getTaskCategory(task);
      const statusMatch = filters.status.includes(task.status);
      const categoryMatch = filters.categories.includes(category);
      return statusMatch && categoryMatch;
    });

    // Combine predefined and dynamic categories
    const allCategories = [...STRATEGIC_CATEGORIES, ...dynamicCategories];

    // Create groups (strategic categories)
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

    // Create timeline items
    const items = new DataSet<RoadmapItem>(
      filteredTasks.map((task) => {
        const category = getTaskCategory(task);
        const allCategories = [...STRATEGIC_CATEGORIES, ...dynamicCategories];
        const categoryInfo = allCategories.find((cat) => cat.id === category);
        const specialMarker = getSpecialMarker(task);

        let className = `roadmap-item status-${task.status}`;
        if (specialMarker) {
          className += ` special-${specialMarker}`;
        }

        return {
          id: task.id,
          content: `<div class="roadmap-item-content">
            <div class="item-title">${task.name}</div>
            ${specialMarker ? `<div class="special-marker">${specialMarker.replace("_", " ").toUpperCase()}</div>` : ""}
            <div class="item-project">${task.project?.name || "Sem projeto"}</div>
          </div>`,
          start: new Date(task.start_date),
          end: new Date(task.end_date),
          group: category,
          className,
          title: `${task.name}\n\nProjeto: ${task.project?.name || "Sem projeto"}\nStatus: ${task.status}\nDuração: ${task.estimated_time}h\n\nDescrição: ${task.description || "Sem descrição"}`,
          type: "range",
        };
      }),
    );

    // Timeline options
    const options = {
      groupOrder: (a: RoadmapGroup, b: RoadmapGroup) => {
        const allCategories = [...STRATEGIC_CATEGORIES, ...dynamicCategories];
        const orderA = allCategories.findIndex((cat) => cat.id === a.id);
        const orderB = allCategories.findIndex((cat) => cat.id === b.id);
        return orderA - orderB;
      },
      orientation: "top",
      stack: true,
      showCurrentTime: true,
      zoomMin: 1000 * 60 * 60 * 24 * 7, // 1 week
      zoomMax: 1000 * 60 * 60 * 24 * 365 * 2, // 2 years
      editable: {
        add: false,
        updateTime: true,
        updateGroup: true,
        remove: false,
      },
      onMove: (item: any, callback: any) => {
        // Handle drag and drop updates
        handleItemMove(item, callback);
      },
      tooltip: {
        followMouse: true,
        overflowMethod: "cap",
      },
      format: {
        minorLabels: {
          millisecond: "SSS",
          second: "s",
          minute: "HH:mm",
          hour: "HH:mm",
          weekday: "ddd D",
          day: "D",
          week: "w",
          month: "MMM",
          year: "YYYY",
        },
        majorLabels: {
          millisecond: "HH:mm:ss",
          second: "D MMMM HH:mm",
          minute: "ddd D MMMM",
          hour: "ddd D MMMM",
          weekday: "MMMM YYYY",
          day: "MMMM YYYY",
          week: "MMMM YYYY",
          month: "YYYY",
          year: "",
        },
      },
    };

    // Destroy existing timeline
    if (timelineInstance.current) {
      try {
        timelineInstance.current.destroy();
      } catch (error) {
        console.warn("Error destroying existing timeline:", error);
      }
      timelineInstance.current = null;
    }

    // Create new timeline
    timelineInstance.current = new Timeline(
      timelineRef.current,
      items,
      groups,
      options,
    );

    // Set initial view based on time scale
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
      default: // months
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 4, 0);
    }

    timelineInstance.current.setWindow(start, end);
  };

  const handleItemMove = async (item: any, callback: any) => {
    try {
      // Update task in database
      await taskService.update(item.id, {
        start_date: item.start.toISOString().split("T")[0],
        end_date: item.end.toISOString().split("T")[0],
      });

      // Update local state
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === item.id
            ? {
                ...task,
                start_date: item.start.toISOString().split("T")[0],
                end_date: item.end.toISOString().split("T")[0],
              }
            : task,
        ),
      );

      callback(item); // Confirm the move
    } catch (error) {
      console.error("Error updating task:", error);
      callback(null); // Cancel the move
    }
  };

  const handleZoom = (direction: "in" | "out") => {
    if (!timelineInstance.current) return;

    try {
      const range = timelineInstance.current.getWindow();
      const interval = range.end.getTime() - range.start.getTime();
      const center = new Date(
        (range.start.getTime() + range.end.getTime()) / 2,
      );

      const factor = direction === "in" ? 0.7 : 1.4;
      const newInterval = interval * factor;

      const newStart = new Date(center.getTime() - newInterval / 2);
      const newEnd = new Date(center.getTime() + newInterval / 2);

      timelineInstance.current.setWindow(newStart, newEnd);
    } catch (error) {
      console.warn("Error during zoom operation:", error);
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Roadmap Estratégico</h1>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros do Roadmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Time Scale */}
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

                {/* Categories */}
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

                {/* Status */}
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
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

        {/* Timeline */}
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
