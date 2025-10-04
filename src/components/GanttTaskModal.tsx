import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { GanttTask } from '@/types/gantt';
import { ScrollArea } from './ui/scroll-area';

interface GanttTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: GanttTask | null;
  employees: any[];
  projects: any[];
  onSave: (taskData: Partial<GanttTask>) => void;
}

const GanttTaskModal: React.FC<GanttTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  employees,
  projects,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<GanttTask>>({
    text: '',
    description: '',
    start_date: new Date(),
    duration: 1,
    progress: 0,
    assignee: '',
    project_id: '',
    estimated_time: 8,
    status: 'pending',
    special_marker: '',
  });

  const [dependencies, setDependencies] = useState<string[]>([]);
  const [availableTasks, setAvailableTasks] = useState<GanttTask[]>([]);

  useEffect(() => {
    if (task) {
      setFormData({
        text: task.text || '',
        description: task.description || '',
        start_date: task.start_date || new Date(),
        duration: task.duration || 1,
        progress: task.progress || 0,
        assignee: task.assignee || '',
        project_id: task.project_id || '',
        estimated_time: task.estimated_time || 8,
        status: task.status || 'pending',
        special_marker: task.special_marker || '',
      });
    } else {
      setFormData({
        text: '',
        description: '',
        start_date: new Date(),
        duration: 1,
        progress: 0,
        assignee: '',
        project_id: '',
        estimated_time: 8,
        status: 'pending',
        special_marker: '',
      });
    }
  }, [task]);

  const handleSave = () => {
    const taskData: Partial<GanttTask> = {
      ...formData,
      assignee_name: employees.find(emp => emp.id === formData.assignee)?.name || '',
      project_name: projects.find(proj => proj.id === formData.project_id)?.name || '',
    };

    onSave(taskData);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, start_date: date }));
    }
  };

  const calculateEndDate = () => {
    if (formData.start_date && formData.duration) {
      const endDate = new Date(formData.start_date);
      endDate.setDate(endDate.getDate() + formData.duration - 1);
      return endDate;
    }
    return new Date();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {task?.id ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
          <DialogDescription>
            Configure os detalhes da tarefa, incluindo nome, responsável, datas, progresso e dependências.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-4 py-4">
            {/* Task Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-name" className="text-right">
                Nome da Tarefa
              </Label>
              <Input
                id="task-name"
                value={formData.text || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                className="col-span-3"
                placeholder="Digite o nome da tarefa"
              />
            </div>

            {/* Description */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="task-description" className="text-right pt-2">
                Descrição
              </Label>
              <Textarea
                id="task-description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder="Descrição detalhada da tarefa"
                rows={3}
              />
            </div>

            {/* Project */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-project" className="text-right">
                Projeto
              </Label>
              <Select
                value={formData.project_id || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem projeto</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-assignee" className="text-right">
                Responsável
              </Label>
              <Select
                value={formData.assignee || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignee: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não atribuído</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-start-date" className="text-right">
                Data de Início
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="col-span-3 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(formData.start_date, 'dd/MM/yyyy') : 'Selecione uma data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-duration" className="text-right">
                Duração (dias)
              </Label>
              <Input
                id="task-duration"
                type="number"
                min="1"
                value={formData.duration || 1}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                className="col-span-3"
              />
            </div>

            {/* End Date (calculated) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">
                Data de Fim
              </Label>
              <div className="col-span-3 text-sm text-muted-foreground">
                {format(calculateEndDate(), 'dd/MM/yyyy')}
              </div>
            </div>

            {/* Estimated Time */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-estimated-time" className="text-right">
                Horas Estimadas
              </Label>
              <Input
                id="task-estimated-time"
                type="number"
                min="0"
                step="0.5"
                value={formData.estimated_time || 8}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_time: parseFloat(e.target.value) || 8 }))}
                className="col-span-3"
              />
            </div>

            {/* Progress */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-progress" className="text-right">
                Progresso (%)
              </Label>
              <Input
                id="task-progress"
                type="number"
                min="0"
                max="100"
                value={Math.round((formData.progress || 0) * 100)}
                onChange={(e) => setFormData(prev => ({ ...prev, progress: (parseInt(e.target.value) || 0) / 100 }))}
                className="col-span-3"
              />
            </div>

            {/* Status */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-status" className="text-right">
                Status
              </Label>
              <Select
                value={formData.status || 'pending'}
                onValueChange={(value: 'pending' | 'in_progress' | 'completed') => {
                  setFormData(prev => ({ 
                    ...prev, 
                    status: value,
                    progress: value === 'completed' ? 1 : value === 'in_progress' ? 0.5 : 0
                  }));
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Special Marker */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-special-marker" className="text-right">
                Marcador Especial
              </Label>
              <Select
                value={formData.special_marker || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, special_marker: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um marcador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  <SelectItem value="major_release">Major Release</SelectItem>
                  <SelectItem value="major_deployment">Major Deployment</SelectItem>
                  <SelectItem value="major_theme">Major Theme</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dependencies Section */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Dependências
              </Label>
              <div className="col-span-3">
                <div className="text-sm text-muted-foreground mb-2">
                  Selecione as tarefas que devem ser concluídas antes desta tarefa começar.
                </div>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && !dependencies.includes(value)) {
                      setDependencies(prev => [...prev, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar dependência" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTasks
                      .filter(t => t.id !== task?.id && !dependencies.includes(String(t.id)))
                      .map((availableTask) => (
                        <SelectItem key={availableTask.id} value={String(availableTask.id)}>
                          {availableTask.text}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                
                {dependencies.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {dependencies.map((depId) => {
                      const depTask = availableTasks.find(t => t.id === depId);
                      return (
                        <div key={depId} className="flex items-center justify-between bg-muted p-2 rounded">
                          <span className="text-sm">{depTask?.text || depId}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDependencies(prev => prev.filter(id => id !== depId))}
                          >
                            ×
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {task?.id ? 'Atualizar' : 'Criar'} Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GanttTaskModal;