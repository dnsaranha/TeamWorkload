import React, { useState, useEffect, useMemo } from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "../lib/dnd";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  Repeat,
  Search,
  Trash2,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  type Task,
  type Employee,
  type Project,
  taskService,
} from "@/lib/supabaseClient";
import { format } from "date-fns";
import { Input } from "./ui/input";

const dayNumberToName: { [key: number]: string } = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

interface WorkloadCalendarProps {
  selectedEmployeeId?: string;
  viewMode?: "weekly" | "monthly";
  dataVersion?: number;
  onTaskAssigned?: () => void;
}

const WorkloadCalendar: React.FC<WorkloadCalendarProps> = ({
  selectedEmployeeId,
  viewMode = "weekly",
  dataVersion = 0,
  onTaskAssigned = () => {},
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<
    (Task & { is_recurring_instance?: boolean; db_id?: string })[]
  >([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"weekly" | "monthly">(viewMode);
  const [searchTerm, setSearchTerm] = useState("");
  const [isWeekExpanded, setIsWeekExpanded] = useState(false);
  const [isDraggingTask, setIsDraggingTask] = useState(false);

  const [{ isOverRemove, canDropRemove }, dropRemove] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item: { id: string; originalTask?: Task }) =>
      handleRemoveTaskAllocation(item),
    canDrop: (item) =>
      item.originalTask && item.originalTask.assigned_employee_id !== null,
    collect: (monitor) => ({
      isOverRemove: !!monitor.isOver(),
      canDropRemove: !!monitor.canDrop(),
    }),
  }));

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find((e) => e.id === selectedEmployeeId);
  }, [selectedEmployeeId, employees]);

  useEffect(() => {
    loadData();
  }, [currentDate, selectedEmployeeId, dataVersion]);

  useEffect(() => {
    if (view === "monthly") {
      setIsWeekExpanded(false);
    }
  }, [view]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadTasks(), loadEmployees(), loadProjects()]);
    } catch (error) {
      console.error("Error loading calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      let query = supabase
        .from("workload_tasks")
        .select("*")
        .order("start_date", { ascending: true });

      if (selectedEmployeeId) {
        query = query.eq("assigned_employee_id", selectedEmployeeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const validStatusValues = ["pending", "in_progress", "completed"];
      const cleanedData = (data || []).map((task) => {
        if (!validStatusValues.includes(task.status)) {
          return { ...task, status: "pending" };
        }
        return task;
      });

      setTasks(cleanedData);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("workload_projects")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
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
      return searchMatch;
    });
  }, [tasks, searchTerm, projects, employees]);

  const getWeekDates = (date: Date) => {
    const week = [];
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const dayOfMonth = date.getUTCDate();
    const dayOfWeek = date.getUTCDay(); // 0 for Sunday, 1 for Monday, etc.

    // Find the date of the Sunday for the current week
    const sundayDate = new Date(Date.UTC(year, month, dayOfMonth - dayOfWeek));

    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(sundayDate.valueOf());
      weekDay.setUTCDate(sundayDate.getUTCDate() + i);
      week.push(weekDay);
    }
    return week;
  };

  const getMonthDates = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();

    // First day of the month in UTC
    const firstDay = new Date(Date.UTC(year, month, 1));
    // Last day of the month in UTC
    const lastDay = new Date(Date.UTC(year, month + 1, 0));

    // Find the Sunday of the week where the month starts
    const startDate = new Date(firstDay.valueOf());
    startDate.setUTCDate(startDate.getUTCDate() - firstDay.getUTCDay());

    // Find the Saturday of the week where the month ends
    const endDate = new Date(lastDay.valueOf());
    endDate.setUTCDate(endDate.getUTCDate() + (6 - lastDay.getUTCDay()));

    const dates = [];
    const current = new Date(startDate.valueOf());

    while (current <= endDate) {
      dates.push(new Date(current.valueOf()));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
  };

  const getTasksForDate = (
    date: Date,
  ): (Task & { is_recurring_instance?: boolean; db_id?: string })[] => {
    const dayOfWeekName = dayNumberToName[date.getUTCDay()];

    if (selectedEmployee) {
      const workDays = selectedEmployee.dias_de_trabalho || [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ];
      if (!workDays.includes(dayOfWeekName)) {
        return [];
      }
    }

    const dayTasks: (Task & {
      is_recurring_instance?: boolean;
      db_id?: string;
    })[] = [];
    const dateStr = date.toISOString().split("T")[0];

    filteredTasks.forEach((task) => {
      const taskStart = new Date(task.start_date + "T00:00:00Z");
      const taskEnd = new Date(task.end_date + "T00:00:00Z");

      if (task.repeats_weekly && task.repeat_days && dayOfWeekName) {
        if (
          date >= taskStart &&
          date <= taskEnd &&
          task.repeat_days.includes(dayOfWeekName)
        ) {
          dayTasks.push({
            ...task,
            id: `${task.id}-${dateStr}`,
            db_id: task.id, // Preserve original DB id
            start_date: dateStr,
            end_date: dateStr,
            estimated_time: task.hours_per_day || 0,
            is_recurring_instance: true,
          });
        }
      } else {
        if (date >= taskStart && date <= taskEnd) {
          dayTasks.push(task);
        }
      }
    });

    return dayTasks;
  };

  const calculateDayWorkload = (date: Date, employeeId?: string) => {
    const dayTasks = getTasksForDate(date);
    const filteredTasksByEmployee = employeeId
      ? dayTasks.filter((task) => task.assigned_employee_id === employeeId)
      : dayTasks;

    const dayOfWeekName = dayNumberToName[date.getUTCDay()];

    // For single employee view, if it's not a workday, they have 0 capacity.
    if (employeeId) {
      const employee = employees.find((emp) => emp.id === employeeId);
      // Default to Mon-Fri if dias_de_trabalho is not set.
      const workDays = employee?.dias_de_trabalho || [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ];
      const isWorkDay = workDays.includes(dayOfWeekName);

      if (!isWorkDay) {
        return { hours: 0, percentage: 0, capacity: 0 };
      }
    }

    const totalHours = filteredTasksByEmployee.reduce((sum, task) => {
      if (task.is_recurring_instance) {
        return sum + task.estimated_time;
      }

      const startDate = new Date(task.start_date + "T00:00:00Z");
      const endDate = new Date(task.end_date + "T00:00:00Z");

      let workingDays = 0;
      const tempDate = new Date(startDate.valueOf());
      const taskEmployee = employees.find(
        (emp) => emp.id === task.assigned_employee_id,
      );

      // Default to Mon-Fri if not specified
      const employeeWorkDays = taskEmployee?.dias_de_trabalho || [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ];

      while (tempDate <= endDate) {
        const currentDayName = dayNumberToName[tempDate.getUTCDay()];
        if (employeeWorkDays.includes(currentDayName)) {
          workingDays++;
        }
        tempDate.setUTCDate(tempDate.getUTCDate() + 1);
      }

      const daysDiff = Math.max(1, workingDays);
      return sum + task.estimated_time / daysDiff;
    }, 0);

    if (employeeId) {
      const employee = employees.find((emp) => emp.id === employeeId);
      const numWorkDays = employee?.dias_de_trabalho?.length || 5;
      const dailyCapacity =
        employee && numWorkDays > 0 ? employee.weekly_hours / numWorkDays : 0;

      return {
        hours: totalHours,
        percentage:
          dailyCapacity > 0 ? (totalHours / dailyCapacity) * 100 : 0,
        capacity: dailyCapacity,
      };
    }

    // For all employees view, calculate average workload
    const totalCapacity = employees.reduce((sum, emp) => {
      const workDays = emp.dias_de_trabalho || [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ];
      const isWorkDay = workDays.includes(dayOfWeekName);

      if (!isWorkDay) {
        return sum;
      }

      const numWorkDays = workDays.length || 5;
      const dailyCapacity =
        numWorkDays > 0 ? emp.weekly_hours / numWorkDays : 0;
      return sum + dailyCapacity;
    }, 0);

    return {
      hours: totalHours,
      percentage: totalCapacity > 0 ? (totalHours / totalCapacity) * 100 : 0,
      capacity: totalCapacity,
    };
  };

  const getWorkloadColor = (percentage: number) => {
    if (percentage > 100) return "bg-red-100 border-red-300 text-red-800";
    if (percentage >= 50)
      return "bg-yellow-100 border-yellow-300 text-yellow-800";
    return "bg-green-100 border-green-300 text-green-800";
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (view === "weekly") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setMonth(
        currentDate.getMonth() + (direction === "next" ? 1 : -1),
      );
    }
    setCurrentDate(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  const getEmployee = (employeeId: string) => {
    return employees.find((emp) => emp.id === employeeId);
  };

  const getProject = (projectId: string) => {
    return projects.find((proj) => proj.id === projectId);
  };

  const handleDropTask = async (
    item: { id: string; originalTask?: Task },
    date: Date,
    employeeId?: string,
  ) => {
    const { id: taskId, originalTask } = item;
    const formattedDate = date.toISOString().split("T")[0];

    // If there's an originalTask, it's a task being moved *within* the calendar.
    if (originalTask) {
      try {
        const taskDuration =
          new Date(originalTask.end_date).getTime() -
          new Date(originalTask.start_date).getTime();
        const newEndDate = new Date(date.getTime() + taskDuration);
        const formattedEndDate = newEndDate.toISOString().split("T")[0];

        await taskService.update(taskId, {
          start_date: formattedDate,
          end_date: formattedEndDate,
          assigned_employee_id:
            employeeId || originalTask.assigned_employee_id,
        });
        onTaskAssigned();
      } catch (error) {
        console.error("Failed to move task", error);
      }
    } else {
      // This is an unassigned task being dropped from outside.
      if (!employeeId) {
        console.warn("No employee selected to assign the task to.");
        return;
      }
      try {
        await taskService.update(taskId, {
          assigned_employee_id: employeeId,
          start_date: formattedDate,
          end_date: formattedDate, // Assumes single-day task for now
        });
        onTaskAssigned();
      } catch (error) {
        console.error("Failed to assign task", error);
      }
    }
  };

  const handleRemoveTaskAllocation = async (item: {
    id: string;
    originalTask?: Task;
  }) => {
    try {
      await taskService.update(item.id, {
        assigned_employee_id: null,
        start_date: null,
        end_date: null,
      });
      onTaskAssigned();
    } catch (error) {
      console.error("Failed to un-assign task", error);
    }
  };

  const dates =
    view === "weekly" ? getWeekDates(currentDate) : getMonthDates(currentDate);

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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Workload Calendar
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setView("weekly")}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  view === "weekly"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setView("monthly")}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  view === "monthly"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10"
              />
            </div>
            <button
              onClick={() => navigateDate("prev")}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-lg font-medium text-gray-900">
              {view === "weekly"
                ? `Week of ${formatDate(dates[0])}`
                : currentDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
            </span>
            <button
              onClick={() => navigateDate("next")}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-gray-600">Under-utilized (&lt;50%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-gray-600">Optimal (50-100%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-gray-600">Overloaded (&gt;100%)</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        className={`p-6 ${
          view === "weekly" ? "cursor-pointer group" : ""
        }`}
        onClick={() => {
          if (view === "weekly") {
            setIsWeekExpanded(!isWeekExpanded);
          }
        }}
      >
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-gray-500 border-b border-gray-200"
            >
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {dates.map((date, index) => {
            const dayOfWeekName = dayNumberToName[date.getUTCDay()];
            let isWorkDay = true;
            if (selectedEmployee) {
              const workDays = selectedEmployee.dias_de_trabalho || [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
              ];
              isWorkDay = workDays.includes(dayOfWeekName);
            }

            const dayTasks = getTasksForDate(date);
            const workload = calculateDayWorkload(date, selectedEmployeeId);
            const isCurrentMonth =
              date.getUTCMonth() === currentDate.getUTCMonth();
            const today = new Date();
            const isToday =
              date.getUTCFullYear() === today.getUTCFullYear() &&
              date.getUTCMonth() === today.getUTCMonth() &&
              date.getUTCDate() === today.getUTCDate();

            return (
              <DayCell
                key={index}
                date={date}
                employeeId={selectedEmployeeId}
                onDropTask={handleDropTask}
              >
                <div
                  className={`${
                    isWeekExpanded && view === "weekly" ? "" : "min-h-[120px]"
                  } p-2 border border-gray-200 rounded-lg ${
                    isCurrentMonth ? "bg-white" : "bg-gray-50"
                  } ${
                    !isWorkDay && selectedEmployeeId ? "bg-gray-100" : ""
                  } ${isToday ? "ring-2 ring-blue-500" : ""}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-medium ${
                        isCurrentMonth ? "text-gray-900" : "text-gray-400"
                      } ${
                        !isWorkDay && selectedEmployeeId ? "text-gray-400" : ""
                      }`}
                    >
                      {date.getUTCDate()}
                    </span>
                    {isWorkDay && workload.percentage > 0 && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold ${getWorkloadColor(
                          workload.percentage,
                        )}`}
                      >
                        {Math.round(workload.percentage)}%
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {isWorkDay &&
                      (isWeekExpanded && view === "weekly"
                        ? dayTasks
                        : dayTasks.slice(0, 3)
                      ).map((task) => {
                        const employee = getEmployee(task.assigned_employee_id);
                        const project = getProject(task.project_id);

                        const employee = getEmployee(task.assigned_employee_id);
                        const project = getProject(task.project_id);

                        return (
                          <DraggableTask
                            key={task.id}
                            task={task}
                            employee={employee}
                            project={project}
                            selectedEmployeeId={selectedEmployeeId}
                            onDragChange={setIsDraggingTask}
                          />
                        );
                      })}

                    {!isWeekExpanded &&
                      view === "weekly" &&
                      isWorkDay &&
                      dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                  </div>

                  {isWorkDay && workload.hours > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {workload.hours.toFixed(1)}h
                        </div>
                        {workload.capacity > 0 && (
                          <div className="text-xs text-gray-500">
                            /{workload.capacity.toFixed(1)}h
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </DayCell>
            );
          })}
        </div>
      </div>
      {isDraggingTask && (
        <div
          ref={dropRemove}
          className={`fixed bottom-4 right-4 flex items-center gap-4 p-4 rounded-lg transition-all duration-300 ${
            canDropRemove
              ? "bg-red-100 text-red-700 shadow-lg"
              : "bg-gray-100 text-gray-500"
          } ${isOverRemove && canDropRemove ? "scale-110 bg-red-200" : ""}`}
        >
          <Trash2 className="h-8 w-8" />
          <div>
            <h3 className="font-bold">Un-assign Task</h3>
            <p className="text-sm">
              Drop here to remove the task from the calendar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface DraggableTaskProps {
  task: Task & { is_recurring_instance?: boolean; db_id?: string };
  employee?: Employee;
  project?: Project;
  selectedEmployeeId?: string;
  onDragChange: (isDragging: boolean) => void;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({
  task,
  employee,
  project,
  selectedEmployeeId,
  onDragChange,
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: { id: task.db_id || task.id, originalTask: task },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    begin: () => onDragChange(true),
    end: () => onDragChange(false),
  }));

  return (
    <div
      ref={drag}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="text-xs p-1 bg-blue-50 border border-blue-200 rounded truncate cursor-move"
      title={`${task.name} - ${employee?.name} (${project?.name})`}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium text-blue-900 truncate">
          {task.name}
        </div>
        {task.is_recurring_instance && (
          <Repeat
            className="h-3 w-3 text-blue-400 flex-shrink-0"
            aria-label="Recurring task"
          />
        )}
      </div>
      {!selectedEmployeeId && employee && (
        <div className="text-blue-600 truncate">
          {employee.name}
        </div>
      )}
    </div>
  );
};

interface DayCellProps {
  date: Date;
  employeeId?: string;
  onDropTask: (item: { id: string; originalTask?: Task }, date: Date, employeeId?: string) => void;
  children: React.ReactNode;
}

const DayCell: React.FC<DayCellProps> = ({ date, employeeId, onDropTask, children }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item: { id: string; originalTask?: Task }) => onDropTask(item, date, employeeId),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [date, employeeId, onDropTask]);

  return (
    <div
      ref={drop}
      className={`relative ${isOver ? "bg-blue-100" : ""}`}
    >
      {children}
    </div>
  );
};

export default WorkloadCalendar;
