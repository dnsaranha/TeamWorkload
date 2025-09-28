import { Task, Project, Employee, TaskException } from "@/lib/supabaseClient";

export type TaskWithRelations = Task & {
  project: Project | null;
  assigned_employee: Employee | null;
  exceptions: TaskException[] | null;
};

export type NewTask = {
  name: string;
  description: string;
  estimated_time: number;
  start_date: string;
  end_date: string;
  project_id: string;
  assigned_employee_id: string;
  status: "pending" | "in_progress" | "completed";
  completion_date: string;
  repeats_weekly: boolean;
  repeat_days: string[];
  hours_per_day: number;
  special_marker: string;
};

export type NewProject = {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  categoria_estrategica: string;
};