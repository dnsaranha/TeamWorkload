import React from "react";
import { useDrag } from "react-dnd";
import { type Task, type Project } from "@/lib/supabaseClient";

export const ItemTypes = {
  TASK: 'task',
}

export type TaskWithProject = Task & {
  project: Project | null;
};

export interface DragItem {
  task: TaskWithProject;
  type: string;
}

export const DraggableTask = ({ task }: { task: TaskWithProject }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: { task, type: ItemTypes.TASK },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`p-2 mb-2 bg-white border border-gray-200 rounded-lg shadow-sm cursor-move transition-opacity ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
      title={`${task.name} - ${task.estimated_time}h - ${task.project?.name || "No project"}`}
    >
      <div className="font-medium text-sm text-gray-900 truncate">
        {task.name}
      </div>
      <div className="text-xs text-gray-600">
        {task.estimated_time}h
        {task.project && ` - ${task.project.name}`}
      </div>
    </div>
  );
};
