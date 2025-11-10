import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface MCPToolResponse<T = any> {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
  _meta?: {
    progressToken?: number;
  };
  data?: T;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
  selfLink?: string;
}

export interface GoogleTask {
  id?: string;
  title: string;
  notes?: string;
  status?: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  parent?: string;
  position?: string;
  links?: Array<{
    type: string;
    description: string;
    link: string;
  }>;
  updated?: string;
  selfLink?: string;
}

export interface ListTaskListsRequest {
  maxResults?: number;
  pageToken?: string;
}

export interface ListTaskListsResponse {
  items: GoogleTaskList[];
  nextPageToken?: string;
}

export interface ListTasksRequest {
  taskListId: string;
  maxResults?: number;
  pageToken?: string;
  showCompleted?: boolean;
  showDeleted?: boolean;
  showHidden?: boolean;
  dueMin?: string;
  dueMax?: string;
  updatedMin?: string;
  completedMin?: string;
  completedMax?: string;
}

export interface ListTasksResponse {
  items: GoogleTask[];
  nextPageToken?: string;
}

export interface InsertTaskRequest {
  taskListId: string;
  task: GoogleTask;
  parent?: string;
  previous?: string;
}

export interface PatchTaskRequest {
  taskListId: string;
  taskId: string;
  task: Partial<GoogleTask>;
}

export interface DeleteTaskRequest {
  taskListId: string;
  taskId: string;
}

// ============================================================================
// MCP Tool Call Helper
// ============================================================================

async function callMCPTool<T>(
  toolName: string,
  args: Record<string, any>
): Promise<MCPToolResponse<T>> {
  try {
    const { data, error } = await supabase.functions.invoke('mcp-proxy', {
      body: {
        tool: toolName,
        arguments: args,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to call MCP tool');
    }

    return data as MCPToolResponse<T>;
  } catch (error) {
    console.error(`Error calling ${toolName}:`, error);
    throw error;
  }
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to list all task lists
 */
export function useTaskLists(request: ListTaskListsRequest = {}, enabled = true) {
  return useQuery<MCPToolResponse<ListTaskListsResponse>, Error>({
    queryKey: ['task-lists', request],
    queryFn: async () => {
      return callMCPTool<ListTaskListsResponse>('GOOGLETASKS_LIST_TASK_LISTS', {
        maxResults: request.maxResults || 100,
        pageToken: request.pageToken,
      });
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to list tasks in a task list
 */
export function useTasks(request: ListTasksRequest, enabled = true) {
  return useQuery<MCPToolResponse<ListTasksResponse>, Error>({
    queryKey: ['tasks', request],
    queryFn: async () => {
      return callMCPTool<ListTasksResponse>('GOOGLETASKS_LIST_TASKS', {
        taskListId: request.taskListId,
        maxResults: request.maxResults || 100,
        pageToken: request.pageToken,
        showCompleted: request.showCompleted ?? true,
        showDeleted: request.showDeleted ?? false,
        showHidden: request.showHidden ?? false,
        dueMin: request.dueMin,
        dueMax: request.dueMax,
        updatedMin: request.updatedMin,
        completedMin: request.completedMin,
        completedMax: request.completedMax,
      });
    },
    enabled: enabled && !!request.taskListId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to create a new task
 */
export function useInsertTask() {
  const queryClient = useQueryClient();

  return useMutation<MCPToolResponse<GoogleTask>, Error, InsertTaskRequest>({
    mutationFn: async (request: InsertTaskRequest) => {
      return callMCPTool<GoogleTask>('GOOGLETASKS_INSERT_TASK', {
        taskListId: request.taskListId,
        task: request.task,
        parent: request.parent,
        previous: request.previous,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate tasks queries for the specific task list
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', { taskListId: variables.taskListId }] 
      });
    },
  });
}

/**
 * Hook to update an existing task
 */
export function usePatchTask() {
  const queryClient = useQueryClient();

  return useMutation<MCPToolResponse<GoogleTask>, Error, PatchTaskRequest>({
    mutationFn: async (request: PatchTaskRequest) => {
      return callMCPTool<GoogleTask>('GOOGLETASKS_PATCH_TASK', {
        taskListId: request.taskListId,
        taskId: request.taskId,
        task: request.task,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate tasks queries for the specific task list
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', { taskListId: variables.taskListId }] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['task', variables.taskId] 
      });
    },
  });
}

/**
 * Hook to delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation<MCPToolResponse<void>, Error, DeleteTaskRequest>({
    mutationFn: async (request: DeleteTaskRequest) => {
      return callMCPTool<void>('GOOGLETASKS_DELETE_TASK', {
        taskListId: request.taskListId,
        taskId: request.taskId,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate tasks queries for the specific task list
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', { taskListId: variables.taskListId }] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['task', variables.taskId] 
      });
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get incomplete tasks from a task list
 */
export function useIncompleteTasks(taskListId: string, enabled = true) {
  return useTasks(
    {
      taskListId,
      showCompleted: false,
      maxResults: 100,
    },
    enabled
  );
}

/**
 * Hook to get completed tasks from a task list
 */
export function useCompletedTasks(taskListId: string, enabled = true) {
  return useTasks(
    {
      taskListId,
      showCompleted: true,
      maxResults: 100,
    },
    enabled
  );
}

/**
 * Hook to get tasks due in a date range
 */
export function useTasksDueInRange(
  taskListId: string,
  dueMin: string,
  dueMax: string,
  enabled = true
) {
  return useTasks(
    {
      taskListId,
      dueMin,
      dueMax,
      showCompleted: false,
    },
    enabled
  );
}

/**
 * Hook to mark a task as complete
 */
export function useCompleteTask() {
  const patchTask = usePatchTask();

  return useMutation<MCPToolResponse<GoogleTask>, Error, { taskListId: string; taskId: string }>({
    mutationFn: async ({ taskListId, taskId }) => {
      return patchTask.mutateAsync({
        taskListId,
        taskId,
        task: {
          status: 'completed',
          completed: new Date().toISOString(),
        },
      });
    },
  });
}

/**
 * Hook to mark a task as incomplete
 */
export function useUncompleteTask() {
  const patchTask = usePatchTask();

  return useMutation<MCPToolResponse<GoogleTask>, Error, { taskListId: string; taskId: string }>({
    mutationFn: async ({ taskListId, taskId }) => {
      return patchTask.mutateAsync({
        taskListId,
        taskId,
        task: {
          status: 'needsAction',
          completed: undefined,
        },
      });
    },
  });
}
