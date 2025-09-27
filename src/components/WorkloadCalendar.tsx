import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  type Task,
  type Employee,
  type Project,
  taskService,
} from "@/lib/supabaseClient";
import { CalendarHeader } from "./workload/CalendarHeader";
import { CalendarGrid } from "./workload/CalendarGrid";
import { DeallocationZone } from "./workload/DeallocationZone";
import { EditTaskDialog } from "./workload/EditTaskDialog";

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

    const dayTasks: (Task & { is_recurring_instance?: boolean })[] = [];
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

    if (employeeId) {
      const employee = employees.find((emp) => emp.id === employeeId);
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
    let formattedEndDate = formattedStartDate;

    if (originalTask) {
      const originalStartDate = new Date(
        originalTask.start_date + "T00:00:00Z",
      );
      const originalEndDate = new Date(originalTask.end_date + "T00:00:00Z");
      const durationInMillis =
        originalEndDate.getTime() - originalStartDate.getTime();
      const newEndDate = new Date(newStartDate.getTime() + durationInMillis);
      formattedEndDate = newEndDate.toISOString().split("T")[0];
    }

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

    try {
      const updateData = {
        ...currentTask,
        project_id:
          currentTask.project_id === "none" ? null : currentTask.project_id,
        assigned_employee_id:
          currentTask.assigned_employee_id === "none"
            ? null
            : currentTask.assigned_employee_id,
        completion_date:
          currentTask.status === "completed" && currentTask.completion_date
            ? currentTask.completion_date
            : null,
        repeat_days: currentTask.repeats_weekly
          ? currentTask.repeat_days
          : null,
        hours_per_day: currentTask.repeats_weekly
          ? currentTask.hours_per_day
          : null,
        special_marker:
          currentTask.special_marker === "none"
            ? null
            : currentTask.special_marker,
      };

      const updatedTask = await taskService.update(currentTask.id, updateData);
      setTasks(
        tasks.map((task) =>
          task.id === currentTask.id ? (updatedTask as Task) : task,
        ),
      );
      setCurrentTask(null);
      setIsEditTaskDialogOpen(false);
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Erro ao atualizar tarefa. Verifique os dados e tente novamente.");
    }
  };

  const handleCurrentTaskChange = (
    field: keyof Task,
    value: string | number | boolean | string[] | null,
  ) => {
    if (currentTask) {
      setCurrentTask({ ...currentTask, [field]: value });
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
      <CalendarHeader
        view={view}
        onViewChange={setView}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onNavigate={navigateDate}
        currentDate={currentDate}
        dates={dates}
        isWeekExpanded={isWeekExpanded}
        onToggleWeekExpansion={() => setIsWeekExpanded(!isWeekExpanded)}
      />
      <CalendarGrid
        view={view}
        dates={dates}
        getTasksForDate={getTasksForDate}
        calculateDayWorkload={calculateDayWorkload}
        getWorkloadColor={getWorkloadColor}
        selectedEmployeeId={selectedEmployeeId}
        selectedEmployee={selectedEmployee}
        getEmployee={getEmployee}
        getProject={getProject}
        onDropTask={handleDropTask}
        onTaskClick={(task) => {
          setCurrentTask(task);
          setIsEditTaskDialogOpen(true);
        }}
        isWeekExpanded={isWeekExpanded}
        currentDate={currentDate}
        dayNumberToName={dayNumberToName}
      />
      <DeallocationZone onDropTask={handleDeallocateTask} />
      <EditTaskDialog
        isOpen={isEditTaskDialogOpen}
        onOpenChange={setIsEditTaskDialogOpen}
        currentTask={currentTask}
        onCurrentTaskChange={handleCurrentTaskChange}
        projects={projects}
        employees={employees}
        onSubmit={handleUpdateTask}
        handleCurrentTaskRepeatDayChange={handleCurrentTaskRepeatDayChange}
      />
    </div>
  );
};

export default WorkloadCalendar;