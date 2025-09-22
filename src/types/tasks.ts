export type { Task, Project, Employee } from '@/lib/supabaseClient';
import type { Task, Project, Employee } from '@/lib/supabaseClient';

export type TaskWithRelations = Task & {
  project: Project | null;
  assigned_employee: Employee | null;
};

export type TaskInstance = TaskWithRelations & {
  instanceDate: string;
  isException: boolean;
  is_recurring_instance?: boolean;
};

export type EditableOccurrence = {
  date: string;
  original: {
    estimated_time: number | null;
    assigned_employee_id: string | null;
  };
  override: {
    estimated_time?: number | null;
    assigned_employee_id?: string | null;
  };
  is_removed: boolean;
};
