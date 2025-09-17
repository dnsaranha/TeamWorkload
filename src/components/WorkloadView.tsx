import React, { useState, useEffect } from "react";
import WorkloadCalendar from "./WorkloadCalendar";
import WorkloadSummary from "./WorkloadSummary";
import ExpandedDayView from "./ExpandedDayView";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  taskService,
  employeeService,
  projectService,
  type Task,
  type Employee,
  type Project,
} from "@/lib/supabaseClient";

type TaskWithRelations = Task & {
  project: Project | null;
  assigned_employee: Employee | null;
};

const WorkloadView = () => {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [expandedDay, setExpandedDay] = useState<{
    date: Date;
    employeeId: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, employeesData, projectsData] = await Promise.all([
        taskService.getAll(),
        employeeService.getAll(),
        projectService.getAll(),
      ]);

      setTasks(tasksData as TaskWithRelations[]);
      setEmployees(employeesData);
      setProjects(projectsData);
    } catch (error) {
      console.error("Error loading workload data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskDrop = async (
    taskId: string,
    employeeId: string,
    date: string,
  ) => {
    try {
      const updatedTask = await taskService.update(taskId, {
        assigned_employee_id: employeeId,
        start_date: date,
        end_date: date, // Or calculate a more appropriate end date
      });

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? (updatedTask as TaskWithRelations) : task,
        ),
      );
    } catch (error) {
      console.error("Error updating task on drop:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleDayExpand = (date: Date, employeeId: string) => {
    setExpandedDay({ date, employeeId });
  };

  const handleCloseExpandedDay = () => {
    setExpandedDay(null);
  };

  const handleTaskUpdate = async (task: Task) => {
    try {
      const updatedTask = await taskService.update(task.id, task);
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === task.id ? (updatedTask as TaskWithRelations) : t,
        ),
      );
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleTaskUnassign = async (taskId: string) => {
    try {
      const updatedTask = await taskService.update(taskId, {
        assigned_employee_id: null,
      });
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === taskId ? (updatedTask as TaskWithRelations) : t,
        ),
      );
    } catch (error) {
      console.error("Error unassigning task:", error);
    }
  };

  const handleTaskDeallocate = async (taskId: string) => {
    try {
      const updatedTask = await taskService.update(taskId, {
        assigned_employee_id: null,
      });
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === taskId ? (updatedTask as TaskWithRelations) : t,
        ),
      );
    } catch (error) {
      console.error("Error deallocating task:", error);
    }
  };

  const getTasksForDay = (date: Date, employeeId: string) => {
    const dateStr = date.toISOString().split("T")[0];
    return tasks.filter(
      (task) =>
        task.assigned_employee_id === employeeId &&
        task.start_date <= dateStr &&
        task.end_date >= dateStr,
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-6 h-full">
        <div className="flex-1">
          <WorkloadCalendar
            tasks={tasks}
            employees={employees}
            projects={projects}
            selectedEmployeeId={selectedEmployeeId}
            onTaskDrop={handleTaskDrop}
            onDayClick={handleDayExpand}
          />
        </div>
        <div className="w-96">
          <WorkloadSummary
            tasks={tasks}
            employees={employees}
            projects={projects}
            selectedEmployeeId={selectedEmployeeId}
            onEmployeeSelect={setSelectedEmployeeId}
            onTaskDeallocate={handleTaskDeallocate}
          />
        </div>
        {expandedDay && (
          <ExpandedDayView
            date={expandedDay.date}
            employee={employees.find((e) => e.id === expandedDay.employeeId)!}
            tasks={getTasksForDay(expandedDay.date, expandedDay.employeeId)}
            projects={projects}
            onClose={handleCloseExpandedDay}
            onTaskUpdate={handleTaskUpdate}
            onTaskUnassign={handleTaskUnassign}
          />
        )}
      </div>
    </DndProvider>
  );
};

export default WorkloadView;
