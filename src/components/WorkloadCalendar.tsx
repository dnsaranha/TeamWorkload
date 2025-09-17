import React, { useState, useMemo } from "react";
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
import { useDrop } from "react-dnd";
import {
  type Task,
  type Employee,
  type Project,
} from "@/lib/supabaseClient";
import { Input } from "./ui/input";
import { calculateDayWorkload, getTasksForDate } from "@/lib/workloadUtils";

interface WorkloadCalendarProps {
  tasks: (Task & { is_recurring_instance?: boolean })[];
  employees: Employee[];
  projects: Project[];
  selectedEmployeeId?: string;
  viewMode?: "weekly" | "monthly";
  onWeekClick?: (weekStartDate: Date) => void;
  onTaskDrop: (taskId: string, employeeId: string, date: string) => void;
}

const WorkloadCalendar: React.FC<WorkloadCalendarProps> = ({
  tasks,
  employees,
  projects,
  selectedEmployeeId,
  viewMode = "weekly",
  onWeekClick,
  onTaskDrop,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"weekly" | "monthly">(viewMode);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find((e) => e.id === selectedEmployeeId);
  }, [selectedEmployeeId, employees]);

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
    const dayOfWeek = date.getUTCDay();

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
    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    const startDate = new Date(firstDay.valueOf());
    startDate.setUTCDate(startDate.getUTCDate() - firstDay.getUTCDay());
    const endDate = new Date(lastDay.valueOf());
    endDate.setUTCDate(endDate.getUTCDate() + (6 - lastDay.getUTCDay()));
    const dates = [];
    let current = new Date(startDate.valueOf());
    while (current <= endDate) {
      dates.push(new Date(current.valueOf()));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
      <div className="p-6">
        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-gray-500 border-b border-gray-200"
            >
              {day}
            </div>
          ))}
          {Array.from({ length: dates.length / 7 }).map((_, weekIndex) => (
            <div
              key={weekIndex}
              className="contents"
              onClick={() => onWeekClick && onWeekClick(dates[weekIndex * 7])}
            >
              {dates.slice(weekIndex * 7, weekIndex * 7 + 7).map((date, dayIndex) => {
                const dayTasks = getTasksForDate(date, filteredTasks, selectedEmployee);
                const workload = calculateDayWorkload(date, filteredTasks, employees, selectedEmployeeId);
                const isCurrentMonth = date.getUTCMonth() === currentDate.getUTCMonth();
                const isToday = date.toDateString() === new Date().toDateString();

                const [{ isOver, canDrop }, drop] = useDrop(() => ({
                  accept: "task",
                  drop: (item: { task: Task }) => {
                    if (selectedEmployeeId) {
                      onTaskDrop(item.task.id, selectedEmployeeId, date.toISOString().split("T")[0]);
                    }
                  },
                  canDrop: () => !!selectedEmployeeId,
                  collect: (monitor) => ({
                    isOver: monitor.isOver(),
                    canDrop: monitor.canDrop(),
                  }),
                }), [selectedEmployeeId, date, onTaskDrop]);

                return (
                  <div
                    ref={drop}
                    key={dayIndex}
                    className={`min-h-[120px] p-2 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${
                      isCurrentMonth ? "bg-white" : "bg-gray-50"
                    } ${
                      !selectedEmployee ? "cursor-default hover:bg-transparent" : ""
                    } ${isToday ? "ring-2 ring-blue-500" : ""} ${isOver && canDrop ? 'bg-blue-100' : ''}`}
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkloadCalendar;
