import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface Task {
  id: string;
  name: string;
  description?: string;
  estimated_time: number;
  start_date: string;
  end_date: string;
  assigned_employee_id: string;
  project_id: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  weekly_hours: number;
  skills: string[];
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "on_hold";
  created_at: string;
  updated_at: string;
}

interface WorkloadCalendarProps {
  selectedEmployeeId?: string;
  viewMode?: "weekly" | "monthly";
}

const WorkloadCalendar: React.FC<WorkloadCalendarProps> = ({
  selectedEmployeeId,
  viewMode = "weekly",
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"weekly" | "monthly">(viewMode);

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
      setTasks(data || []);
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

  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);

    // Adjust to start from Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());
    // Adjust to end on Saturday
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const dates = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return tasks.filter((task) => {
      const taskStart = task.start_date;
      const taskEnd = task.end_date;

      // Handle same-day tasks (start_date equals end_date)
      if (taskStart === taskEnd) {
        return taskStart === dateStr;
      }

      // Handle multi-day tasks
      return dateStr >= taskStart && dateStr <= taskEnd;
    });
  };

  const calculateDayWorkload = (date: Date, employeeId?: string) => {
    const dayTasks = getTasksForDate(date);
    const filteredTasks = employeeId
      ? dayTasks.filter((task) => task.assigned_employee_id === employeeId)
      : dayTasks;

    const totalHours = filteredTasks.reduce((sum, task) => {
      // For multi-day tasks, distribute hours evenly across days
      const startDate = new Date(task.start_date);
      const endDate = new Date(task.end_date);
      const daysDiff = Math.max(
        1,
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1,
      );
      return sum + task.estimated_time / daysDiff;
    }, 0);

    if (employeeId) {
      const employee = employees.find((emp) => emp.id === employeeId);
      const dailyCapacity = employee ? employee.weekly_hours / 5 : 8; // Assume 5 working days
      return {
        hours: totalHours,
        percentage: (totalHours / dailyCapacity) * 100,
        capacity: dailyCapacity,
      };
    }

    // For all employees view, calculate average workload
    const totalEmployees = employees.length;
    const averageCapacity =
      totalEmployees > 0
        ? employees.reduce((sum, emp) => sum + emp.weekly_hours, 0) /
          totalEmployees /
          5
        : 8;

    return {
      hours: totalHours,
      percentage:
        totalEmployees > 0
          ? (totalHours / (averageCapacity * totalEmployees)) * 100
          : 0,
      capacity: averageCapacity * totalEmployees,
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
            <button
              onClick={() => navigateDate("prev")}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
                        <div className="font-medium text-blue-900 truncate">
                          {task.name}
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
