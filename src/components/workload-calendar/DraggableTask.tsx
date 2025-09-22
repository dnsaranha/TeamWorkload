import React from "react";
import { useDrag } from "react-dnd";
import { ItemTypes } from "../../lib/dnd";
import { Repeat } from "lucide-react";
import { TaskInstance } from "@/types/tasks";
import { Project, Employee } from "@/lib/supabaseClient";

interface DraggableTaskProps {
  task: TaskInstance;
  project?: Project | null;
  employee?: Employee | null;
  selectedEmployeeId?: string;
  onTaskClick: (task: TaskInstance) => void;
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
    item: { task },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      onClick={() => onTaskClick(task)}
      className={`text-xs p-1 bg-blue-50 border border-blue-200 rounded truncate cursor-pointer hover:bg-blue-100 ${
        isDragging ? "opacity-50 cursor-grabbing" : "cursor-grab"
      }`}
      title={`${task.name} - ${employee?.name} (${project?.name})`}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium text-blue-900 truncate">{task.name}</div>
        {task.is_recurring_instance && (
          <Repeat
            className="h-3 w-3 text-blue-400 flex-shrink-0"
            aria-label="Recurring task"
          />
        )}
      </div>
      {!selectedEmployeeId && employee && (
        <div className="text-blue-600 truncate">{employee.name}</div>
      )}
    </div>
  );
};

export default DraggableTask;
