export interface Task {
  id: number;
  name: string;
  assignee: string;
  effort: number;
  startDate: string;
  dueDate: string;
  progress: number;
  dependencies: number[];
  color: string;
  status?: string;
}

export interface Phase {
  id: string;
  name: string;
  startDate: string;
  dueDate: string;
  progress: number;
  totalEffort: number;
  isCollapsed: boolean;
  tasks: Task[];
}