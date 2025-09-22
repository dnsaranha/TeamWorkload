import React from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "@/lib/dnd";
import { TaskInstance } from "@/types/tasks";

interface DayCellProps {
  date: Date;
  employeeId?: string;
  onDropTask: (
    item: { task: TaskInstance },
    date: Date,
    employeeId?: string
  ) => void;
  children: React.ReactNode;
}

const DayCell: React.FC<DayCellProps> = ({
  date,
  employeeId,
  onDropTask,
  children,
}) => {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ItemTypes.TASK,
      drop: (item: { task: TaskInstance }) =>
        onDropTask(item, date, employeeId),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [date, employeeId, onDropTask]
  );

  return (
    <div ref={drop} className={`relative ${isOver ? "bg-blue-100" : ""}`}>
      {children}
    </div>
  );
};

export default DayCell;
