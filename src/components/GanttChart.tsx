import React, { useEffect, useRef, useState } from "react";
import type { Task } from "../types";
import { Button } from "./ui/button";
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Columns,
  Download,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface GanttChartProps {
  tasks: Task[];
  theme: "light" | "dark";
  editingTaskId: string | null;
  onAddTask: (parentId: string) => void;
  onEditTask?: (taskId: string) => void;
  onTasksUpdated?: (taskId: string, updates: Partial<Task>) => void;
}

// Error boundary to catch Gantt library errors
class GanttErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: false }; // Don't show error UI, just suppress
  }

  componentDidCatch(error: Error) {
    // Suppress errors from Gantt library
    console.debug('Gantt library error suppressed:', error.message);
  }

  render() {
    return this.props.children;
  }
}

// Adicionar a definição do gantt ao objeto window
declare global {
  interface Window {
    gantt: any;
  }
}

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  theme,
  editingTaskId,
  onEditTask,
  onTasksUpdated,
  onAddTask,
}) => {
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const isGanttInitialized = useRef(false);
  const styleElementRef = useRef<HTMLStyleElement | null>(null);
  const [columnVisibility, setColumnVisibility] = useState({
    text: true,
    start_date: true,
    duration: true,
    responsible: true,
  });

  // Ref para guardar as props mais recentes e evitar closures velhas nos event handlers do Gantt
  const latestProps = useRef({
    tasks,
    editingTaskId,
    onEditTask,
    onTasksUpdated,
    onAddTask,
  });
  useEffect(() => {
    // Atualiza o ref com as props mais recentes em cada renderização
    latestProps.current = {
      tasks,
      editingTaskId,
      onEditTask,
      onTasksUpdated,
      onAddTask,
    };
  });

  // Add global error handler to suppress cross-origin errors from Gantt library
  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      if (event.message === "Script error." || 
          event.message.includes("cross-origin")) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    };

    window.addEventListener('error', errorHandler, true);
    return () => window.removeEventListener('error', errorHandler, true);
  }, []);

  useEffect(() => {
    if (typeof window.gantt === "undefined" || !ganttContainerRef.current)
      return;

    const gantt = window.gantt;

    // Função de setup, executada apenas uma vez.
    const setupGantt = () => {
      // Enable plugins
      gantt.plugins({
        zoom: true,
      });

      // Configuração base do Gantt
      gantt.config.date_format = "%Y-%m-%d";
      gantt.config.scale_height = 50;
      gantt.config.row_height = 40;
      gantt.config.task_height = 24;
      gantt.config.drag_links = true;
      gantt.config.drag_progress = true;
      gantt.config.drag_resize = true;
      gantt.config.drag_move = true;

      // Permite redimensionar a área da grelha arrastando a borda
      gantt.config.grid_resize = true;

      // Disable inline editors and the default lightbox
      gantt.config.readonly = true;
      gantt.showLightbox = () => {};
      
      gantt.config.scales = [
        { unit: "month", step: 1, format: "%F, %Y" },
        { unit: "day", step: 1, format: "%d, %D" },
      ];

      // Wrap all event handlers to prevent errors from propagating
      const safeEventHandler = (handler: Function) => {
        return (...args: any[]) => {
          try {
            return handler(...args);
          } catch (error) {
            console.error('Gantt event handler error:', error);
            return false;
          }
        };
      };

      // Eventos que usam o ref para aceder às props mais recentes
      gantt.attachEvent("onTaskDblClick", safeEventHandler((id: string) => {
        if (latestProps.current.editingTaskId) return false;
        if (latestProps.current.onEditTask) latestProps.current.onEditTask(id);
        return false;
      }));

      gantt.attachEvent(
        "onAfterTaskDrag",
        safeEventHandler((id: string, mode: string, task: any) => {
          const { onTasksUpdated } = latestProps.current;
          if (!onTasksUpdated) return;
          
          if (!task.start_date || !task.end_date) {
            console.warn('Invalid task dates after drag:', task);
            return;
          }
          
          const startDate = new Date(task.start_date);
          const endDate = new Date(task.end_date);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.warn('Invalid date values:', { start: task.start_date, end: task.end_date });
            return;
          }
          
          const adjustedEndDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
          
          onTasksUpdated(id, {
            startDate: startDate.toISOString().split("T")[0],
            endDate: adjustedEndDate.toISOString().split("T")[0],
          });
        }),
      );

      gantt.attachEvent("onAfterTaskUpdate", safeEventHandler((id: string, task: any) => {
        const { onTasksUpdated } = latestProps.current;
        if (!onTasksUpdated) return;
        
        if (!task.start_date || !task.end_date) {
          console.warn('Invalid task dates after update:', task);
          return;
        }
        
        const startDate = new Date(task.start_date);
        const endDate = new Date(task.end_date);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.warn('Invalid date values:', { start: task.start_date, end: task.end_date });
          return;
        }
        
        const adjustedEndDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

        onTasksUpdated(id, {
          name: task.text,
          startDate: startDate.toISOString().split("T")[0],
          endDate: adjustedEndDate.toISOString().split("T")[0],
          progress: Math.round(task.progress * 100),
          responsible: task.responsible,
        });
      }));

      gantt.attachEvent("onAfterLinkAdd", safeEventHandler((id: string, link: any) => {
        const { tasks, onTasksUpdated } = latestProps.current;
        const targetTask = tasks.find((t) => t.id === link.target);
        if (targetTask && onTasksUpdated) {
          const newDeps = [...targetTask.dependencies, link.source];
          onTasksUpdated(link.target, { dependencies: newDeps });
        }
      }));

      gantt.attachEvent("onAfterLinkDelete", safeEventHandler((id: string, link: any) => {
        const { tasks, onTasksUpdated } = latestProps.current;
        const targetTask = tasks.find((t) => t.id === link.target);
        if (targetTask && onTasksUpdated) {
          const newDeps = targetTask.dependencies.filter(
            (depId) => depId !== link.source,
          );
          onTasksUpdated(link.target, { dependencies: newDeps });
        }
      }));

      gantt.attachEvent("onBeforeTaskAdd", safeEventHandler(() => {
        if (latestProps.current.onEditTask) {
          latestProps.current.onEditTask("new");
        }
        return false;
      }));

      gantt.templates.task_class = (start, end, task) => {
        if (task.parent) {
          return "gantt_subtask";
        }
        return "";
      };

      gantt.init(ganttContainerRef.current!);
      isGanttInitialized.current = true;
    };

    if (!isGanttInitialized.current) {
      setupGantt();
    }

    // Gerenciamento do tema
    if (theme === "dark") {
      gantt.templates.scale_cell_class = () => "gantt_scale_cell_dark";
      gantt.templates.grid_cell_class = () => "gantt_grid_cell_dark";
      gantt.templates.task_cell_class = () => "gantt_task_cell_dark";
      gantt.templates.timeline_cell_class = () => "gantt_timeline_cell_dark";
      gantt.templates.grid_header_class = () => "gantt_grid_header_dark";
      gantt.templates.grid_row_class = () => "gantt_grid_row_dark";
      gantt.templates.task_row_class = () => "gantt_task_row_dark";

      if (!styleElementRef.current) {
        const style = document.createElement("style");
        style.textContent = `
          .gantt_grid_header_dark { background-color: hsl(var(--muted)) !important; color: hsl(var(--foreground)) !important; border-color: hsl(var(--border)) !important; }
          .gantt_scale_cell_dark, .gantt_grid_cell_dark, .gantt_task_cell_dark, .gantt_timeline_cell_dark, .gantt_grid_row_dark, .gantt_task_row_dark {
              background-color: hsl(var(--background)) !important;
              color: hsl(var(--foreground)) !important;
              border-color: hsl(var(--border)) !important;
          }
          .gantt_task_line { background-color: hsl(var(--primary) / 0.7) !important; border-color: hsl(var(--primary)) !important; }
          .gantt_task_progress { background-color: hsl(var(--primary)) !important; }
          .gantt_task_content { color: hsl(var(--primary-foreground)) !important; }
          .gantt_grid_data { background-color: hsl(var(--background)) !important; }
          .gantt_task_line.gantt_subtask { background-color: hsl(var(--secondary)) !important; border-color: hsl(var(--secondary-foreground)) !important; }
          .gantt_resizer {
            background-color: hsl(var(--border)) !important;
            cursor: col-resize !important;
          }
          .gantt_resizer:hover {
            background-color: hsl(var(--primary)) !important;
          }
        `;
        document.head.appendChild(style);
        styleElementRef.current = style;
      }
    } else {
      // Reset templates for light theme
      gantt.templates.scale_cell_class = () => "";
      gantt.templates.grid_cell_class = () => "";
      gantt.templates.task_cell_class = () => "";
      gantt.templates.timeline_cell_class = () => "";
      gantt.templates.grid_header_class = () => "";
      gantt.templates.grid_row_class = () => "";
      gantt.templates.task_row_class = () => "";

      if (styleElementRef.current) {
        styleElementRef.current.remove();
        styleElementRef.current = null;
      }
    }

    // Update columns based on visibility state
    const allColumns = [
      {
        name: "text",
        label: "Nome da Tarefa",
        tree: true,
        width: "*",
        resize: true,
      },
      {
        name: "start_date",
        label: "Início",
        align: "center",
        width: 90,
        resize: true,
      },
      {
        name: "duration",
        label: "Duração",
        align: "center",
        width: 70,
        resize: true,
      },
      {
        name: "responsible",
        label: "Responsável",
        align: "center",
        width: 120,
        resize: true,
        template: function (task: any) {
          return task.responsible || "";
        },
      },
    ];

    const visibleColumns = allColumns.filter(
      (col) => columnVisibility[col.name as keyof typeof columnVisibility]
    );

    gantt.config.columns = [
      { name: "add", label: "", width: 44, align: "center" },
      ...visibleColumns,
    ];

    // Carregar/Atualizar dados
    const formattedTasks = tasks.map((task) => {
      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);
      const duration =
        Math.round(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;

      return {
        id: task.id,
        text: task.name,
        start_date: startDate.toISOString().split("T")[0],
        duration: duration > 0 ? duration : 1,
        progress: task.progress / 100,
        parent: task.dependencies.length > 0 ? task.dependencies[0] : undefined,
        responsible: task.responsible,
        open: true,
      };
    });

    const links = tasks.flatMap((task) =>
      task.dependencies.map((depId) => ({
        id: `${depId}-${task.id}`,
        source: depId,
        target: task.id,
        type: "0", // Finish to Start
      })),
    );

    gantt.clearAll();
    gantt.parse({ data: formattedTasks, links: links });
    gantt.render();

    // Cleanup para o estilo injetado quando o componente desmonta
    return () => {
      if (styleElementRef.current) {
        styleElementRef.current.remove();
        styleElementRef.current = null;
      }
    };
  }, [tasks, theme, columnVisibility]);

  const handleZoomIn = () => {
    if (window.gantt) {
      window.gantt.ext.zoom.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (window.gantt) {
      window.gantt.ext.zoom.zoomOut();
    }
  };

  const handleScrollLeft = () => {
    if (window.gantt) {
      const scrollState = window.gantt.getScrollState();
      window.gantt.scrollTo(scrollState.x - 200, null);
    }
  };

  const handleScrollRight = () => {
    if (window.gantt) {
      const scrollState = window.gantt.getScrollState();
      window.gantt.scrollTo(scrollState.x + 200, null);
    }
  };

  const handleExport = () => {
    if (window.gantt) {
      window.gantt.exportToPNG({
        name: "gantt-chart.png",
        header: "<h1>My Gantt Chart</h1>",
        footer: `<h4>Exported on ${new Date().toLocaleDateString()}</h4>`,
      });
    }
  };

  return (
    <GanttErrorBoundary>
      <div className="flex flex-col h-full bg-background">
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={handleScrollLeft}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleScrollRight}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Exibir Colunas</h4>
                  <p className="text-sm text-muted-foreground">
                    Selecione as colunas para exibir no gráfico.
                  </p>
                </div>
                <div className="grid gap-2">
                  {Object.keys(columnVisibility).map((colName) => (
                    <div
                      key={colName}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={colName}
                        checked={
                          columnVisibility[
                            colName as keyof typeof columnVisibility
                          ]
                        }
                        onCheckedChange={(checked) => {
                          setColumnVisibility((prev) => ({
                            ...prev,
                            [colName]: checked,
                          }));
                        }}
                      />
                      <Label htmlFor={colName} className="capitalize">
                        {colName.replace("_", " ")}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
        <div
          ref={ganttContainerRef}
          style={{ width: "100%", height: "550px" }}
        ></div>
      </div>
    </GanttErrorBoundary>
  );
};

export default GanttChart;