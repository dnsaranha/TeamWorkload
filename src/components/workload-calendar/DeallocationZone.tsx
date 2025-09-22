import React from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "@/lib/dnd";
import { Trash2 } from "lucide-react";
import { TaskInstance } from "@/types/tasks";

const DeallocationZone: React.FC<{
  onDropTask: (item: { task: TaskInstance }) => void;
}> = ({ onDropTask }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item: { task: TaskInstance }) => onDropTask(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`p-4 m-6 mt-0 border-2 border-dashed rounded-lg text-center transition-colors ${
        isOver && canDrop ? "border-red-500 bg-red-100" : "border-gray-300"
      }`}
    >
      <div className="flex flex-col items-center justify-center text-gray-500 pointer-events-none">
        <Trash2 className="h-8 w-8 mb-2" />
        <p>Arraste uma tarefa aqui para desalocar.</p>
      </div>
    </div>
  );
};

export default DeallocationZone;
