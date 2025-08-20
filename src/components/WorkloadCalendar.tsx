import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  Repeat,
  Search,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  type Task,
  type Employee,
  type Project,
} from "@/lib/supabaseClient";
import { Input } from "./ui/input";

interface WorkloadCalendarProps {
  selectedEmployeeId?: string;
  viewMode?: "weekly" | "monthly";
}

const WorkloadCalendar: React.FC<WorkloadCalendarProps> = ({
  selectedEmployeeId,
  viewMode = "weekly",
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

  useEffect(() => {
    loadData();
  }, [currentDate, selectedEmployeeId]);

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
    const dayTasks: (Task & { is_recurring_instance?: boolean })[] = [];
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getUTCDay(); // FIX: Use UTC day
    const dayNameToNumber: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const dayNumberToName = Object.keys(dayNameToNumber).find(
      (key) => dayNameToNumber[key] === dayOfWeek,
    );

    filteredTasks.forEach((task) => {
      // FIX: Parse all dates as UTC to ensure correct comparison
      const taskStart = new Date(task.start_date + "T00:00:00Z");
      const taskEnd = new Date(task.end_date + "T00:00:00Z");

      if (task.repeats_weekly && task.repeat_days && dayNumberToName) {
        if (
          date >= taskStart &&
          date <= taskEnd &&
          task.repeat_days.includes(dayNumberToName)
        ) {
          dayTasks.push({
            ...task,
            id: `${task.id}-${dateStr}`,
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

    // Check if it's weekend
    const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6; // FIX: Use UTC day

    const totalHours = filteredTasksByEmployee.reduce((sum, task) => {
      // For recurring instances, estimated_time is already hours_per_day
      if (task.is_recurring_instance) {
        return sum + task.estimated_time;
      }

      // For multi-day tasks, distribute hours evenly across days
      const startDate = new Date(task.start_date + "T00:00:00Z");
      const endDate = new Date(task.end_date + "T00:00:00Z");

      // Calculate working days between start and end date, considering employee's weekend work preference
      let workingDays = 0;
      const tempDate = new Date(startDate.valueOf());
      const employee = employees.find(
        (emp) => emp.id === task.assigned_employee_id,
      );
      const worksWeekends = employee?.trabalha_fim_de_semana || false;

      while (tempDate <= endDate) {
        const dayOfWeek = tempDate.getUTCDay(); // FIX: Use UTC day
        const isCurrentWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (!isCurrentWeekend || worksWeekends) {
          workingDays++;
        }

        tempDate.setUTCDate(tempDate.getUTCDate() + 1); // FIX: Use UTC date setter
      }

      const daysDiff = Math.max(1, workingDays);

      // If current date is weekend and employee doesn't work weekends, don't count hours
      if (employeeId && isWeekend) {
        const employee = employees.find((emp) => emp.id === employeeId);
        const worksWeekends = employee?.trabalha_fim_de_semana || false;
        if (!worksWeekends) {
          return sum; // Don't add hours for weekend days
        }
      }

      return sum + task.estimated_time / daysDiff;
    }, 0);

    if (employeeId) {
      const employee = employees.find((emp) => emp.id === employeeId);
      const worksWeekends = employee?.trabalha_fim_de_semana || false;

      // If it's weekend and employee doesn't work weekends, return zero capacity
      if (isWeekend && !worksWeekends) {
        return {
          hours: 0,
          percentage: 0,
          capacity: 0,
        };
      }

      // Calculate daily capacity based on whether employee works weekends
      const workingDaysPerWeek = worksWeekends ? 7 : 5;
      const dailyCapacity = employee
        ? employee.weekly_hours / workingDaysPerWeek
        : 8;

      return {
        hours: totalHours,
        percentage: (totalHours / dailyCapacity) * 100,
        capacity: dailyCapacity,
      };
    }

    // For all employees view, calculate average workload
    const totalEmployees = employees.length;
    if (totalEmployees === 0) {
      return {
        hours: totalHours,
        percentage: 0,
        capacity: 0,
      };
    }

    // Calculate average capacity considering each employee's weekend work preference
    const totalCapacity = employees.reduce((sum, emp) => {
      const worksWeekends = emp.trabalha_fim_de_semana || false;
      const workingDaysPerWeek = worksWeekends ? 7 : 5;
      const dailyCapacity = emp.weekly_hours / workingDaysPerWeek;

      // If it's weekend, only count employees who work weekends
      if (isWeekend && !worksWeekends) {
        return sum;
      }

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
    });
  };

  const getEmployee = (employeeId: string) => {
    return employees.find((emp) => emp.id === employeeId);
  };

  const getProject = (projectId: string) => {
    return projects.find((proj) => proj.id === projectId);
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
        <div
          className={`grid gap-2 ${
            view === "weekly" ? "grid-cols-7" : "grid-cols-7"
          }`}
        >
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
            const dayTasks = getTasksForDate(date);
            const workload = calculateDayWorkload(date, selectedEmployeeId);
            const isCurrentMonth =
              view === "monthly"
                ? date.getMonth() === currentDate.getMonth()
                : true;
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border border-gray-200 rounded-lg ${
                  isCurrentMonth ? "bg-white" : "bg-gray-50"
                } ${isToday ? "ring-2 ring-blue-500" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-sm font-medium ${
                      isCurrentMonth ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {workload.percentage > 0 && (
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
                  {dayTasks.slice(0, 3).map((task) => {
                    const employee = getEmployee(task.assigned_employee_id);
                    const project = getProject(task.project_id);

                    return (
                      <div
                        key={task.id}
                        className="text-xs p-1 bg-blue-50 border border-blue-200 rounded truncate"
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
                  })}

                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>

                {workload.hours > 0 && (
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
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkloadCalendar;
