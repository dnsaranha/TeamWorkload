import React from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../lib/dnd';
import { type Task } from '@/lib/supabaseClient';

interface DraggableTaskProps {
  task: Task & { is_recurring_instance?: boolean };
  onDropOutside: (taskId: string) => void;
  children: React.ReactNode;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, onDropOutside, children }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: { id: task.id },
    end: (item, monitor) => {
      if (!monitor.didDrop()) {
        onDropOutside(item.id);
      }
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [task.id, onDropOutside]);

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      {children}
    </div>
  );
};

export default DraggableTask;
