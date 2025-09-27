import React, { useState, useEffect, useMemo } from "react";
import { useDrag, useDrop } from "react-dnd";
import { ItemTypes } from "../lib/dnd";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Clock,
  AlertTriangle,
  Repeat,
  Search,
  PlusCircle,
  MinusCircle,
  Trash2,
  ChevronsUpDown,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  type Task,
  type Employee,
  type Project,
  type TaskException,
  taskService,
} from "@/lib/supabaseClient";
import { format } from "date-fns";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { ScrollArea } from "./ui/scroll-area";

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
    (Task & { is_recurring_instance?: boolean })[]
  >([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"weekly" | "monthly">(viewMode);
  const [searchTerm, setSearchTerm] = useState("");
  const [isWeekExpanded, setIsWeekExpanded] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [editingExceptionDate, setEditingExceptionDate] = useState<
    string | null
  >(null);
  const [activeException, setActiveException] =
    useState<Partial<TaskException> | null>(null);

  useEffect(() => {
    if (currentTask && editingExceptionDate) {
      const exception =
        currentTask.exceptions?.find(
          (ex) => ex.date === editingExceptionDate,
        ) || {};
      setActiveException(exception);
    } else {
      setActiveException(null);
    }
  }, [currentTask, editingExceptionDate]);

  const handleActiveExceptionChange = (field: string, value: any) => {
    setActiveException((prev) => ({ ...prev, [field]: value }));
  };

  const openEditDialog = (
    task: Task & { is_recurring_instance?: boolean },
  ) => {
    // If it's a recurring instance, we need to find the original task
    if (task.is_recurring_instance) {
      // The instance ID is in the format "original_id-YYYY-MM-DD"
      // A UUID is 36 chars long.
      const originalId = task.id.substring(0, 36);
      const originalTask = tasks.find((t) => t.id === originalId);

      if (originalTask) {
        setCurrentTask(originalTask);
        // The date of the instance is the start_date of the temporary task object
        setEditingExceptionDate(task.start_date);
        setIsEditTaskDialogOpen(true);
      } else {
        alert("Could not find the original recurring task to edit.");
      }
    } else {
      // This is a normal, non-recurring task
      setCurrentTask(task);
      setEditingExceptionDate(null);
      setIsEditTaskDialogOpen(true);
    }
  };

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
  ): (Task & { is_recurring_instance?: boolean })[] => {
    const dayOfWeekName = dayNumberToName[date.getUTCDay()];

    // If a specific employee is selected, check if it's a working day for them.
    // If not, no tasks should be shown for this day.
    if (selectedEmployee) {
      const workDays = selectedEmployee.dias_de_trabalho || [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ];
      if (!workDays.includes(dayOfWeekName)) {
        return []; // Return empty array for non-working days
      }
    }

    const dayTasks: (Task & { is_recurring_instance?: boolean })[] = [];
    const dateStr = date.toISOString().split("T")[0];

    filteredTasks.forEach((task) => {
      const taskStart = new Date(task.start_date + "T00:00:00Z");
      const taskEnd = new Date(task.end_date + "T00:00:00Z");

      if (task.repeats_weekly && task.repeat_days && dayOfWeekName) {
        if (date >= taskStart && date <= taskEnd) {
          const exception = (task.exceptions || []).find(
            (ex) => ex.date === dateStr,
          );

          if (exception) {
            if (exception.removed) {
              return; // Não renderiza a tarefa neste dia
            }
            // Aplica a exceção
            dayTasks.push({
              ...task,
              id: `${task.id}-${dateStr}`, // ID único para a instância
              start_date: dateStr,
              end_date: dateStr,
              estimated_time:
                exception.estimated_hours ?? task.hours_per_day ?? 0,
              assigned_employee_id:
                exception.assigned_employee_id ?? task.assigned_employee_id,
              status: exception.completed ? "completed" : task.status,
              is_recurring_instance: true,
              name: exception.completed ? `✓ ${task.name}` : task.name, // Adiciona um checkmark
            });
          } else if (task.repeat_days.includes(dayOfWeekName)) {
            // Renderiza a ocorrência normal se não houver exceção
            dayTasks.push({
              ...task,
              id: `${task.id}-${dateStr}`,
              start_date: dateStr,
              end_date: dateStr,
              estimated_time: task.hours_per_day || 0,
              is_recurring_instance: true,
            });
          }
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
    taskId: string,
    newStartDate: Date,
    employeeId?: string,
  ) => {
    if (!employeeId) {
      console.warn("No employee selected to assign the task to.");
      return;
    }

    const originalTask = tasks.find((task) => task.id === taskId);

    const formattedStartDate = newStartDate.toISOString().split("T")[0];
    let formattedEndDate = formattedStartDate; // Default for new tasks

    // If the task already exists in the calendar, it's a reschedule. Preserve duration.
    if (originalTask) {
      // Ensure dates are parsed correctly as UTC to avoid timezone issues.
      const originalStartDate = new Date(originalTask.start_date + "T00:00:00Z");
      const originalEndDate = new Date(originalTask.end_date + "T00:00:00Z");
      const durationInMillis =
        originalEndDate.getTime() - originalStartDate.getTime();

      const newEndDate = new Date(newStartDate.getTime() + durationInMillis);
      formattedEndDate = newEndDate.toISOString().split("T")[0];
    }
    // If originalTask is not found, it's a new allocation.
    // The default formattedEndDate (same as start date) will be used.

    try {
      await taskService.update(taskId, {
        assigned_employee_id: employeeId,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
      });
      onTaskAssigned();
    } catch (error) {
      console.error("Failed to update task", error);
    }
  };

  const handleDeallocateTask = async (taskId: string) => {
    try {
      await taskService.update(taskId, {
        assigned_employee_id: null,
      });
      onTaskAssigned();
    } catch (error) {
      console.error("Failed to de-allocate task", error);
    }
  };

  const handleUpdateTask = async () => {
    if (!currentTask) return;

    let finalExceptions = [...(currentTask.exceptions || [])];

    if (editingExceptionDate && activeException) {
      const existingIndex = finalExceptions.findIndex(
        (ex) => ex.date === editingExceptionDate,
      );

      const isDefault =
        (activeException.estimated_hours === undefined ||
          activeException.estimated_hours === null) &&
        (activeException.assigned_employee_id === undefined ||
          activeException.assigned_employee_id === null) &&
        !activeException.completed &&
        !activeException.removed;

      if (existingIndex > -1) {
        if (isDefault) {
          finalExceptions.splice(existingIndex, 1);
        } else {
          finalExceptions[existingIndex] = {
            ...finalExceptions[existingIndex],
            ...activeException,
            date: editingExceptionDate,
          };
        }
      } else if (!isDefault) {
        finalExceptions.push({
          date: editingExceptionDate,
          estimated_hours: activeException.estimated_hours,
          assigned_employee_id: activeException.assigned_employee_id,
          completed: activeException.completed,
          removed: activeException.removed,
        });
      }
    }

    try {
      const updateData = {
        ...currentTask,
        exceptions: finalExceptions,
      };

      // Ensure we don't try to save the temporary `is_recurring_instance` flag
      delete (updateData as any).is_recurring_instance;

      const updatedTask = await taskService.update(currentTask.id, updateData);

      const updatedTasks = tasks.map((task) =>
        task.id === currentTask.id ? (updatedTask as Task) : task,
      );

      setTasks(updatedTasks);
      setCurrentTask(null);
      setIsEditTaskDialogOpen(false);
      setEditingExceptionDate(null);
      setActiveException(null);
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Erro ao atualizar tarefa. Verifique os dados e tente novamente.");
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
              <CalendarIcon className="h-5 w-5 mr-2" />
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
      <div className="p-6">
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-gray-500 border-b border-gray-200 flex items-center justify-center"
            >
              <span>{day}</span>
              {view === "weekly" && day === "Sat" && (
                <button
                  onClick={() => setIsWeekExpanded(!isWeekExpanded)}
                  className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title={isWeekExpanded ? "Collapse week" : "Expand week"}
                >
                  {isWeekExpanded ? (
                    <MinusCircle className="h-4 w-4" />
                  ) : (
                    <PlusCircle className="h-4 w-4" />
                  )}
                </button>
              )}
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
                        const employee = getEmployee(
                          task.assigned_employee_id,
                        );
                        const project = getProject(task.project_id);

                        return (
                          <DraggableTask
                            key={task.id}
                            task={task}
                            employee={employee}
                            project={project}
                            selectedEmployeeId={selectedEmployeeId}
                            onTaskClick={openEditDialog}
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
      <DeallocationZone onDropTask={handleDeallocateTask} />

      {/* Edit Task Dialog */}
      <Dialog
        open={isEditTaskDialogOpen}
        onOpenChange={(isOpen) => {
          setIsEditTaskDialogOpen(isOpen);
          if (!isOpen) {
            setEditingExceptionDate(null);
            setActiveException(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[550px]">
          {currentTask && editingExceptionDate ? (
            // UI de Edição de Exceção
            <>
              <DialogHeader>
                <DialogTitle>Editar Ocorrência da Tarefa</DialogTitle>
                <DialogDescription>
                  Alterações aplicadas apenas para a data{" "}
                  <strong>
                    {format(
                      new Date(editingExceptionDate + "T00:00:00Z"),
                      "dd/MM/yyyy",
                    )}
                  </strong>
                  .
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Horas Estimadas para este dia</Label>
                  <Input
                    type="number"
                    placeholder={`Padrão: ${currentTask.hours_per_day}h`}
                    value={activeException?.estimated_hours ?? ""}
                    onChange={(e) =>
                      handleActiveExceptionChange(
                        "estimated_hours",
                        e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsável para este dia</Label>
                  <Select
                    value={activeException?.assigned_employee_id ?? "none"}
                    onValueChange={(value) =>
                      handleActiveExceptionChange(
                        "assigned_employee_id",
                        value === "none" ? undefined : value,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Padrão da tarefa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        Padrão (
                        {employees.find(
                          (e) => e.id === currentTask.assigned_employee_id,
                        )?.name || "N/A"}
                        )
                      </SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="completed"
                    checked={activeException?.completed ?? false}
                    onChange={(e) =>
                      handleActiveExceptionChange("completed", e.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor="completed">Marcar como realizada</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="removed"
                    checked={activeException?.removed ?? false}
                    onChange={(e) =>
                      handleActiveExceptionChange("removed", e.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor="removed">
                    Remover esta ocorrência do calendário
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" onClick={handleUpdateTask}>
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </>
          ) : (
            // UI de Edição de Tarefa Normal
            currentTask && (
              <>
                <DialogHeader>
                  <DialogTitle>Edit Task</DialogTitle>
                  <DialogDescription>
                    Update task details and time estimates.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[75vh]">
                  <div className="grid gap-4 p-4">
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
                      <Input
                        id="edit-startDate"
                        type="date"
                        value={currentTask.start_date}
                        onChange={(e) =>
                          setCurrentTask({
                            ...currentTask,
                            start_date: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-endDate" className="text-right">
                        End Date
                      </Label>
                      <Input
                        id="edit-endDate"
                        type="date"
                        value={currentTask.end_date}
                        onChange={(e) =>
                          setCurrentTask({
                            ...currentTask,
                            end_date: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-project" className="text-right">
                        Project
                      </Label>
                      <Select
                        onValueChange={(value) =>
                          setCurrentTask({
                            ...currentTask,
                            project_id: value,
                          })
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
                            assigned_employee_id:
                              value === "none" ? null : value,
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
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-status" className="text-right">
                        Status
                      </Label>
                      <Select
                        onValueChange={(
                          value: "pending" | "in_progress" | "completed",
                        ) =>
                          setCurrentTask({ ...currentTask, status: value })
                        }
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
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <Button type="submit" onClick={handleUpdateTask}>
                    Update Task
                  </Button>
                </DialogFooter>
              </>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface DraggableTaskProps {
  task: Task & { is_recurring_instance?: boolean };
  project?: Project;
  employee?: Employee;
  selectedEmployeeId?: string;
  onTaskClick: (task: Task) => void;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({
  task,
  project,
  employee,
  selectedEmployeeId,
  onTaskClick,
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: { id: task.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const isCompleted = task.status === "completed";

  return (
    <div
      ref={drag}
      onClick={() => onTaskClick(task)}
      className={`text-xs p-1 rounded truncate cursor-pointer ${
        isDragging
          ? "opacity-50 cursor-grabbing"
          : "cursor-grab"
      } ${
        isCompleted
          ? "bg-green-100 border border-green-300 text-green-900 hover:bg-green-200"
          : "bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100"
      }`}
      title={`${task.name} - ${employee?.name} (${project?.name})`}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium truncate">{task.name}</div>
        {task.is_recurring_instance && !isCompleted && (
          <Repeat
            className="h-3 w-3 text-blue-400 flex-shrink-0"
            aria-label="Recurring task"
          />
        )}
      </div>
      {!selectedEmployeeId && employee && (
        <div
          className={
            isCompleted ? "text-green-700 truncate" : "text-blue-600 truncate"
          }
        >
          {employee.name}
        </div>
      )}
    </div>
  );
};

const DeallocationZone: React.FC<{ onDropTask: (taskId: string) => void }> = ({
  onDropTask,
}) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item: { id: string }) => onDropTask(item.id),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`p-4 m-6 mt-0 border-2 border-dashed rounded-lg text-center transition-colors ${
        isOver && canDrop ? "border-red-500 bg-red-100" : "border-gray-300"
      }`}
    >
      <div className="flex flex-col items-center justify-center text-gray-500 pointer-events-none">
        <Trash2 className="h-8 w-8 mb-2" />
        <p>Arraste uma tarefa aqui para desalocar.</p>
      </div>
    </div>
  );
};

interface DayCellProps {
  date: Date;
  employeeId?: string;
  onDropTask: (taskId: string, date: Date, employeeId?: string) => void;
  children: React.ReactNode;
}

const DayCell: React.FC<DayCellProps> = ({
  date,
  employeeId,
  onDropTask,
  children,
}) => {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ItemTypes.TASK,
      drop: (item: { id: string }) => onDropTask(item.id, date, employeeId),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [date, employeeId, onDropTask],
  );

  return (
    <div ref={drop} className={`relative ${isOver ? "bg-blue-100" : ""}`}>
      {children}
    </div>
  );
};

export default WorkloadCalendar;