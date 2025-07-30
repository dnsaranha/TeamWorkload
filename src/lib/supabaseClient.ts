import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Types for our application
export type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type EmployeeInsert =
  Database["public"]["Tables"]["employees"]["Insert"];
export type EmployeeUpdate =
  Database["public"]["Tables"]["employees"]["Update"];

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

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
};

export const projectService = {
  async getAll() {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("name");

    if (error) throw error;
    return data;
  },

  async create(project: ProjectInsert) {
    const { data, error } = await supabase
      .from("projects")
      .insert(project)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, project: ProjectUpdate) {
    const { data, error } = await supabase
      .from("projects")
      .update(project)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) throw error;
  },
};

export const taskService = {
  async getAll() {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *,
        project:projects(*),
        assigned_employee:employees(*)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(task: TaskInsert) {
    const { data, error } = await supabase
      .from("tasks")
      .insert(task)
      .select(
        `
        *,
        project:projects(*),
        assigned_employee:employees(*)
      `,
      )
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, task: TaskUpdate) {
    const { data, error } = await supabase
      .from("tasks")
      .update(task)
      .eq("id", id)
      .select(
        `
        *,
        project:projects(*),
        assigned_employee:employees(*)
      `,
      )
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) throw error;
  },
};
