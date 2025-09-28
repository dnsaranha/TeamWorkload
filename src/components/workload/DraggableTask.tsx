import React from "react";
import { useDrag } from "react-dnd";
import { ItemTypes } from "../../lib/dnd";
import { Repeat, CheckCircle2 } from "lucide-react";
import { Task, Project, Employee } from "@/lib/supabaseClient";

interface DraggableTaskProps {
  task: Task & { is_recurring_instance?: boolean; is_completed?: boolean };
  project?: Project;
  employee?: Employee;
  selectedEmployeeId?: string;
  onTaskClick: (task: Task) => void;
}

export const DraggableTask: React.FC<DraggableTaskProps> = ({
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

  const taskClasses = task.is_completed
    ? "bg-green-50 border-green-200 hover:bg-green-100"
    : "bg-blue-50 border-blue-200 hover:bg-blue-100";

  const textClasses = task.is_completed ? "text-green-900" : "text-blue-900";
  const employeeNameClasses = task.is_completed
    ? "text-green-600"
    : "text-blue-600";
  const iconClasses = task.is_completed ? "text-green-400" : "text-blue-400";

  return (
    <div
      ref={drag}
      onClick={() => onTaskClick(task)}
      className={`text-xs p-1 rounded truncate cursor-pointer border ${taskClasses} ${
        isDragging ? "opacity-50 cursor-grabbing" : "cursor-grab"
      }`}
      title={`${task.name} - ${employee?.name} (${project?.name})`}
    >
      <div className="flex items-center justify-between">
        <div className={`font-medium truncate ${textClasses}`}>
          {task.name}
        </div>
        <div className="flex items-center space-x-1">
          {task.is_completed && (
            <CheckCircle2
              className={`h-3 w-3 flex-shrink-0 ${iconClasses}`}
              aria-label="Completed task"
            />
          )}
          {task.is_recurring_instance && !task.is_completed && (
            <Repeat
              className={`h-3 w-3 flex-shrink-0 ${iconClasses}`}
              aria-label="Recurring task"
            />
          )}
        </div>
      </div>
      {!selectedEmployeeId && employee && (
        <div className={`truncate ${employeeNameClasses}`}>
          {employee.name}
        </div>
      )}
    </div>
  );
};