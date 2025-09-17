import React, { useState, useEffect } from "react";
import WorkloadCalendar from "./WorkloadCalendar";
import WorkloadSummary from "./WorkloadSummary";
import DetailedWeekView from "./DetailedWeekView";
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
  const [view, setView] = useState<'summary' | 'detailed'>('summary');
  const [detailedWeekStart, setDetailedWeekStart] = useState<Date | null>(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleWeekClick = (weekStartDate: Date) => {
    setDetailedWeekStart(weekStartDate);
    setView('detailed');
  };

  const handleGoBackToSummary = () => {
    setView('summary');
    setDetailedWeekStart(null);
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

  const getWeekDates = (startDate: Date) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-6 h-full">
        <div className="flex-1">
          {view === 'summary' ? (
            <WorkloadCalendar
              tasks={tasks}
              employees={employees}
              projects={projects}
              selectedEmployeeId={selectedEmployeeId}
              onWeekClick={handleWeekClick}
            />
          ) : (
            detailedWeekStart && (
              <DetailedWeekView
                tasks={tasks}
                employees={employees}
                projects={projects}
                weekDates={getWeekDates(detailedWeekStart)}
                onTaskDrop={handleTaskDrop}
                onTaskUpdate={handleTaskUpdate}
                onGoBack={handleGoBackToSummary}
              />
            )
          )}
        </div>
        <div className="w-96">
          <WorkloadSummary
            tasks={tasks}
            employees={employees}
            projects={projects}
            selectedEmployeeId={selectedEmployeeId}
            onEmployeeSelect={setSelectedEmployeeId}
          />
        </div>
      </div>
    </DndProvider>
  );
};

export default WorkloadView;
