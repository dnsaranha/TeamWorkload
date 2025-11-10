import React, { useState } from 'react';
import {
  useTaskLists,
  useTasks,
  useInsertTask,
  usePatchTask,
  useDeleteTask,
  useCompleteTask,
  useUncompleteTask,
  useIncompleteTasks,
  useCompletedTasks,
  GoogleTask,
} from './google-tasks';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';

/**
 * Example component demonstrating Google Tasks hooks usage
 */
export function GoogleTasksExample() {
  const [selectedTaskListId, setSelectedTaskListId] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  // ============================================================================
  // Queries
  // ============================================================================

  // Get all task lists
  const { data: taskLists, isLoading: loadingTaskLists } = useTaskLists();

  // Get tasks from selected task list
  const { data: tasks, isLoading: loadingTasks } = useTasks(
    { taskListId: selectedTaskListId },
    !!selectedTaskListId
  );

  // Get incomplete tasks
  const { data: incompleteTasks } = useIncompleteTasks(
    selectedTaskListId,
    !!selectedTaskListId
  );

  // Get completed tasks
  const { data: completedTasks } = useCompletedTasks(
    selectedTaskListId,
    !!selectedTaskListId
  );

  // ============================================================================
  // Mutations
  // ============================================================================

  const insertTask = useInsertTask();
  const patchTask = usePatchTask();
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();
  const uncompleteTask = useUncompleteTask();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleCreateTask = async () => {
    if (!selectedTaskListId || !newTaskTitle) return;

    try {
      await insertTask.mutateAsync({
        taskListId: selectedTaskListId,
        task: {
          title: newTaskTitle,
          notes: newTaskNotes,
          status: 'needsAction',
        },
      });

      setNewTaskTitle('');
      setNewTaskNotes('');
      console.log('Task created successfully');
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<GoogleTask>) => {
    if (!selectedTaskListId) return;

    try {
      await patchTask.mutateAsync({
        taskListId: selectedTaskListId,
        taskId,
        task: updates,
      });

      console.log('Task updated successfully');
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedTaskListId) return;

    try {
      await deleteTask.mutateAsync({
        taskListId: selectedTaskListId,
        taskId,
      });

      console.log('Task deleted successfully');
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleToggleComplete = async (taskId: string, isCompleted: boolean) => {
    if (!selectedTaskListId) return;

    try {
      if (isCompleted) {
        await uncompleteTask.mutateAsync({
          taskListId: selectedTaskListId,
          taskId,
        });
      } else {
        await completeTask.mutateAsync({
          taskListId: selectedTaskListId,
          taskId,
        });
      }
    } catch (error) {
      console.error('Failed to toggle task completion:', error);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <h1 className="text-3xl font-bold">Google Tasks Hooks Example</h1>

      {/* Task Lists Selection */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Task Lists</h2>
        {loadingTaskLists ? (
          <p>Loading task lists...</p>
        ) : (
          <div className="space-y-2">
            {taskLists?.data?.items.map((taskList) => (
              <Button
                key={taskList.id}
                variant={selectedTaskListId === taskList.id ? 'default' : 'outline'}
                onClick={() => setSelectedTaskListId(taskList.id)}
                className="w-full justify-start"
              >
                {taskList.title}
              </Button>
            ))}
          </div>
        )}
      </Card>

      {/* Create New Task */}
      {selectedTaskListId && (
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Create New Task</h2>
          <div className="space-y-3">
            <Input
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <Textarea
              placeholder="Task notes (optional)"
              value={newTaskNotes}
              onChange={(e) => setNewTaskNotes(e.target.value)}
            />
            <Button
              onClick={handleCreateTask}
              disabled={!newTaskTitle || insertTask.isPending}
            >
              {insertTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
            {insertTask.isError && (
              <p className="text-red-500 text-sm">Error: {insertTask.error.message}</p>
            )}
          </div>
        </Card>
      )}

      {/* Incomplete Tasks */}
      {selectedTaskListId && (
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Incomplete Tasks</h2>
          {loadingTasks ? (
            <p>Loading tasks...</p>
          ) : (
            <div className="space-y-2">
              {incompleteTasks?.data?.items.map((task) => (
                <div key={task.id} className="border p-3 rounded flex items-start gap-3">
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() =>
                      task.id && handleToggleComplete(task.id, task.status === 'completed')
                    }
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{task.title}</h3>
                    {task.notes && (
                      <p className="text-sm text-gray-600 mt-1">{task.notes}</p>
                    )}
                    {task.due && (
                      <p className="text-xs text-gray-500 mt-1">
                        Due: {new Date(task.due).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        task.id &&
                        handleUpdateTask(task.id, {
                          title: task.title + ' (Updated)',
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => task.id && handleDeleteTask(task.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {incompleteTasks?.data?.items.length === 0 && (
                <p className="text-gray-500">No incomplete tasks</p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Completed Tasks */}
      {selectedTaskListId && (
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Completed Tasks</h2>
          <div className="space-y-2">
            {completedTasks?.data?.items.map((task) => (
              <div key={task.id} className="border p-3 rounded flex items-start gap-3 opacity-60">
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() =>
                    task.id && handleToggleComplete(task.id, task.status === 'completed')
                  }
                />
                <div className="flex-1">
                  <h3 className="font-semibold line-through">{task.title}</h3>
                  {task.completed && (
                    <p className="text-xs text-gray-500 mt-1">
                      Completed: {new Date(task.completed).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => task.id && handleDeleteTask(task.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
            {completedTasks?.data?.items.length === 0 && (
              <p className="text-gray-500">No completed tasks</p>
            )}
          </div>
        </Card>
      )}

      {/* All Tasks Summary */}
      {selectedTaskListId && (
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded">
              <p className="text-3xl font-bold text-blue-600">
                {incompleteTasks?.data?.items.length || 0}
              </p>
              <p className="text-sm text-gray-600">Incomplete</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <p className="text-3xl font-bold text-green-600">
                {completedTasks?.data?.items.length || 0}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
