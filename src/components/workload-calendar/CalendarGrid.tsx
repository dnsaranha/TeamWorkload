import React from "react";
import { PlusCircle, MinusCircle, Clock } from "lucide-react";
import {
  dayNumberToName,
  getWorkloadColor,
  calculateDayWorkload,
} from "./utils";
import DayCell from "./DayCell";
import DraggableTask from "./DraggableTask";
import {
  TaskInstance,
  TaskWithRelations,
  EditableOccurrence,
} from "@/types/tasks";
import { Employee, Project } from "@/lib/supabaseClient";

interface CalendarGridProps {
  view: "weekly" | "monthly";
  dates: Date[];
  selectedEmployee?: Employee | null;
  getTasksForDate: (date: Date) => TaskInstance[];
  selectedEmployeeId?: string;
  isWeekExpanded: boolean;
  setIsWeekExpanded: (isExpanded: boolean) => void;
  openEditDialog: (task: TaskWithRelations | TaskInstance) => void;
  getEmployee: (employeeId: string) => Employee | undefined;
  getProject: (projectId: string) => Project | undefined;
  handleDropTask: (
    item: { task: TaskInstance },
    date: Date,
    employeeId?: string
  ) => void;
  employees: Employee[];
  currentDate: Date;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  view,
  dates,
  selectedEmployee,
  getTasksForDate,
  selectedEmployeeId,
  isWeekExpanded,
  setIsWeekExpanded,
  openEditDialog,
  getEmployee,
  getProject,
  handleDropTask,
  employees,
  currentDate,
}) => {
  return (
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
          const workload = calculateDayWorkload(
            date,
            getTasksForDate,
            employees,
            selectedEmployeeId
          );
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
                        workload.percentage
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

                      return (
                        <DraggableTask
                          key={`${task.id}-${task.instanceDate}`}
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
  );
};

export default CalendarGrid;
