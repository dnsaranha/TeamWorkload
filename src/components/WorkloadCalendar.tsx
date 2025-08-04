import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  taskService,
  employeeService,
  type Task,
  type Employee,
  type Project,
} from "@/lib/supabaseClient";
import {
  googleCalendarService,
  mockGoogleCalendarService,
  type CalendarIntegrationEvent,
} from "@/lib/googleCalendarService";

type TaskWithRelations = Task & {
  project: Project | null;
  assigned_employee: Employee | null;
};

type CalendarTask = {
  id: string;
  name: string;
  project: string;
  estimatedHours: number;
  startDate: Date;
  endDate: Date;
  employeeId: string;
  status?: "pending" | "in_progress" | "completed";
  completion_date?: string | null;
};

interface WorkloadCalendarProps {
  tasks?: CalendarTask[];
  employees?: Employee[];
  onTaskClick?: (task: CalendarTask) => void;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
}

const WorkloadCalendar = ({
  tasks = [],
  employees = [],
  onTaskClick = () => {},
  onDateRangeChange = () => {},
}: WorkloadCalendarProps) => {
  const [view, setView] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [dbEmployees, setDbEmployees] = useState<Employee[]>([]);
  const [dbTasks, setDbTasks] = useState<CalendarTask[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarIntegrationEvent[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [showGoogleEvents, setShowGoogleEvents] = useState(true);

  // Load data from database
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, employeesData] = await Promise.all([
        taskService.getAll(),
        employeeService.getAll(),
      ]);

      // Load Google Calendar events if authenticated
      let googleEventsData: CalendarIntegrationEvent[] = [];
      if (googleCalendarService.isAuthenticated()) {
        try {
          googleEventsData = await googleCalendarService.getEvents(
            "primary",
            startDate,
            endDate,
          );
        } catch (error) {
          console.error("Error loading Google Calendar events:", error);
          // Fallback to mock data if real API fails
          googleEventsData = await mockGoogleCalendarService.getEvents(
            startDate,
            endDate,
          );
        }
      } else {
        // Use mock data when not authenticated for demo purposes
        googleEventsData = await mockGoogleCalendarService.getEvents(
          startDate,
          endDate,
        );
      }

      // Transform tasks to match calendar format
      const calendarTasks: CalendarTask[] = (
        tasksData as TaskWithRelations[]
      ).map((task) => ({
        id: task.id,
        name: task.name,
        project: task.project?.name || "No project",
        estimatedHours: task.estimated_time,
        startDate: new Date(task.start_date),
        endDate: new Date(task.end_date),
        employeeId: task.assigned_employee_id || "",
        status: task.status || "pending",
        completion_date: task.completion_date,
      }));

      setDbTasks(calendarTasks);
      setDbEmployees(employeesData);
      setGoogleEvents(googleEventsData);
    } catch (error) {
      console.error("Error loading calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Use database data if available, otherwise use props
  const mockEmployees: Employee[] =
    employees.length > 0 ? employees : dbEmployees;
  const mockTasks: CalendarTask[] = tasks.length > 0 ? tasks : dbTasks;

  // Helper functions to navigate dates
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
    calculateDateRange(newDate, view);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    calculateDateRange(newDate, view);
  };

  const calculateDateRange = (date: Date, viewType: "week" | "month") => {
    const startDate = new Date(date);
    const endDate = new Date(date);

    if (viewType === "week") {
      // Set to beginning of week (Sunday)
      const day = startDate.getDay();
      startDate.setDate(startDate.getDate() - day);

      // Set to end of week (Saturday)
      endDate.setDate(startDate.getDate() + 6);
    } else {
      // Set to beginning of month
      startDate.setDate(1);

      // Set to end of month
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
    }

    onDateRangeChange(startDate, endDate);
    return { startDate, endDate };
  };

  // Calculate the date range based on current view and date
  const { startDate, endDate } = calculateDateRange(currentDate, view);

  // Format date range for display
  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  };

  // Generate days for the calendar based on view
  const generateDays = () => {
    const days = [];
    const currentDay = new Date(startDate);

    while (currentDay <= endDate) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return days;
  };

  const days = generateDays();

  // Calculate workload percentage for an employee on a specific day
  const calculateWorkload = (employeeId: string, date: Date) => {
    // Calculate hours from tasks
    const taskHours = mockTasks
      .filter(
        (task) =>
          task.employeeId === employeeId &&
          date >= task.startDate &&
          date <= task.endDate,
      )
      .reduce((total, task) => {
        // For completed tasks, only count hours up to completion date
        if (task.status === "completed" && task.completion_date) {
          const completionDate = new Date(task.completion_date);
          if (date > completionDate) {
            return total; // Don't count hours after completion
          }
        }

        // Distribute task hours evenly across days
        const taskDays = Math.max(
          1,
          Math.ceil(
            (task.endDate.getTime() - task.startDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
        );
        return total + task.estimatedHours / taskDays;
      }, 0);

    // Calculate hours from Google Calendar meetings (if enabled)
    const meetingHours = showGoogleEvents
      ? googleEvents
          .filter((event) => {
            const eventDate = new Date(event.startDate.toDateString());
            const targetDate = new Date(date.toDateString());
            return eventDate.getTime() === targetDate.getTime();
          })
          .reduce((total, event) => {
            // Calculate meeting duration in hours
            const durationMs =
              event.endDate.getTime() - event.startDate.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            return total + durationHours;
          }, 0)
      : 0;

    const totalHours = taskHours + meetingHours;

    const employee = mockEmployees.find((emp) => emp.id === employeeId);
    if (!employee) return 0;

    // Daily capacity (weekly hours / 5 workdays)
    const dailyCapacity = employee.weekly_hours / 5;

    // Skip weekends in workload calculation
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 0;

    return Math.round((totalHours / dailyCapacity) * 100);
  };

  // Determine color based on workload percentage
  const getWorkloadColor = (percentage: number) => {
    if (percentage > 100) return "bg-red-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Format date for column headers
  const formatColumnDate = (date: Date) => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      day: dayNames[date.getDay()],
      date: date.getDate(),
    };
  };

  // Drag and drop handlers
  const handleTaskDrop = async (
    taskId: string,
    newEmployeeId: string,
    newDate: Date,
  ) => {
    try {
      // Find the task to update
      const taskToUpdate = dbTasks.find((task) => task.id === taskId);
      if (!taskToUpdate) return;

      // Calculate original duration in days
      const originalDuration =
        Math.ceil(
          (taskToUpdate.endDate.getTime() - taskToUpdate.startDate.getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1; // Add 1 because end date is inclusive

      // Calculate new end date preserving the original duration
      const newEndDate = new Date(newDate);
      newEndDate.setDate(newEndDate.getDate() + originalDuration - 1);

      // Update task in database
      await taskService.update(taskId, {
        assigned_employee_id: newEmployeeId,
        start_date: newDate.toISOString().split("T")[0],
        end_date: newEndDate.toISOString().split("T")[0],
      });

      // Reload data to reflect changes
      loadData();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  // Handle task duration adjustment (for individual day portions)
  const handleTaskDurationAdjust = async (
    taskId: string,
    newStartDate: Date,
    newEndDate: Date,
  ) => {
    try {
      // Update task in database with new dates
      await taskService.update(taskId, {
        start_date: newStartDate.toISOString().split("T")[0],
        end_date: newEndDate.toISOString().split("T")[0],
      });

      // Reload data to reflect changes
      loadData();
    } catch (error) {
      console.error("Error adjusting task duration:", error);
    }
  };

  // Draggable Task Component with resize handles
  const DraggableTask = ({
    task,
    currentDate,
  }: {
    task: CalendarTask;
    currentDate: Date;
  }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: "task",
      item: {
        id: task.id,
        name: task.name,
        project: task.project,
        startDate: task.startDate,
        endDate: task.endDate,
        employeeId: task.employeeId,
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }));

    // Drag handles for resizing task duration
    const [{ isDraggingStart }, dragStart] = useDrag(() => ({
      type: "task-start",
      item: {
        id: task.id,
        type: "start",
        originalStartDate: task.startDate,
        originalEndDate: task.endDate,
        employeeId: task.employeeId,
      },
      collect: (monitor) => ({
        isDraggingStart: monitor.isDragging(),
      }),
    }));

    const [{ isDraggingEnd }, dragEnd] = useDrag(() => ({
      type: "task-end",
      item: {
        id: task.id,
        type: "end",
        originalStartDate: task.startDate,
        originalEndDate: task.endDate,
        employeeId: task.employeeId,
      },
      collect: (monitor) => ({
        isDraggingEnd: monitor.isDragging(),
      }),
    }));

    const getTaskStatusColor = () => {
      switch (task.status) {
        case "completed":
          return "bg-green-100 border-green-500";
        case "in_progress":
          return "bg-yellow-100 border-yellow-500";
        default:
          return "bg-blue-100 border-blue-500";
      }
    };

    const isFirstDay =
      currentDate.toDateString() === task.startDate.toDateString();
    const isLastDay =
      currentDate.toDateString() === task.endDate.toDateString();
    const isSingleDay =
      task.startDate.toDateString() === task.endDate.toDateString();

    return (
      <div
        className={`relative text-xs border-l-4 rounded ${getTaskStatusColor()} ${isDragging || isDraggingStart || isDraggingEnd ? "opacity-50" : ""}`}
      >
        {/* Resize handle for start date (left side) */}
        {(isFirstDay || isSingleDay) && (
          <div
            ref={dragStart}
            className="absolute left-0 top-0 w-2 h-full bg-blue-600 opacity-0 hover:opacity-50 cursor-w-resize z-10"
            title="Arrastar para ajustar data de início"
          />
        )}

        {/* Main task content - draggable for moving entire task */}
        <div
          ref={drag}
          className="p-1 cursor-move"
          onClick={() => onTaskClick(task)}
        >
          <div className="font-medium truncate">{task.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {task.project}
          </div>
          {task.status === "completed" && task.completion_date && (
            <div className="text-[9px] text-green-600">✓ Concluída</div>
          )}
        </div>

        {/* Resize handle for end date (right side) */}
        {(isLastDay || isSingleDay) && (
          <div
            ref={dragEnd}
            className="absolute right-0 top-0 w-2 h-full bg-blue-600 opacity-0 hover:opacity-50 cursor-e-resize z-10"
            title="Arrastar para ajustar data de término"
          />
        )}
      </div>
    );
  };

  // Google Calendar Event Component
  const GoogleCalendarEvent = ({
    event,
  }: {
    event: CalendarIntegrationEvent;
  }) => {
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    return (
      <div className="text-xs p-1 border-l-4 border-purple-500 bg-purple-50 rounded mb-1">
        <div className="font-medium truncate flex items-center">
          <span className="mr-1">📅</span>
          {event.title}
        </div>
        <div className="text-[10px] text-purple-600 truncate">
          {formatTime(event.startDate)} - {formatTime(event.endDate)}
        </div>
        {event.attendees && event.attendees.length > 0 && (
          <div className="text-[9px] text-purple-500">
            {event.attendees.length} participante(s)
          </div>
        )}
      </div>
    );
  };

  // Droppable Cell Component with support for task resizing
  const DroppableCell = ({
    employeeId,
    date,
    children,
  }: {
    employeeId: string;
    date: Date;
    children: React.ReactNode;
  }) => {
    const [{ isOver, draggedItem }, drop] = useDrop(() => ({
      accept: ["task", "task-start", "task-end"],
      drop: (item: any) => {
        if (item.type === "start") {
          // Adjusting start date
          const newStartDate = new Date(date);
          const originalEndDate = new Date(item.originalEndDate);

          // Ensure start date is not after end date
          if (newStartDate <= originalEndDate) {
            handleTaskDurationAdjust(item.id, newStartDate, originalEndDate);
          }
        } else if (item.type === "end") {
          // Adjusting end date
          const originalStartDate = new Date(item.originalStartDate);
          const newEndDate = new Date(date);

          // Ensure end date is not before start date
          if (newEndDate >= originalStartDate) {
            handleTaskDurationAdjust(item.id, originalStartDate, newEndDate);
          }
        } else {
          // Moving entire task
          handleTaskDrop(item.id, employeeId, date);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        draggedItem: monitor.getItem(),
      }),
    }));

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    // Different hover colors based on drag type
    let hoverColor = "";
    if (isOver && draggedItem) {
      if (draggedItem.type === "start") {
        hoverColor = "bg-green-50 border-green-300";
      } else if (draggedItem.type === "end") {
        hoverColor = "bg-red-50 border-red-300";
      } else {
        hoverColor = "bg-blue-50 border-blue-300";
      }
    }

    return (
      <td
        ref={drop}
        className={`p-2 border border-gray-100 ${isWeekend ? "bg-gray-50" : ""} ${hoverColor}`}
      >
        {children}
      </td>
    );
  };

  if (loading) {
    return (
      <Card className="w-full bg-white">
        <CardContent className="p-6">
          <div className="text-center">Loading calendar...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Card className="w-full bg-white">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Workload Calendar</CardTitle>
            <div className="flex items-center space-x-2">
              <Tabs
                defaultValue={view}
                onValueChange={(value) => {
                  const newView = value as "week" | "month";
                  setView(newView);
                  calculateDateRange(currentDate, newView);
                }}
              >
                <TabsList>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center space-x-2">
                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    <SelectItem value="website">Website Redesign</SelectItem>
                    <SelectItem value="mobile">Mobile App</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={showGoogleEvents ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (!googleCalendarService.isAuthenticated()) {
                      alert(
                        "Google Calendar não está conectado. Vá para Configurações de Perfil para conectar.",
                      );
                      return;
                    }
                    setShowGoogleEvents(!showGoogleEvents);
                  }}
                  className="flex items-center space-x-1"
                  disabled={!googleCalendarService.isAuthenticated()}
                >
                  <span>📅</span>
                  <span>Google Calendar</span>
                  {!googleCalendarService.isAuthenticated() && (
                    <span className="text-xs">(Desconectado)</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium">{formatDateRange()}</div>
              <Button variant="outline" size="icon" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Today
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <div>
              💡 Dica: Arraste e solte as tarefas para realocar rapidamente
              entre funcionários e datas
            </div>
            <div>
              🔧 Ajuste a duração: Arraste as bordas esquerda/direita das
              tarefas para ajustar início/fim
            </div>
            <div>
              📅 Google Calendar: Reuniões e eventos são exibidos em roxo e
              incluídos no cálculo de workload
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <div className="w-3 h-3 bg-green-50 border border-green-300 rounded mr-1"></div>
                Ajustar início
              </span>
              <span className="flex items-center">
                <div className="w-3 h-3 bg-red-50 border border-red-300 rounded mr-1"></div>
                Ajustar fim
              </span>
              <span className="flex items-center">
                <div className="w-3 h-3 bg-blue-50 border border-blue-300 rounded mr-1"></div>
                Mover tarefa
              </span>
              <span className="flex items-center">
                <div className="w-3 h-3 bg-purple-50 border border-purple-300 rounded mr-1"></div>
                Evento Google
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="p-2 border-b border-r min-w-[120px] sticky left-0 bg-white z-10">
                    Employee
                  </th>
                  {days.map((day, index) => {
                    const { day: dayName, date } = formatColumnDate(day);
                    return (
                      <th
                        key={index}
                        className="p-2 border-b text-center min-w-[80px]"
                      >
                        <div>{dayName}</div>
                        <div className="font-bold">{date}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {mockEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="p-2 border-r sticky left-0 bg-white z-10">
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {employee.role}
                      </div>
                    </td>
                    {days.map((day, dayIndex) => {
                      const workload = calculateWorkload(employee.id, day);
                      const workloadColor = getWorkloadColor(workload);
                      const isWeekend =
                        day.getDay() === 0 || day.getDay() === 6;

                      return (
                        <DroppableCell
                          key={dayIndex}
                          employeeId={employee.id}
                          date={day}
                        >
                          {!isWeekend && (
                            <div className="flex flex-col space-y-1">
                              {workload > 0 && (
                                <div
                                  className={`text-xs font-medium text-white rounded px-2 py-1 ${workloadColor}`}
                                >
                                  {workload}%
                                </div>
                              )}
                              {/* Google Calendar Events */}
                              {showGoogleEvents &&
                                googleEvents
                                  .filter((event) => {
                                    const eventDate = new Date(
                                      event.startDate.toDateString(),
                                    );
                                    const targetDate = new Date(
                                      day.toDateString(),
                                    );
                                    return (
                                      eventDate.getTime() ===
                                      targetDate.getTime()
                                    );
                                  })
                                  .map((event) => (
                                    <GoogleCalendarEvent
                                      key={event.id}
                                      event={event}
                                    />
                                  ))}
                              {/* Tasks */}
                              {mockTasks
                                .filter(
                                  (task) =>
                                    task.employeeId === employee.id &&
                                    day >= task.startDate &&
                                    day <= task.endDate,
                                )
                                .map((task) => (
                                  <DraggableTask
                                    key={`${task.id}-${day.toISOString()}`}
                                    task={task}
                                    currentDate={day}
                                  />
                                ))}
                            </div>
                          )}
                        </DroppableCell>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DndProvider>
  );
};

export default WorkloadCalendar;
