import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import type { Task } from '../../types';

import { MultiSelect } from '../ui/MultiSelect';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: number, updates: Partial<Task>) => void;
  task: Task | null;
  allTasks: Task[];
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, onSave, task, allTasks }) => {
  const [taskName, setTaskName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [effort, setEffort] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [progress, setProgress] = useState(0);
  const [dependencies, setDependencies] = useState<number[]>([]);

  useEffect(() => {
    if (task) {
      setTaskName(task.name);
      setAssignee(task.assignee);
      setEffort(task.effort);
      setStartDate(task.startDate);
      setDueDate(task.dueDate);
      setProgress(task.progress);
      setDependencies(task.dependencies || []);
    }
  }, [task, allTasks]);

  const handleSave = () => {
    if (task && taskName.trim()) {
      onSave(task.id, {
        name: taskName,
        assignee,
        effort,
        startDate,
        dueDate,
        progress,
        dependencies,
      });
      onClose();
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dependencies" className="text-right">
              Dependencies
            </Label>
            <MultiSelect
              options={allTasks.filter(t => t.id !== task.id).map(t => ({ label: t.name, value: t.id.toString() }))}
              onValueChange={(values) => setDependencies(values.map(Number))}
              defaultValue={dependencies.map(String)}
              placeholder="Select dependencies"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Task Name
            </Label>
            <Input
              id="name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assignee" className="text-right">
              Assignee
            </Label>
            <Input
              id="assignee"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="effort" className="text-right">
              Effort (hours)
            </Label>
            <Input
              id="effort"
              type="number"
              value={effort}
              onChange={(e) => setEffort(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dueDate" className="text-right">
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="progress" className="text-right">
              Progress (%)
            </Label>
            <Input
              id="progress"
              type="number"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
