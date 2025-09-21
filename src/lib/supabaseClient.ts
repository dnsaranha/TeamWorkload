import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Types for our application - using fallback types if database types don't exist
export type Employee = {
  id: string;
  name: string;
  role: string;
  weekly_hours: number;
  skills: any; // Using any to match Supabase Json type
  dias_de_trabalho: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};

export type EmployeeInsert = {
  name: string;
  role: string;
  weekly_hours: number;
  skills: any; // Using any to match Supabase Json type
  dias_de_trabalho?: string[] | null;
};

export type EmployeeUpdate = Partial<EmployeeInsert>;

export type Project = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  categoria_estrategica?: string | null;
  special_marker?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProjectInsert = {
  name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  categoria_estrategica?: string | null;
  special_marker?: string | null;
};

export type ProjectUpdate = Partial<ProjectInsert>;

export type Exception = {
  date: string;
  assigned_employee_id?: string;
  estimated_time?: number;
  is_removed?: boolean;
  status?: string;
};

export type Task = {
  id: string;
  name: string;
  description: string | null;
  estimated_time: number;
  start_date: string;
  end_date: string;
  project_id: string | null;
  assigned_employee_id: string | null;
  status: string | null;
  completion_date: string | null;
  repeats_weekly?: boolean;
  repeat_days?: string[] | null; // Days of the week for repetition
  hours_per_day?: number | null; // Hours per day for repeated tasks
  special_marker?: string | null;
  exceptions?: Exception[] | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TaskInsert = {
  name: string;
  description?: string | null;
  estimated_time: number;
  start_date: string;
  end_date: string;
  project_id?: string | null;
  assigned_employee_id?: string | null;
  status?: string | null;
  completion_date?: string | null;
  repeats_weekly?: boolean;
  repeat_days?: string[] | null;
  hours_per_day?: number | null;
  special_marker?: string | null;
  exceptions?: Exception[] | null;
};

export type TaskUpdate = Partial<TaskInsert>;

// Helper functions for CRUD operations
export const employeeService = {
  async getAll() {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("name");

    if (error) throw error;
    return data;
  },

  async create(employee: EmployeeInsert) {
    const { data, error } = await supabase
      .from("employees")
      .insert(employee)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, employee: EmployeeUpdate) {
    const { data, error } = await supabase
      .from("employees")
      .update(employee)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from("employees").delete().eq("id", id);

    if (error) throw error;
  },

  async upsert(employee: EmployeeInsert & { id?: string }) {
    const { data, error } = await supabase
      .from("employees")
      .upsert(employee)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export const projectService = {
  async getAll() {
    const { data, error } = await supabase
      .from("workload_projects")
      .select("*")
      .order("name");

    if (error) throw error;
    return data;
  },

  async create(project: ProjectInsert) {
    const { data, error } = await supabase
      .from("workload_projects")
      .insert(project)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, project: ProjectUpdate) {
    const { data, error } = await supabase
      .from("workload_projects")
      .update(project)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from("workload_projects")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async upsert(project: ProjectInsert & { id?: string }) {
    const { data, error } = await supabase
      .from("workload_projects")
      .upsert(project)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export const taskService = {
  async getAll() {
    const { data, error } = await supabase
      .from("workload_tasks")
      .select(
        `
        *,
        project:workload_projects(*),
        assigned_employee:employees(*)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(task: TaskInsert) {
    const { data, error } = await supabase
      .from("workload_tasks")
      .insert(task)
      .select(
        `
        *,
        project:workload_projects(*),
        assigned_employee:employees(*)
      `,
      )
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, task: TaskUpdate) {
    const { data, error } = await supabase
      .from("workload_tasks")
      .update(task)
      .eq("id", id)
      .select(
        `
        *,
        project:workload_projects(*),
        assigned_employee:employees(*)
      `,
      )
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from("workload_tasks")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async upsert(task: TaskInsert & { id?: string }) {
    const { data, error } = await supabase
      .from("workload_tasks")
      .upsert(task)
      .select(
        `
        *,
        project:workload_projects(*),
        assigned_employee:employees(*)
      `,
      )
      .single();

    if (error) throw error;
    return data;
  },
};
