import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { taskService } from '@/lib/supabaseClient';
import { DraggableTask, type TaskWithProject } from './DraggableTask';

const UnallocatedTasks = () => {
  const [unallocatedTasks, setUnallocatedTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUnallocatedTasks();
  }, []);

  const loadUnallocatedTasks = async () => {
    try {
      setLoading(true);
      const tasksData = await taskService.getAll();

      const unallocated = tasksData.filter((task) => !task.assigned_employee_id);

      setUnallocatedTasks(unallocated as TaskWithProject[]);
    } catch (error) {
      console.error('Error loading unallocated tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="text-center py-6 text-sm text-muted-foreground">Loading tasks...</div>
      ) : unallocatedTasks.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          No unallocated tasks.
        </div>
      ) : (
        unallocatedTasks.map((task) => (
          <DraggableTask key={task.id} task={task} />
        ))
      )}
    </div>
  );
};

export default UnallocatedTasks;
