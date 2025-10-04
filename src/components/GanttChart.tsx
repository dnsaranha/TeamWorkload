import React, { useEffect, useRef, useState } from 'react';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Plus, Save, Download, Upload, Settings } from 'lucide-react';
import { GanttTask, GanttLink, GanttData } from '@/types/gantt';
import { taskService, projectService, employeeService } from '@/lib/supabaseClient';
import GanttTaskModal from './GanttTaskModal';

interface GanttChartProps {
  className?: string;
}

const GanttChart: React.FC<GanttChartProps> = ({ className = '' }) => {
  const ganttContainer = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Initialize Gantt chart
  useEffect(() => {
    if (ganttContainer.current && !isInitialized) {
      initializeGantt();
      setIsInitialized(true);
      loadData();
    }

    return () => {
      if (isInitialized) {
        gantt.clearAll();
      }
    };
  }, [isInitialized]);

  const initializeGantt = () => {
    // Configure Gantt chart
    gantt.config.date_format = '%Y-%m-%d %H:%i:%s';
    gantt.config.xml_date = '%Y-%m-%d %H:%i:%s';
    gantt.config.duration_unit = 'day';
    gantt.config.duration_step = 1;
    gantt.config.scale_unit = 'day';
    gantt.config.date_scale = '%d %M';
    gantt.config.min_column_width = 50;
    gantt.config.fit_tasks = true;
    gantt.config.auto_scheduling = true;
    gantt.config.auto_scheduling_strict = true;

    // Configure subscales for better time visualization
    gantt.config.subscales = [
      { unit: 'month', step: 1, date: '%F %Y' },
      { unit: 'week', step: 1, date: 'Week #%W' }
    ];

    // Configure columns
    gantt.config.columns = [
      {
        name: 'text',
        label: 'Nome da Tarefa',
        width: 200,
        tree: true,
        resize: true
      },
      {
        name: 'start_date',
        label: 'Início',
        width: 80,
        align: 'center',
        resize: true
      },
      {
        name: 'duration',
        label: 'Duração',
        width: 60,
        align: 'center',
        resize: true
      },
      {
        name: 'assignee_name',
        label: 'Responsável',
        width: 120,
        align: 'center',
        resize: true
      }
    ];

    // Enable drag and drop
    gantt.config.drag_links = true;
    gantt.config.drag_progress = true;
    gantt.config.drag_resize = true;
    gantt.config.drag_move = true;

    // Configure task types
    gantt.config.types = {
      task: 'task',
      project: 'project',
      milestone: 'milestone'
    };

    // Event handlers
    gantt.attachEvent('onTaskDblClick', (id: string) => {
      const task = gantt.getTask(id);
      setSelectedTask(task as GanttTask);
      setIsTaskModalOpen(true);
      return false; // Prevent default edit dialog
    });

    gantt.attachEvent('onAfterTaskAdd', (id: string, task: any) => {
      handleTaskCreate(task);
    });

    gantt.attachEvent('onAfterTaskUpdate', (id: string, task: any) => {
      handleTaskUpdate(id, task);
    });

    gantt.attachEvent('onAfterTaskDelete', (id: string) => {
      handleTaskDelete(id);
    });

    gantt.attachEvent('onAfterLinkAdd', (id: string, link: any) => {
      handleLinkCreate(link);
    });

    gantt.attachEvent('onAfterLinkDelete', (id: string, link: any) => {
      handleLinkDelete(id);
    });

    // Custom task template
    gantt.templates.task_text = (start: Date, end: Date, task: any) => {
      return `<b>${task.text}</b> (${task.assignee_name || 'Não atribuído'})`;
    };

    // Custom progress text
    gantt.templates.progress_text = (start: Date, end: Date, task: any) => {
      return `<span style='text-align:left;'>${Math.round(task.progress * 100)}%</span>`;
    };

    // Custom tooltip
    gantt.templates.tooltip_text = (start: Date, end: Date, task: any) => {
      return `
        <b>Tarefa:</b> ${task.text}<br/>
        <b>Início:</b> ${gantt.templates.tooltip_date_format(start)}<br/>
        <b>Fim:</b> ${gantt.templates.tooltip_date_format(end)}<br/>
        <b>Progresso:</b> ${Math.round(task.progress * 100)}%<br/>
        <b>Responsável:</b> ${task.assignee_name || 'Não atribuído'}<br/>
        <b>Projeto:</b> ${task.project_name || 'Sem projeto'}
      `;
    };

    // Initialize the Gantt chart
    gantt.init(ganttContainer.current!);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading Gantt data...');
      
      // Load employees and projects for reference
      const [employeesData, projectsData, tasksData] = await Promise.all([
        employeeService.getAll().catch(err => {
          console.warn('Failed to load employees:', err);
          return [];
        }),
        projectService.getAll().catch(err => {
          console.warn('Failed to load projects:', err);
          return [];
        }),
        taskService.getAll().catch(err => {
          console.warn('Failed to load tasks:', err);
          return [];
        })
      ]);

      console.log('Loaded data:', { 
        employees: employeesData.length, 
        projects: projectsData.length, 
        tasks: tasksData.length 
      });

      setEmployees(employeesData);
      setProjects(projectsData);

      // If no data exists, create some sample data
      if (tasksData.length === 0 && projectsData.length === 0) {
        console.log('No data found, creating sample tasks...');
        
        const sampleTasks: GanttTask[] = [
          {
            id: 'sample_1',
            text: 'Tarefa de Exemplo 1',
            start_date: new Date(),
            duration: 3,
            progress: 0.3,
            type: 'task',
            assignee_name: 'Não atribuído',
            project_name: 'Projeto Exemplo',
            description: 'Esta é uma tarefa de exemplo para demonstrar o Gantt Chart'
          },
          {
            id: 'sample_2',
            text: 'Tarefa de Exemplo 2',
            start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            duration: 5,
            progress: 0.6,
            type: 'task',
            assignee_name: 'Não atribuído',
            project_name: 'Projeto Exemplo',
            description: 'Segunda tarefa de exemplo'
          },
          {
            id: 'sample_3',
            text: 'Tarefa de Exemplo 3',
            start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            duration: 2,
            progress: 0,
            type: 'task',
            assignee_name: 'Não atribuído',
            project_name: 'Projeto Exemplo',
            description: 'Terceira tarefa de exemplo'
          }
        ];

        // Load sample data into Gantt
        gantt.parse({
          data: sampleTasks,
          links: []
        });

        console.log('Sample data loaded');
        return;
      }

      // Convert tasks to Gantt format
      const ganttTasks: GanttTask[] = tasksData.map(task => {
        const employee = employeesData.find(emp => emp.id === task.assigned_employee_id);
        const project = projectsData.find(proj => proj.id === task.project_id);
        
        return {
          id: task.id,
          text: task.name,
          start_date: new Date(task.start_date),
          duration: Math.max(1, Math.ceil((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24))),
          progress: task.status === 'completed' ? 1 : task.status === 'in_progress' ? 0.5 : 0,
          assignee: task.assigned_employee_id,
          assignee_name: employee?.name || 'Não atribuído',
          project_id: task.project_id,
          project_name: project?.name || 'Sem projeto',
          description: task.description,
          estimated_time: task.estimated_time,
          status: task.status as 'pending' | 'in_progress' | 'completed',
          special_marker: task.special_marker,
          type: 'task',
          open: true
        };
      });

      // Add projects as parent tasks
      const ganttProjects: GanttTask[] = projectsData.map(project => {
        const projectTasks = ganttTasks.filter(task => task.project_id === project.id);
        const startDate = projectTasks.length > 0 
          ? new Date(Math.min(...projectTasks.map(t => t.start_date.getTime())))
          : new Date(project.start_date || new Date());
        
        const endDate = projectTasks.length > 0
          ? new Date(Math.max(...projectTasks.map(t => new Date(t.start_date.getTime() + t.duration * 24 * 60 * 60 * 1000).getTime())))
          : new Date(project.end_date || new Date());

        const duration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

        return {
          id: `project_${project.id}`,
          text: project.name,
          start_date: startDate,
          duration: duration,
          progress: 0,
          type: 'project',
          open: true,
          readonly: true
        };
      });

      // Set parent relationships
      ganttTasks.forEach(task => {
        if (task.project_id) {
          task.parent = `project_${task.project_id}`;
        }
      });

      const allTasks = [...ganttProjects, ...ganttTasks];

      console.log('Parsed tasks for Gantt:', allTasks.length);

      // Load data into Gantt
      gantt.parse({
        data: allTasks,
        links: [] // We'll implement links later if needed
      });

    } catch (error) {
      console.error('Error loading Gantt data:', error);
      setError(`Erro ao carregar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      // Load sample data as fallback
      const sampleTasks: GanttTask[] = [
        {
          id: 'fallback_1',
          text: 'Tarefa de Demonstração',
          start_date: new Date(),
          duration: 5,
          progress: 0.4,
          type: 'task',
          assignee_name: 'Demo User',
          project_name: 'Projeto Demo',
          description: 'Tarefa de demonstração - dados não puderam ser carregados'
        }
      ];

      gantt.parse({
        data: sampleTasks,
        links: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreate = async (task: any) => {
    try {
      // Don't create if it's a project task
      if (task.id.startsWith('project_')) return;

      const taskData = {
        name: task.text,
        description: task.description || '',
        estimated_time: task.estimated_time || 8,
        start_date: gantt.date.date_to_str('%Y-%m-%d')(task.start_date),
        end_date: gantt.date.date_to_str('%Y-%m-%d')(new Date(task.start_date.getTime() + task.duration * 24 * 60 * 60 * 1000)),
        project_id: task.project_id || null,
        assigned_employee_id: task.assignee || null,
        status: 'pending' as const
      };

      const createdTask = await taskService.create(taskData);
      
      // Update the Gantt task with the real ID
      gantt.changeTaskId(task.id, createdTask.id);
      
    } catch (error) {
      console.error('Error creating task:', error);
      gantt.deleteTask(task.id);
    }
  };

  const handleTaskUpdate = async (id: string, task: any) => {
    try {
      // Don't update if it's a project task
      if (id.startsWith('project_')) return;

      const taskData = {
        name: task.text,
        description: task.description || '',
        estimated_time: task.estimated_time || 8,
        start_date: gantt.date.date_to_str('%Y-%m-%d')(task.start_date),
        end_date: gantt.date.date_to_str('%Y-%m-%d')(new Date(task.start_date.getTime() + task.duration * 24 * 60 * 60 * 1000)),
        project_id: task.project_id || null,
        assigned_employee_id: task.assignee || null,
        status: task.progress >= 1 ? 'completed' : task.progress > 0 ? 'in_progress' : 'pending'
      };

      await taskService.update(id, taskData);
      
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleTaskDelete = async (id: string) => {
    try {
      // Don't delete if it's a project task
      if (id.startsWith('project_')) return;

      await taskService.delete(id);
      
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleLinkCreate = async (link: any) => {
    // TODO: Implement task dependencies in the database
    console.log('Link created:', link);
  };

  const handleLinkDelete = async (id: string) => {
    // TODO: Implement task dependencies deletion
    console.log('Link deleted:', id);
  };

  const handleAddTask = () => {
    const newTask: GanttTask = {
      id: gantt.uid(),
      text: 'Nova Tarefa',
      start_date: new Date(),
      duration: 1,
      progress: 0,
      type: 'task'
    };

    setSelectedTask(newTask);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<GanttTask>) => {
    try {
      if (selectedTask?.id && gantt.isTaskExists(selectedTask.id)) {
        // Update existing task
        const updatedTask = { ...selectedTask, ...taskData };
        gantt.updateTask(selectedTask.id, updatedTask);
      } else {
        // Create new task
        const newTask: GanttTask = {
          id: gantt.uid(),
          text: taskData.text || 'Nova Tarefa',
          start_date: taskData.start_date || new Date(),
          duration: taskData.duration || 1,
          progress: taskData.progress || 0,
          assignee: taskData.assignee,
          assignee_name: taskData.assignee_name,
          project_id: taskData.project_id,
          project_name: taskData.project_name,
          description: taskData.description,
          estimated_time: taskData.estimated_time,
          status: taskData.status || 'pending',
          type: 'task'
        };

        gantt.addTask(newTask);
      }

      setIsTaskModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleExportData = () => {
    const data = gantt.serialize();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        gantt.parse(data);
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Erro ao importar dados. Verifique se o arquivo está no formato correto.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`bg-white ${className}`}>
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Gráfico de Gantt
              {error && (
                <span className="text-sm text-orange-600 font-normal">
                  (Modo demonstração)
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTask}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                Nova Tarefa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Exportar
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="gantt-import"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => document.getElementById('gantt-import')?.click()}
                >
                  <Upload size={16} />
                  Importar
                </Button>
              </div>
            </div>
          </div>
          {error && (
            <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
              {error}. Exibindo dados de demonstração.
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Carregando dados do Gantt...</p>
              </div>
            </div>
          ) : (
            <div
              ref={ganttContainer}
              className="gantt-container"
              style={{ width: '100%', height: '600px' }}
            />
          )}
        </CardContent>
      </Card>

      {/* Task Modal */}
      <GanttTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        employees={employees}
        projects={projects}
        onSave={handleSaveTask}
      />
    </div>
  );
};

export default GanttChart;