import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  type Task,
  type Employee,
  type Project,
  type Exception,
  taskService,
} from "@/lib/supabaseClient";
import EditTaskModal from "@/components/EditTaskModal";
import { TaskInstance, TaskWithRelations } from "@/types/tasks";
import CalendarHeader from "./workload-calendar/CalendarHeader";
import CalendarGrid from "./workload-calendar/CalendarGrid";
import DeallocationZone from "./workload-calendar/DeallocationZone";
import {
  getWeekDates,
  getMonthDates,
  getTasksForDate as getTasksForDateUtil,
} from "./workload-calendar/utils";

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"weekly" | "monthly">(viewMode);
  const [searchTerm, setSearchTerm] = useState("");
  const [isWeekExpanded, setIsWeekExpanded] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<
    TaskWithRelations | TaskInstance | null
  >(null);

  const openEditDialog = (task: TaskWithRelations | TaskInstance) => {
    setCurrentTask(task);
    setIsEditTaskDialogOpen(true);
  };

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find((e) => e.id === selectedEmployeeId);
  }, [selectedEmployeeId, employees]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksData, employeesData, projectsData] = await Promise.all([
        taskService.getAll(),
        supabase.from("employees").select("*").order("name", { ascending: true }),
        supabase.from("workload_projects").select("*").order("name", { ascending: true }),
      ]);

      if (tasksData) {
        const validStatusValues = ["pending", "in_progress", "completed"];
        const cleanedData = (tasksData as Task[]).map((task) => {
          if (!validStatusValues.includes(task.status)) {
            return { ...task, status: "pending" };
          }
          return task;
        });
        setTasks(cleanedData);
      }
      if (employeesData.data) setEmployees(employeesData.data);
      if (projectsData.data) setProjects(projectsData.data);
    } catch (error) {
      console.error("Error loading calendar data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, dataVersion]);

  useEffect(() => {
    if (view === "monthly") {
      setIsWeekExpanded(false);
    }
  }, [view]);

  const filteredTasks = useMemo(() => {
    let tasksToFilter = tasks;
    if (selectedEmployeeId) {
      tasksToFilter = tasks.filter(
        (t) => t.assigned_employee_id === selectedEmployeeId
      );
    }
    return tasksToFilter.filter((task) => {
      const searchMatch =
        !searchTerm ||
        searchTerm
          .toLowerCase()
          .split(" ")
          .every((word) => {
            const project = projects.find((p) => p.id === task.project_id);
            const employee = employees.find(
              (e) => e.id === task.assigned_employee_id
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
  }, [tasks, searchTerm, projects, employees, selectedEmployeeId]);

  const getTasksForDate = useCallback(
    (date: Date): TaskInstance[] => {
      return getTasksForDateUtil(
        date,
        filteredTasks,
        projects,
        employees,
        selectedEmployee
      );
    },
    [filteredTasks, projects, employees, selectedEmployee]
  );

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (view === "weekly") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setMonth(
        currentDate.getMonth() + (direction === "next" ? 1 : -1)
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

  const handleUpdateException = async (
    taskId: string,
    exceptionData: Partial<Exception>
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const otherExceptions =
      task.exceptions?.filter((ex) => ex.date !== exceptionData.date) || [];
    const newExceptions = [...otherExceptions, exceptionData as Exception];

    try {
      const updatedTask = await taskService.update(taskId, {
        exceptions: newExceptions,
      });
      const newTasks = tasks.map((t) =>
        t.id === taskId ? (updatedTask as Task) : t
      );
      setTasks(newTasks);
    } catch (error) {
      console.error("Failed to update exception:", error);
    }
  };

  const handleDropTask = async (
    item: { task: TaskInstance },
    newDate: Date,
    employeeId?: string
  ) => {
    if (!employeeId) {
      alert("Please select an employee to assign the task to.");
      return;
    }

    const { task } = item;
    const newDateStr = newDate.toISOString().split("T")[0];

    if (task.is_recurring_instance) {
      const instanceDate = task.instanceDate;
      const originalException =
        task.exceptions?.find((ex) => ex.date === instanceDate) || {};
      const otherExceptions =
        task.exceptions?.filter(
          (ex) => ex.date !== instanceDate && ex.date !== newDateStr
        ) || [];

      const newExceptions: Exception[] = [
        ...otherExceptions,
        {
          date: instanceDate,
          is_removed: true,
          assigned_employee_id:
            originalException.assigned_employee_id ??
            task.assigned_employee_id,
          estimated_time:
            originalException.estimated_time ?? task.hours_per_day,
        },
        {
          date: newDateStr,
          is_removed: false,
          assigned_employee_id:
            employeeId ??
            originalException.assigned_employee_id ??
            task.assigned_employee_id,
          estimated_time:
            originalException.estimated_time ?? task.hours_per_day,
        },
      ];

      try {
        await taskService.update(task.id, { exceptions: newExceptions });
        onTaskAssigned();
      } catch (error) {
        console.error("Failed to create exception for recurring task", error);
      }
    } else {
      const originalStartDate = new Date(task.start_date + "T00:00:00Z");
      const originalEndDate = new Date(task.end_date + "T00:00:00Z");
      const duration = originalEndDate.getTime() - originalStartDate.getTime();
      const newEndDate = new Date(newDate.getTime() + duration);

      try {
        await taskService.update(task.id, {
          start_date: newDateStr,
          end_date: newEndDate.toISOString().split("T")[0],
          assigned_employee_id: employeeId,
        });
        onTaskAssigned();
      } catch (error) {
        console.error("Failed to update task", error);
      }
    }
  };

  const handleDeallocateTask = async (item: { task: TaskInstance }) => {
    const { task } = item;
    if (!task) return;

    if (task.is_recurring_instance && task.instanceDate) {
      const otherExceptions =
        task.exceptions?.filter((ex) => ex.date !== task.instanceDate) || [];
      const newException: Exception = {
        date: task.instanceDate,
        is_removed: true,
      };
      const newExceptions = [...otherExceptions, newException];

      try {
        await taskService.update(task.id, { exceptions: newExceptions });
        loadData();
      } catch (error) {
        console.error("Failed to de-allocate task instance", error);
      }
    } else {
      // Deallocate the entire task
      try {
        await taskService.update(task.id, { assigned_employee_id: null });
        loadData();
      } catch (error) {
        console.error("Failed to de-allocate task", error);
      }
    }
  };

  const handleUpdateTask = async () => {
    if (!currentTask) return;

    if (
      (currentTask as TaskInstance).is_recurring_instance &&
      (currentTask as TaskInstance).instanceDate
    ) {
      // We are editing an exception, not the main task
      const instance = currentTask as TaskInstance;
      await handleUpdateException(instance.id, {
        date: instance.instanceDate,
        assigned_employee_id: instance.assigned_employee_id,
        estimated_time: instance.estimated_time,
      });
    } else {
      // We are editing the main task
      const {
        project,
        assigned_employee,
        isException,
        is_recurring_instance,
        instanceDate,
        ...taskData
      } = currentTask as any;

      try {
        await taskService.update(taskData.id, taskData);
      } catch (error) {
        console.error("Error updating task:", error);
        alert(
          "Erro ao atualizar tarefa. Verifique os dados e tente novamente."
        );
      }
    }
    loadData();
    setIsEditTaskDialogOpen(false);
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
        setView={setView}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        navigateDate={navigateDate}
        currentDate={currentDate}
        dates={dates}
      />
      <CalendarGrid
        view={view}
        dates={dates}
        selectedEmployee={selectedEmployee}
        getTasksForDate={getTasksForDate}
        selectedEmployeeId={selectedEmployeeId}
        isWeekExpanded={isWeekExpanded}
        setIsWeekExpanded={setIsWeekExpanded}
        openEditDialog={openEditDialog}
        getEmployee={getEmployee}
        getProject={getProject}
        handleDropTask={handleDropTask}
        employees={employees}
        currentDate={currentDate}
      />
      <DeallocationZone onDropTask={handleDeallocateTask} />
      <EditTaskModal
        isOpen={isEditTaskDialogOpen}
        onClose={() => setIsEditTaskDialogOpen(false)}
        task={currentTask}
        setTask={setCurrentTask}
        handleUpdate={handleUpdateTask}
        employees={employees}
        projects={projects}
        source="calendar"
        editingOccurrences={[]}
        onUpdateException={async (exceptionData) => {
          if (currentTask) {
            await handleUpdateException(currentTask.id, exceptionData);
          }
        }}
      />
    </div>
  );
};

export default WorkloadCalendar;
