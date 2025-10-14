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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { employeeService, taskService, type Employee as DBEmployee, type Task as DBTask } from '../../lib/supabaseClient';


interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: number, updates: Partial<Task>) => void;
  task: Task | null;
  allTasks: Task[];
  employees: DBEmployee[];
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, onSave, task, allTasks, employees }) => {
  const [taskName, setTaskName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [effort, setEffort] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [predecessors, setPredecessors] = useState<number[]>([]);
  const [successors, setSuccessors] = useState<number[]>([]);


  useEffect(() => {
    if (task) {
      setTaskName(task.name);
      setAssignee(task.assignee);
      setStatus(task.progress === 100 ? 'completed' : task.progress > 0 ? 'in_progress' : 'not_started');
      setPredecessors(task.dependencies || []);
      // Successors are not directly stored, they are the inverse of predecessors
      const successorIds = allTasks.filter(t => t.dependencies?.includes(task.id)).map(t => t.id);
      setSuccessors(successorIds);
      setEffort(task.effort);
      setStartDate(task.startDate);
      setDueDate(task.dueDate);
      setProgress(task.progress);
    }
  }, [task]);

  const handleSave = () => {
    if (task && taskName.trim()) {
      const newProgress = status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0;
      onSave(task.id, {
        name: taskName,
        assignee,
        effort,
        startDate,
        dueDate,
        progress: newProgress,
        dependencies: predecessors,
      });

      // This part is tricky because it requires modifying other tasks.
      // It's better to handle this logic in the parent component (`GanttContainer`).
      // We can pass the successor changes up to the parent.
      // For now, let's just log it.
      console.log("Successors to update: ", successors);

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
             <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Assignee" />
                </SelectTrigger>
                <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                </SelectContent>
            </Select>
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
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
            </Select>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="predecessors" className="text-right">Predecessors</Label>
                <Input
                    id="predecessors"
                    value={predecessors.join(',')}
                    onChange={(e) => setPredecessors(e.target.value.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n !== 0))}
                    className="col-span-3"
                    placeholder="Enter task IDs, comma-separated"
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="successors" className="text-right">Successors</Label>
                <Input
                    id="successors"
                    value={successors.join(',')}
                    onChange={(e) => setSuccessors(e.target.value.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n !== 0))}
                    className="col-span-3"
                    placeholder="Enter task IDs, comma-separated"
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
