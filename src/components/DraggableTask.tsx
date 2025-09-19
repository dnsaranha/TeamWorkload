import React from "react";
import { useDrag } from "react-dnd";
import { type Task } from "@/lib/supabaseClient";

interface DraggableTaskProps {
  task: Task;
}

export const ItemTypes = {
  TASK: "task",
};

const DraggableTask: React.FC<DraggableTaskProps> = ({ task }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: { id: task.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`p-2 rounded-lg border cursor-grab ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
    >
      <h4 className="font-medium text-sm">{task.name}</h4>
      <p className="text-xs text-muted-foreground">
        {/* @ts-ignore */}
        {task.project?.name || "No project"}
      </p>
    </div>
  );
};

export default DraggableTask;
