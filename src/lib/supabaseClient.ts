import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { firestoreService } from "./firestoreService";
import { auth } from "./firebase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("placeholder")
);

// Types for our application
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
  skills: any;
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

export type TaskException = {
  date: string; // YYYY-MM-DD
  estimated_hours?: number | null;
  assigned_employee_id?: string | null;
  completed?: boolean;
  removed?: boolean;
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
  repeat_days?: string[] | null;
  hours_per_day?: number | null;
  special_marker?: string | null;
  exceptions?: TaskException[] | null;
  dependencies?: string[] | null; // Array of predecessor Task IDs
  parent_id?: string | null; // ID of parent task for hierarchical subtasks
  progress?: number | null; // Percentage of completion 0-100
  actual_time?: number | null; // Tracked execution time in hours
  created_at: string | null;
  updated_at: string | null;
  project?: Project | null;
  assigned_employee?: Employee | null;
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
  dependencies?: string[] | null;
  parent_id?: string | null;
  progress?: number | null;
  actual_time?: number | null;
};

export type TaskUpdate = Partial<TaskInsert>;

export type TimeEntry = {
  id: string;
  task_id?: string | null;
  task_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  employee_id?: string | null;
  employee_name?: string | null;
  description: string;
  start_time: string;
  end_time?: string | null;
  duration_seconds: number;
  created_at: string;
};

export type TimeEntryInsert = {
  task_id?: string | null;
  task_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  employee_id?: string | null;
  employee_name?: string | null;
  description: string;
  start_time: string;
  end_time?: string | null;
  duration_seconds: number;
};

// --- IN-MEMORY & LOCAL STORAGE FALLBACK STORAGE ---

const STORAGE_KEYS = {
  EMPLOYEES: "crono_pulse_employees",
  PROJECTS: "crono_pulse_projects",
  TASKS: "crono_pulse_tasks",
  PROFILES: "crono_pulse_profiles",
};

const formatDateOffset = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const getInitialData = () => {
  const now = new Date().toISOString();

  const employees: Employee[] = [
    {
      id: "emp-1",
      name: "Ana Silva",
      role: "Frontend Lead",
      weekly_hours: 40,
      skills: ["React", "TypeScript", "Tailwind CSS", "UI/UX"],
      dias_de_trabalho: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      created_at: now,
      updated_at: now,
    },
    {
      id: "emp-2",
      name: "Carlos Eduardo",
      role: "Backend Architect",
      weekly_hours: 40,
      skills: ["Node.js", "PostgreSQL", "System Architecture", "APIs"],
      dias_de_trabalho: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      created_at: now,
      updated_at: now,
    },
    {
      id: "emp-3",
      name: "Beatriz Santos",
      role: "UI/UX Designer",
      weekly_hours: 32,
      skills: ["Figma", "User Research", "Prototyping", "Design Systems"],
      dias_de_trabalho: ["monday", "tuesday", "wednesday", "thursday"],
      created_at: now,
      updated_at: now,
    },
    {
      id: "emp-4",
      name: "Diego Ramos",
      role: "DevOps Engineer",
      weekly_hours: 40,
      skills: ["Docker", "Kubernetes", "CI/CD", "Cloud Infrastructure"],
      dias_de_trabalho: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      created_at: now,
      updated_at: now,
    },
  ];

  const projects: Project[] = [
    {
      id: "proj-1",
      name: "Portal Redesign 2.0",
      description: "Design system refresh and dashboard responsive modernization",
      start_date: formatDateOffset(-30),
      end_date: formatDateOffset(60),
      categoria_estrategica: "Produto",
      special_marker: "major_release",
      created_at: now,
      updated_at: now,
    },
    {
      id: "proj-2",
      name: "Cloud & Microservices Migration",
      description: "Containerized deployment pipelines and database optimization",
      start_date: formatDateOffset(-15),
      end_date: formatDateOffset(75),
      categoria_estrategica: "Infraestrutura",
      special_marker: "major_deployment",
      created_at: now,
      updated_at: now,
    },
    {
      id: "proj-3",
      name: "Workload & Analytics Insights",
      description: "Team capacity planning, timeline roadmaps, and sprint analytics",
      start_date: formatDateOffset(-5),
      end_date: formatDateOffset(45),
      categoria_estrategica: "Inovação",
      special_marker: "major_theme",
      created_at: now,
      updated_at: now,
    },
  ];

  const tasks: Task[] = [
    {
      id: "task-1",
      name: "Design System Tokens & Theme Switcher",
      description: "Implement accessible color palette and responsive tokens",
      estimated_time: 16,
      start_date: formatDateOffset(-4),
      end_date: formatDateOffset(1),
      project_id: "proj-1",
      assigned_employee_id: "emp-3",
      status: "completed",
      progress: 100,
      special_marker: null,
      repeats_weekly: false,
      dependencies: [],
      completion_date: formatDateOffset(0),
      created_at: now,
      updated_at: now,
    },
    {
      id: "task-2",
      name: "React Components Refactor & Storybook",
      description: "Refactor core UI cards, tabs, and calendar widgets",
      estimated_time: 24,
      start_date: formatDateOffset(2),
      end_date: formatDateOffset(9),
      project_id: "proj-1",
      assigned_employee_id: "emp-1",
      status: "in_progress",
      progress: 60,
      special_marker: "major_release",
      repeats_weekly: false,
      dependencies: ["task-1"],
      completion_date: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: "task-2-1",
      name: "Componentes Base de Botões e Modais",
      description: "Padronização de acessibilidade e animações de entrada",
      estimated_time: 10,
      start_date: formatDateOffset(2),
      end_date: formatDateOffset(5),
      project_id: "proj-1",
      assigned_employee_id: "emp-1",
      status: "completed",
      progress: 100,
      parent_id: "task-2",
      dependencies: ["task-1"],
      created_at: now,
      updated_at: now,
    },
    {
      id: "task-2-2",
      name: "Documentação no Storybook",
      description: "Criação de histórias e documentação de props",
      estimated_time: 14,
      start_date: formatDateOffset(6),
      end_date: formatDateOffset(9),
      project_id: "proj-1",
      assigned_employee_id: "emp-3",
      status: "in_progress",
      progress: 40,
      parent_id: "task-2",
      dependencies: ["task-2-1"],
      created_at: now,
      updated_at: now,
    },
    {
      id: "task-3",
      name: "API Gateway & Auth Middleware",
      description: "Set up JWT session validation and rate limiters",
      estimated_time: 20,
      start_date: formatDateOffset(-3),
      end_date: formatDateOffset(2),
      project_id: "proj-2",
      assigned_employee_id: "emp-2",
      status: "in_progress",
      progress: 80,
      special_marker: null,
      repeats_weekly: false,
      dependencies: [],
      completion_date: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: "task-4",
      name: "CI/CD Automated Build & Deploy Pipeline",
      description: "Configure automated linting, test suites, and staging deploys",
      estimated_time: 18,
      start_date: formatDateOffset(3),
      end_date: formatDateOffset(8),
      project_id: "proj-2",
      assigned_employee_id: "emp-4",
      status: "pending",
      progress: 0,
      special_marker: "major_deployment",
      repeats_weekly: false,
      dependencies: ["task-3"],
      completion_date: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: "task-5",
      name: "Weekly Team Sync & Sprint Planning",
      description: "Recurring weekly sync for backlog grooming and roadmap alignment",
      estimated_time: 4,
      start_date: formatDateOffset(-14),
      end_date: formatDateOffset(60),
      project_id: "proj-3",
      assigned_employee_id: "emp-1",
      status: "in_progress",
      progress: 50,
      repeats_weekly: true,
      repeat_days: ["monday", "thursday"],
      hours_per_day: 2,
      special_marker: null,
      dependencies: [],
      completion_date: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: "task-6",
      name: "Telemetry & Capacity Reporting",
      description: "Generate automated workload heatmaps and weekly hours summary",
      estimated_time: 12,
      start_date: formatDateOffset(9),
      end_date: formatDateOffset(14),
      project_id: "proj-3",
      assigned_employee_id: "emp-2",
      status: "pending",
      progress: 0,
      special_marker: "major_theme",
      repeats_weekly: false,
      dependencies: ["task-4", "task-2"],
      completion_date: null,
      created_at: now,
      updated_at: now,
    },
  ];

  return { employees, projects, tasks };
};

class LocalMockDB {
  private getStore<T>(key: string, defaultInit: () => T[]): T[] {
    try {
      if (localStorage.getItem("crono_pulse_mock_cleared") === "true") {
        const val = localStorage.getItem(key);
        if (val) return JSON.parse(val);
        return [];
      }
      const val = localStorage.getItem(key);
      if (val) return JSON.parse(val);
      const initial = defaultInit();
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    } catch {
      return defaultInit();
    }
  }

  private setStore<T>(key: string, items: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  }

  getEmployees(): Employee[] {
    return this.getStore(STORAGE_KEYS.EMPLOYEES, () => getInitialData().employees);
  }

  setEmployees(employees: Employee[]) {
    this.setStore(STORAGE_KEYS.EMPLOYEES, employees);
  }

  getProjects(): Project[] {
    return this.getStore(STORAGE_KEYS.PROJECTS, () => getInitialData().projects);
  }

  setProjects(projects: Project[]) {
    this.setStore(STORAGE_KEYS.PROJECTS, projects);
  }

  getTasks(): Task[] {
    const rawTasks = this.getStore(STORAGE_KEYS.TASKS, () => getInitialData().tasks);
    const projects = this.getProjects();
    const employees = this.getEmployees();

    return rawTasks.map((t) => ({
      ...t,
      project: projects.find((p) => p.id === t.project_id) || null,
      assigned_employee: employees.find((e) => e.id === t.assigned_employee_id) || null,
    }));
  }

  setTasks(tasks: Task[]) {
    // Strip joined data before saving
    const stripped = tasks.map((t) => {
      const { project, assigned_employee, ...rest } = t;
      return rest;
    });
    this.setStore(STORAGE_KEYS.TASKS, stripped);
  }

  getProfile(id: string) {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.PROFILES);
      const profiles = val ? JSON.parse(val) : {};
      return profiles[id] || {
        id,
        full_name: "Team Lead",
        email: "lead@cronopulse.io",
        avatar_url: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch {
      return {
        id,
        full_name: "Team Lead",
        email: "lead@cronopulse.io",
        avatar_url: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  saveProfile(id: string, profile: any) {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.PROFILES);
      const profiles = val ? JSON.parse(val) : {};
      profiles[id] = { ...profiles[id], ...profile, updated_at: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      return profiles[id];
    } catch {
      return profile;
    }
  }
}

export const mockDB = new LocalMockDB();

// Mock query builder to support supabase.from(table)... chains safely
function createMockQueryBuilder(tableName: string) {
  let action: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  let payload: any = null;
  const filters: Array<{ col: string; op: string; val: any }> = [];
  let sortCol: string | null = null;
  let sortAscending = true;
  let isSingle = false;

  const builder: any = {
    select(columns?: string) {
      action = "select";
      return builder;
    },
    insert(data: any) {
      action = "insert";
      payload = data;
      return builder;
    },
    update(data: any) {
      action = "update";
      payload = data;
      return builder;
    },
    delete() {
      action = "delete";
      return builder;
    },
    upsert(data: any) {
      action = "upsert";
      payload = data;
      return builder;
    },
    eq(col: string, val: any) {
      filters.push({ col, op: "eq", val });
      return builder;
    },
    neq(col: string, val: any) {
      filters.push({ col, op: "neq", val });
      return builder;
    },
    gte(col: string, val: any) {
      filters.push({ col, op: "gte", val });
      return builder;
    },
    lte(col: string, val: any) {
      filters.push({ col, op: "lte", val });
      return builder;
    },
    in(col: string, vals: any[]) {
      filters.push({ col, op: "in", val: vals });
      return builder;
    },
    order(col: string, options?: { ascending?: boolean }) {
      sortCol = col;
      sortAscending = options?.ascending !== false;
      return builder;
    },
    single() {
      isSingle = true;
      return builder;
    },
    then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
      return executeMockQuery().then(onfulfilled, onrejected);
    },
  };

  async function executeMockQuery(): Promise<{ data: any; error: any }> {
    const now = new Date().toISOString();

    if (tableName === "employees") {
      let list = [...mockDB.getEmployees()];
      if (action === "insert") {
        const item: Employee = {
          id: payload.id || `emp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          created_at: now,
          updated_at: now,
          ...payload,
        };
        list.push(item);
        mockDB.setEmployees(list);
        return { data: isSingle ? item : [item], error: null };
      }
      if (action === "update") {
        const idFilter = filters.find((f) => f.col === "id")?.val;
        let updatedItem: any = null;
        list = list.map((emp) => {
          if (idFilter && emp.id === idFilter) {
            updatedItem = { ...emp, ...payload, updated_at: now };
            return updatedItem;
          }
          return emp;
        });
        mockDB.setEmployees(list);
        return { data: isSingle ? updatedItem : [updatedItem], error: null };
      }
      if (action === "upsert") {
        const id = payload.id || `emp-${Date.now()}`;
        const existingIdx = list.findIndex((e) => e.id === id);
        const item = { ...(existingIdx >= 0 ? list[existingIdx] : {}), ...payload, id, updated_at: now };
        if (existingIdx >= 0) list[existingIdx] = item;
        else { item.created_at = now; list.push(item); }
        mockDB.setEmployees(list);
        return { data: isSingle ? item : [item], error: null };
      }
      if (action === "delete") {
        const idFilter = filters.find((f) => f.col === "id")?.val;
        list = list.filter((e) => e.id !== idFilter);
        mockDB.setEmployees(list);
        return { data: null, error: null };
      }

      // Select & filters
      for (const f of filters) {
        if (f.op === "eq") list = list.filter((i: any) => i[f.col] === f.val);
      }
      if (sortCol) {
        list.sort((a: any, b: any) =>
          sortAscending
            ? String(a[sortCol!] || "").localeCompare(String(b[sortCol!] || ""))
            : String(b[sortCol!] || "").localeCompare(String(a[sortCol!] || ""))
        );
      }
      return { data: isSingle ? list[0] || null : list, error: null };
    }

    if (tableName === "workload_projects") {
      let list = [...mockDB.getProjects()];
      if (action === "insert") {
        const item: Project = {
          id: payload.id || `proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          created_at: now,
          updated_at: now,
          ...payload,
        };
        list.push(item);
        mockDB.setProjects(list);
        return { data: isSingle ? item : [item], error: null };
      }
      if (action === "update") {
        const idFilter = filters.find((f) => f.col === "id")?.val;
        let updatedItem: any = null;
        list = list.map((proj) => {
          if (idFilter && proj.id === idFilter) {
            updatedItem = { ...proj, ...payload, updated_at: now };
            return updatedItem;
          }
          return proj;
        });
        mockDB.setProjects(list);
        return { data: isSingle ? updatedItem : [updatedItem], error: null };
      }
      if (action === "upsert") {
        const id = payload.id || `proj-${Date.now()}`;
        const existingIdx = list.findIndex((p) => p.id === id);
        const item = { ...(existingIdx >= 0 ? list[existingIdx] : {}), ...payload, id, updated_at: now };
        if (existingIdx >= 0) list[existingIdx] = item;
        else { item.created_at = now; list.push(item); }
        mockDB.setProjects(list);
        return { data: isSingle ? item : [item], error: null };
      }
      if (action === "delete") {
        const idFilter = filters.find((f) => f.col === "id")?.val;
        list = list.filter((p) => p.id !== idFilter);
        mockDB.setProjects(list);
        return { data: null, error: null };
      }

      for (const f of filters) {
        if (f.op === "eq") list = list.filter((i: any) => i[f.col] === f.val);
      }
      if (sortCol) {
        list.sort((a: any, b: any) =>
          sortAscending
            ? String(a[sortCol!] || "").localeCompare(String(b[sortCol!] || ""))
            : String(b[sortCol!] || "").localeCompare(String(a[sortCol!] || ""))
        );
      }
      return { data: isSingle ? list[0] || null : list, error: null };
    }

    if (tableName === "workload_tasks") {
      let list = [...mockDB.getTasks()];
      if (action === "insert") {
        const item: Task = {
          id: payload.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          created_at: now,
          updated_at: now,
          ...payload,
        };
        list.push(item);
        mockDB.setTasks(list);
        const fresh = mockDB.getTasks().find((t) => t.id === item.id) || item;
        return { data: isSingle ? fresh : [fresh], error: null };
      }
      if (action === "update") {
        const idFilter = filters.find((f) => f.col === "id")?.val;
        let updatedItem: any = null;
        list = list.map((task) => {
          if (idFilter && task.id === idFilter) {
            updatedItem = { ...task, ...payload, updated_at: now };
            return updatedItem;
          }
          return task;
        });
        mockDB.setTasks(list);
        const fresh = mockDB.getTasks().find((t) => t.id === idFilter) || updatedItem;
        return { data: isSingle ? fresh : [fresh], error: null };
      }
      if (action === "upsert") {
        const id = payload.id || `task-${Date.now()}`;
        const existingIdx = list.findIndex((t) => t.id === id);
        const item = { ...(existingIdx >= 0 ? list[existingIdx] : {}), ...payload, id, updated_at: now };
        if (existingIdx >= 0) list[existingIdx] = item;
        else { item.created_at = now; list.push(item); }
        mockDB.setTasks(list);
        const fresh = mockDB.getTasks().find((t) => t.id === id) || item;
        return { data: isSingle ? fresh : [fresh], error: null };
      }
      if (action === "delete") {
        const idFilter = filters.find((f) => f.col === "id")?.val;
        list = list.filter((t) => t.id !== idFilter);
        mockDB.setTasks(list);
        return { data: null, error: null };
      }

      for (const f of filters) {
        if (f.op === "eq") list = list.filter((i: any) => i[f.col] === f.val);
      }
      if (sortCol) {
        list.sort((a: any, b: any) =>
          sortAscending
            ? String(a[sortCol!] || "").localeCompare(String(b[sortCol!] || ""))
            : String(b[sortCol!] || "").localeCompare(String(a[sortCol!] || ""))
        );
      }
      return { data: isSingle ? list[0] || null : list, error: null };
    }

    if (tableName === "profiles") {
      const idFilter = filters.find((f) => f.col === "id")?.val || "default-user";
      if (action === "insert" || action === "upsert" || action === "update") {
        const saved = mockDB.saveProfile(payload.id || idFilter, payload);
        return { data: isSingle ? saved : [saved], error: null };
      }
      const profile = mockDB.getProfile(idFilter);
      return { data: isSingle ? profile : [profile], error: null };
    }

    return { data: isSingle ? null : [], error: null };
  }

  return builder;
}

// Resilient Supabase compatibility layer backed by Firestore & LocalMockDB
export const supabase: any = {
  auth: {
    async getUser() {
      const fbUser = auth.currentUser;
      if (fbUser) {
        return {
          data: {
            user: {
              id: fbUser.uid,
              email: fbUser.email,
              user_metadata: { full_name: fbUser.displayName || "Usuário" },
            },
          },
          error: null,
        };
      }
      return {
        data: {
          user: {
            id: "usr-demo-1",
            email: "demo@cronopulse.io",
            user_metadata: { full_name: "Alex Morgan" },
          },
        },
        error: null,
      };
    },
    onAuthStateChange(callback: any) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },
  from(tableName: string) {
    return createMockQueryBuilder(tableName);
  },
};

// Helper functions for CRUD operations with Firebase Firestore as primary storage
export const employeeService = {
  async getAll(): Promise<Employee[]> {
    try {
      const remote = await firestoreService.getEmployees();
      if (remote && remote.length > 0) {
        mockDB.setEmployees(remote);
        return remote;
      } else {
        if (localStorage.getItem("crono_pulse_mock_cleared") === "true") {
          mockDB.setEmployees([]);
          return [];
        }
        // Seed initial employees to Firestore
        const initial = mockDB.getEmployees();
        for (const emp of initial) {
          firestoreService.saveEmployee(emp).catch(() => {});
        }
        return initial;
      }
    } catch (err) {
      console.warn("[Employee Service] Falling back to local data:", err);
    }
    return mockDB.getEmployees();
  },

  async create(employee: EmployeeInsert): Promise<Employee> {
    const employees = mockDB.getEmployees();
    const now = new Date().toISOString();
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      created_at: now,
      updated_at: now,
      ...employee,
    };
    mockDB.setEmployees([...employees, newEmp]);
    firestoreService.saveEmployee(newEmp).catch(console.warn);
    return newEmp;
  },

  async update(id: string, employee: EmployeeUpdate): Promise<Employee> {
    const employees = mockDB.getEmployees();
    const now = new Date().toISOString();
    let updatedEmp: Employee | null = null;
    const updatedList = employees.map((emp) => {
      if (emp.id === id) {
        updatedEmp = { ...emp, ...employee, updated_at: now };
        return updatedEmp;
      }
      return emp;
    });
    mockDB.setEmployees(updatedList);
    if (updatedEmp) {
      firestoreService.saveEmployee(updatedEmp).catch(console.warn);
    }
    return (
      updatedEmp || {
        id,
        name: employee.name || "",
        role: employee.role || "",
        weekly_hours: employee.weekly_hours || 40,
        skills: [],
        dias_de_trabalho: null,
        created_at: now,
        updated_at: now,
      }
    );
  },

  async delete(id: string): Promise<void> {
    const employees = mockDB.getEmployees().filter((e) => e.id !== id);
    mockDB.setEmployees(employees);
    firestoreService.deleteEmployee(id).catch(console.warn);
  },

  async upsert(employee: EmployeeInsert & { id?: string }): Promise<Employee> {
    if (employee.id) {
      return this.update(employee.id, employee);
    }
    return this.create(employee);
  },

  // Aliases for compatibility
  getEmployees() {
    return this.getAll();
  },
  createEmployee(emp: EmployeeInsert) {
    return this.create(emp);
  },
  updateEmployee(id: string, emp: EmployeeUpdate) {
    return this.update(id, emp);
  },
  deleteEmployee(id: string) {
    return this.delete(id);
  },
};

export const projectService = {
  async getAll(): Promise<Project[]> {
    try {
      const remote = await firestoreService.getProjects();
      if (remote && remote.length > 0) {
        mockDB.setProjects(remote);
        return remote;
      } else {
        if (localStorage.getItem("crono_pulse_mock_cleared") === "true") {
          mockDB.setProjects([]);
          return [];
        }
        // Seed initial projects to Firestore
        const initial = mockDB.getProjects();
        for (const proj of initial) {
          firestoreService.saveProject(proj).catch(() => {});
        }
        return initial;
      }
    } catch (err) {
      console.warn("[Project Service] Falling back to local data:", err);
    }
    return mockDB.getProjects();
  },

  async create(project: ProjectInsert): Promise<Project> {
    const projects = mockDB.getProjects();
    const now = new Date().toISOString();
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      created_at: now,
      updated_at: now,
      name: project.name,
      description: project.description || null,
      start_date: project.start_date || null,
      end_date: project.end_date || null,
      categoria_estrategica: project.categoria_estrategica || null,
      special_marker: project.special_marker || null,
    };
    mockDB.setProjects([...projects, newProj]);
    firestoreService.saveProject(newProj).catch(console.warn);
    return newProj;
  },

  async update(id: string, project: ProjectUpdate): Promise<Project> {
    const projects = mockDB.getProjects();
    const now = new Date().toISOString();
    let updatedProj: Project | null = null;
    const updatedList = projects.map((p) => {
      if (p.id === id) {
        updatedProj = { ...p, ...project, updated_at: now };
        return updatedProj;
      }
      return p;
    });
    mockDB.setProjects(updatedList);
    if (updatedProj) {
      firestoreService.saveProject(updatedProj).catch(console.warn);
    }
    return (
      updatedProj || {
        id,
        name: project.name || "",
        description: null,
        start_date: null,
        end_date: null,
        created_at: now,
        updated_at: now,
      }
    );
  },

  async delete(id: string): Promise<void> {
    const projects = mockDB.getProjects().filter((p) => p.id !== id);
    mockDB.setProjects(projects);
    firestoreService.deleteProject(id).catch(console.warn);
  },

  async upsert(project: ProjectInsert & { id?: string }): Promise<Project> {
    if (project.id) {
      return this.update(project.id, project);
    }
    return this.create(project);
  },

  // Aliases for compatibility
  getProjects() {
    return this.getAll();
  },
  createProject(proj: ProjectInsert) {
    return this.create(proj);
  },
  updateProject(id: string, proj: ProjectUpdate) {
    return this.update(id, proj);
  },
  deleteProject(id: string) {
    return this.delete(id);
  },
};

export const taskService = {
  async getAll(): Promise<Task[]> {
    try {
      const remote = await firestoreService.getTasks();
      if (remote && remote.length > 0) {
        mockDB.setTasks(remote);
        return mockDB.getTasks();
      } else {
        if (localStorage.getItem("crono_pulse_mock_cleared") === "true") {
          mockDB.setTasks([]);
          return [];
        }
        // Seed initial tasks to Firestore
        const initial = mockDB.getTasks();
        for (const task of initial) {
          firestoreService.saveTask(task).catch(() => {});
        }
        return initial;
      }
    } catch (err) {
      console.warn("[Task Service] Falling back to local data:", err);
    }
    return mockDB.getTasks();
  },

  async create(task: TaskInsert): Promise<Task> {
    const tasks = mockDB.getTasks();
    const now = new Date().toISOString();
    const newTask: Task = {
      id: `task-${Date.now()}`,
      created_at: now,
      updated_at: now,
      name: task.name,
      description: task.description || null,
      estimated_time: task.estimated_time || 0,
      start_date: task.start_date,
      end_date: task.end_date,
      project_id: task.project_id || null,
      assigned_employee_id: task.assigned_employee_id || null,
      status: task.status || "pending",
      completion_date: task.completion_date || null,
      repeats_weekly: task.repeats_weekly || false,
      repeat_days: task.repeat_days || null,
      hours_per_day: task.hours_per_day || null,
      special_marker: task.special_marker || null,
      exceptions: task.exceptions || null,
      dependencies: task.dependencies || [],
      parent_id: task.parent_id || null,
      progress: task.progress ?? 0,
      actual_time: task.actual_time ?? 0,
    };
    mockDB.setTasks([...tasks, newTask]);
    const populated = mockDB.getTasks().find((t) => t.id === newTask.id) || newTask;
    firestoreService.saveTask(populated).catch(console.warn);
    return populated;
  },

  async update(id: string, task: TaskUpdate): Promise<Task> {
    const tasks = mockDB.getTasks();
    const now = new Date().toISOString();
    let updatedTask: Task | null = null;
    const updatedList = tasks.map((t) => {
      if (t.id === id) {
        updatedTask = { ...t, ...task, updated_at: now };
        return updatedTask;
      }
      return t;
    });
    mockDB.setTasks(updatedList);
    const fresh = mockDB.getTasks().find((t) => t.id === id) || ({} as Task);
    firestoreService.saveTask(fresh).catch(console.warn);
    return fresh;
  },

  async delete(id: string): Promise<void> {
    const tasks = mockDB.getTasks().filter((t) => t.id !== id);
    mockDB.setTasks(tasks);
    firestoreService.deleteTask(id).catch(console.warn);
  },

  async upsert(task: TaskInsert & { id?: string }): Promise<Task> {
    if (task.id) {
      return this.update(task.id, task);
    }
    return this.create(task);
  },

  async reorderTasks(orderedTasks: Task[]): Promise<void> {
    mockDB.setTasks(orderedTasks);
    try {
      localStorage.setItem(
        "crono_pulse_task_order",
        JSON.stringify(orderedTasks.map((t) => t.id)),
      );
    } catch (e) {
      console.warn("Error saving task order:", e);
    }
    for (const t of orderedTasks) {
      firestoreService.saveTask(t).catch(() => {});
    }
  },

  // Aliases for compatibility
  getTasks() {
    return this.getAll();
  },
  createTask(t: TaskInsert) {
    return this.create(t);
  },
  updateTask(id: string, t: TaskUpdate) {
    return this.update(id, t);
  },
  deleteTask(id: string) {
    return this.delete(id);
  },
};

export const timeEntryService = {
  async getAll(): Promise<TimeEntry[]> {
    try {
      const remote = await firestoreService.getTimeEntries();
      if (remote && remote.length > 0) {
        localStorage.setItem("crono_pulse_time_entries", JSON.stringify(remote));
        return remote;
      }
    } catch (err) {
      console.warn("Firestore time entries fallback to local:", err);
    }
    try {
      const data = localStorage.getItem("crono_pulse_time_entries");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getAllSync(): TimeEntry[] {
    try {
      const data = localStorage.getItem("crono_pulse_time_entries");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async create(entry: TimeEntryInsert): Promise<TimeEntry> {
    const all = this.getAllSync();
    const newEntry: TimeEntry = {
      id: `time-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...entry,
    };
    const updated = [newEntry, ...all];
    try {
      localStorage.setItem("crono_pulse_time_entries", JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving time entry:", e);
    }
    firestoreService.saveTimeEntry(newEntry).catch(console.warn);
    return newEntry;
  },

  async update(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry | null> {
    const all = this.getAllSync();
    let updatedItem: TimeEntry | null = null;
    const updated = all.map((item) => {
      if (item.id === id) {
        updatedItem = { ...item, ...updates };
        return updatedItem;
      }
      return item;
    });
    try {
      localStorage.setItem("crono_pulse_time_entries", JSON.stringify(updated));
    } catch (e) {
      console.error("Error updating time entry:", e);
    }
    if (updatedItem) {
      firestoreService.saveTimeEntry(updatedItem).catch(console.warn);
    }
    return updatedItem;
  },

  async delete(id: string): Promise<void> {
    const all = this.getAllSync().filter((t) => t.id !== id);
    try {
      localStorage.setItem("crono_pulse_time_entries", JSON.stringify(all));
    } catch (e) {
      console.error("Error deleting time entry:", e);
    }
    firestoreService.deleteTimeEntry(id).catch(console.warn);
  },

  getActive(): {
    isRunning: boolean;
    startTime: number | null;
    elapsedSeconds: number;
    taskId: string | null;
    taskName: string;
    projectId: string | null;
    employeeId: string | null;
    description: string;
  } | null {
    try {
      const data = localStorage.getItem("crono_pulse_active_timer");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveActive(state: any): void {
    try {
      localStorage.setItem("crono_pulse_active_timer", JSON.stringify(state));
    } catch (e) {
      console.error("Error saving active timer:", e);
    }
  },

  clearActive(): void {
    try {
      localStorage.removeItem("crono_pulse_active_timer");
    } catch (e) {
      console.error("Error clearing active timer:", e);
    }
  },
};

// Global utilities to clear mock data after first login or restore demo data
export async function clearAllMockData(): Promise<void> {
  localStorage.setItem("crono_pulse_mock_cleared", "true");
  mockDB.setEmployees([]);
  mockDB.setProjects([]);
  mockDB.setTasks([]);
  localStorage.setItem("crono_pulse_time_entries", "[]");
  localStorage.setItem("crono_pulse_work_groups", "[]");
  localStorage.removeItem("crono_pulse_active_timer");

  // Clean remote Firestore docs
  try {
    const emps = await firestoreService.getEmployees();
    for (const e of emps) {
      await firestoreService.deleteEmployee(e.id).catch(() => {});
    }
    const projs = await firestoreService.getProjects();
    for (const p of projs) {
      await firestoreService.deleteProject(p.id).catch(() => {});
    }
    const tasks = await firestoreService.getTasks();
    for (const t of tasks) {
      await firestoreService.deleteTask(t.id).catch(() => {});
    }
    const times = await firestoreService.getTimeEntries();
    for (const te of times) {
      await firestoreService.deleteTimeEntry(te.id).catch(() => {});
    }
  } catch (err) {
    console.warn("Notice during remote mock data clearing:", err);
  }
}

export async function restoreMockData(): Promise<void> {
  localStorage.removeItem("crono_pulse_mock_cleared");
  const init = getInitialData();
  mockDB.setEmployees(init.employees);
  mockDB.setProjects(init.projects);
  mockDB.setTasks(init.tasks);

  // Re-seed to Firestore
  try {
    for (const e of init.employees) await firestoreService.saveEmployee(e).catch(() => {});
    for (const p of init.projects) await firestoreService.saveProject(p).catch(() => {});
    for (const t of init.tasks) await firestoreService.saveTask(t).catch(() => {});
  } catch (err) {
    console.warn("Notice during restore mock data:", err);
  }
}


