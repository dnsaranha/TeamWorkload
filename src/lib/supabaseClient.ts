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
  exceptions?: any; // Adicionado para exceções
  created_at: string | null;
  updated_at: string | null;
};

// Novo tipo para exceções de tarefa
export type TaskException = {
  date: string; // YYYY-MM-DD
  estimated_hours?: number | null;
  assigned_employee_id?: string | null;
  completed?: boolean;
  removed?: boolean;
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
  exceptions?: TaskException[] | null;
};

export type TaskUpdate = Partial<TaskInsert>;

// Add workspace-related types
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  current_workspace_id?: string;
  created_at: string;
  updated_at: string;
}

// Get current user's workspace
export const getCurrentWorkspace = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('current_workspace_id')
    .eq('id', user.id)
    .single();

  return profile?.current_workspace_id || null;
};

// Workspace service
export const workspaceService = {
  async getAll(): Promise<Workspace[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('workspaces')
      .select(`
        *,
        workspace_members!inner(user_id, role, status)
      `)
      .eq('workspace_members.user_id', user.id)
      .eq('workspace_members.status', 'active');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Workspace | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(workspace: Omit<Workspace, 'id' | 'created_at' | 'updated_at' | 'owner_id'>): Promise<Workspace> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        ...workspace,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Add user as owner
    await supabase
      .from('workspace_members')
      .insert({
        workspace_id: data.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString(),
      });

    return data;
  },

  async update(id: string, updates: Partial<Workspace>): Promise<Workspace> {
    const { data, error } = await supabase
      .from('workspaces')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Workspace members service
export const workspaceMemberService = {
  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        *,
        users(email, full_name, avatar_url)
      `)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return data || [];
  },

  async inviteMember(workspaceId: string, email: string, role: 'admin' | 'member' | 'guest' = 'member'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // User exists, add directly
      const { error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: existingUser.id,
          role,
          invited_by: user.id,
          status: 'pending',
        });

      if (error) throw error;
    } else {
      // TODO: Send invitation email for non-existing users
      throw new Error('User not found. Email invitations not implemented yet.');
    }
  },

  async updateMemberRole(memberId: string, role: 'admin' | 'member' | 'guest'): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .update({ 
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (error) throw error;
  },

  async removeMember(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
  },

  async acceptInvitation(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .update({
        status: 'active',
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (error) throw error;
  },
};

// User profile service
export const userProfileService = {
  async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async switchWorkspace(workspaceId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('users')
      .update({
        current_workspace_id: workspaceId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;
  },
};

// Helper function to add workspace filter to queries
const addWorkspaceFilter = async (query: any) => {
  const workspaceId = await getCurrentWorkspace();
  if (!workspaceId) throw new Error('No workspace selected');
  return query.eq('workspace_id', workspaceId);
};

// Employee service with workspace filtering
export const employeeService = {
  async getAll(): Promise<Employee[]> {
    let query = supabase.from('employees').select('*').order('name');
    query = await addWorkspaceFilter(query);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Employee | null> {
    let query = supabase.from('employees').select('*').eq('id', id);
    query = await addWorkspaceFilter(query);
    
    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  },

  async create(employee: EmployeeInsert): Promise<Employee> {
    const workspaceId = await getCurrentWorkspace();
    if (!workspaceId) throw new Error('No workspace selected');

    const { data, error } = await supabase
      .from('employees')
      .insert({
        ...employee,
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: EmployeeUpdate): Promise<Employee> {
    let query = supabase
      .from('employees')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    query = await addWorkspaceFilter(query);
    
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    let query = supabase.from('employees').delete().eq('id', id);
    query = await addWorkspaceFilter(query);
    
    const { error } = await query;
    if (error) throw error;
  },

  async upsert(employee: EmployeeInsert & { id?: string }): Promise<Employee> {
    const workspaceId = await getCurrentWorkspace();
    if (!workspaceId) throw new Error('No workspace selected');

    const { data, error } = await supabase
      .from('employees')
      .upsert({
        ...employee,
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// Project service with workspace filtering - update to use workload_projects
export const projectService = {
  async getAll(filters: { projectIds?: string[] } = {}): Promise<Project[]> {
    let query = supabase.from('workload_projects').select('*').order('name');

    query = await addWorkspaceFilter(query);

    if (filters.projectIds && filters.projectIds.length > 0) {
      query = query.in('id', filters.projectIds);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Project | null> {
    let query = supabase.from('workload_projects').select('*').eq('id', id);
    query = await addWorkspaceFilter(query);
    
    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  },

  async create(project: ProjectInsert): Promise<Project> {
    const workspaceId = await getCurrentWorkspace();
    if (!workspaceId) throw new Error('No workspace selected');

    const { data, error } = await supabase
      .from('workload_projects')
      .insert({
        ...project,
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ProjectUpdate): Promise<Project> {
    let query = supabase
      .from('workload_projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    query = await addWorkspaceFilter(query);
    
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    let query = supabase.from('workload_projects').delete().eq('id', id);
    query = await addWorkspaceFilter(query);
    
    const { error } = await query;
    if (error) throw error;
  },

  async upsert(project: ProjectInsert & { id?: string }): Promise<Project> {
    const workspaceId = await getCurrentWorkspace();
    if (!workspaceId) throw new Error('No workspace selected');

    const { data, error } = await supabase
      .from('workload_projects')
      .upsert({
        ...project,
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// Task service with workspace filtering and proper exception handling
export const taskService = {
  async getAll(filters: { projectIds?: string[]; searchTerm?: string } = {}): Promise<Task[]> {
    let query = supabase
      .from('workload_tasks')
      .select(`
        *,
        project:workload_projects(*),
        assigned_employee:employees(name)
      `)
      .order('created_at', { ascending: false });
    
    query = await addWorkspaceFilter(query);

    if (filters.projectIds && filters.projectIds.length > 0) {
      query = query.in('project_id', filters.projectIds);
    }

    if (filters.searchTerm) {
      const searchTerm = `%${filters.searchTerm}%`;
      query = query.or(
        `name.ilike.${searchTerm},description.ilike.${searchTerm},assigned_employee.name.ilike.${searchTerm}`
      );
    }
    
    const { data, error } = await query;
    if (error) {
      // It's possible the text search on a related table fails if the relationship is complex
      // or the structure is not as expected. Log this specific error.
      if (error.message.includes("could not find path")) {
        console.error("Failed to apply text search on related table 'employees'. Check RLS and view/table definitions.", error);
        // Optionally, retry without the text search
        // For now, we'll just let it fail to be noticeable.
      }
      throw error;
    }
    return data || [];
  },

  async getById(id: string): Promise<Task | null> {
    let query = supabase
      .from('workload_tasks')
      .select(`
        *,
        project:workload_projects(*),
        assigned_employee:employees(*)
      `)
      .eq('id', id);
    
    query = await addWorkspaceFilter(query);
    
    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  },

  async create(task: TaskInsert): Promise<Task> {
    const workspaceId = await getCurrentWorkspace();
    if (!workspaceId) throw new Error('No workspace selected');

    const { data, error } = await supabase
      .from('workload_tasks')
      .insert({
        ...task,
        workspace_id: workspaceId,
      })
      .select(`
        *,
        project:workload_projects(*),
        assigned_employee:employees(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: TaskUpdate): Promise<Task> {
    const workspaceId = await getCurrentWorkspace();
    if (!workspaceId) throw new Error('No workspace selected');

    const { data, error } = await supabase
      .from('workload_tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select(`
        *,
        project:workload_projects(*),
        assigned_employee:employees(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    let query = supabase.from('workload_tasks').delete().eq('id', id);
    query = await addWorkspaceFilter(query);
    
    const { error } = await query;
    if (error) throw error;
  },

  async upsert(task: TaskInsert & { id?: string }): Promise<Task> {
    const workspaceId = await getCurrentWorkspace();
    if (!workspaceId) throw new Error('No workspace selected');

    const { data, error } = await supabase
      .from('workload_tasks')
      .upsert({
        ...task,
        workspace_id: workspaceId,
      })
      .select(`
        *,
        project:workload_projects(*),
        assigned_employee:employees(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },
};