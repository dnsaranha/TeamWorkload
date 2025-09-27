import React from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "../../lib/dnd";

interface DayCellProps {
  date: Date;
  employeeId?: string;
  onDropTask: (taskId: string, date: Date, employeeId?: string) => void;
  children: React.ReactNode;
}

export const DayCell: React.FC<DayCellProps> = ({
  date,
  employeeId,
  onDropTask,
  children,
}) => {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ItemTypes.TASK,
      drop: (item: { id: string }) => onDropTask(item.id, date, employeeId),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [date, employeeId, onDropTask],
  );

  return (
    <div ref={drop} className={`relative ${isOver ? "bg-blue-100" : ""}`}>
      {children}
    </div>
  );
};