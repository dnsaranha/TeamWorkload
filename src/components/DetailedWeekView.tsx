import React, { useState, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { format } from 'date-fns';
import { type Task, type Employee, type Project } from '@/lib/supabaseClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Edit, Save, ArrowLeft, Clock } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { calculateDayWorkload, getTasksForDate } from '@/lib/workloadUtils';

interface DetailedWeekViewProps {
  tasks: Task[];
  employees: Employee[];
  projects: Project[];
  weekDates: Date[];
  selectedEmployeeId?: string | null;
  onTaskDrop: (taskId: string, employeeId: string, date: string) => void;
  onTaskUpdate: (task: Task) => void;
  onGoBack: () => void;
}

const DetailedWeekView: React.FC<DetailedWeekViewProps> = ({
  tasks,
  employees,
  projects,
  weekDates,
  selectedEmployeeId,
  onTaskDrop,
  onTaskUpdate,
  onGoBack,
}) => {
  const displayedEmployees = useMemo(() => {
    return selectedEmployeeId
      ? employees.filter(e => e.id === selectedEmployeeId)
      : employees;
  }, [selectedEmployeeId, employees]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Detailed Week View - {format(weekDates[0], 'MMMM d')} to {format(weekDates[6], 'MMMM d, yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={onGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Summary
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-grow">
        <div className="grid grid-cols-7 gap-2 p-6">
          {weekDates.map(date => (
            <div key={date.toISOString()} className="p-2 text-center text-sm font-medium text-gray-500 border-b border-gray-200">
              <div>{format(date, 'EEE')}</div>
              <div className="text-lg font-bold">{format(date, 'd')}</div>
            </div>
          ))}

          {weekDates.map(date => (
            <DroppableCell
              key={date.toISOString()}
              date={date}
              tasks={tasks}
              projects={projects}
              employees={displayedEmployees}
              allEmployees={employees}
              onTaskDrop={onTaskDrop}
              onTaskUpdate={onTaskUpdate}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const getWorkloadColor = (percentage: number) => {
  if (percentage > 100) return "bg-red-100 border-red-300 text-red-800";
  if (percentage >= 50) return "bg-yellow-100 border-yellow-300 text-yellow-800";
  return "bg-green-100 border-green-300 text-green-800";
};

const DroppableCell = ({ date, tasks, projects, employees, allEmployees, onTaskDrop, onTaskUpdate }: {
  date: Date;
  tasks: Task[];
  projects: Project[];
  employees: Employee[];
  allEmployees: Employee[];
  onTaskDrop: DetailedWeekViewProps['onTaskDrop'];
  onTaskUpdate: DetailedWeekViewProps['onTaskUpdate'];
}) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'task',
    drop: (item: { task: Task }) => {
      // Only allow dropping if a single employee is selected and it's a valid work day for them.
      const employee = employees[0];
      const isWorkDay = (employee.dias_de_trabalho || ["monday", "tuesday", "wednesday", "thursday", "friday"]).includes(format(date, 'eeee').toLowerCase());
      if (employees.length === 1 && isWorkDay) {
        onTaskDrop(item.task.id, employee.id, date.toISOString().split('T')[0]);
      }
    },
    canDrop: (item) => {
      if (employees.length !== 1) return false;
      const employee = employees[0];
      const isWorkDay = (employee.dias_de_trabalho || ["monday", "tuesday", "wednesday", "thursday", "friday"]).includes(format(date, 'eeee').toLowerCase());
      return isWorkDay;
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const handleEdit = (task: Task) => setEditingTask({ ...task });
  const handleSave = () => {
    if (editingTask) {
      onTaskUpdate(editingTask);
      setEditingTask(null);
    }
  };
  const handleCancel = () => setEditingTask(null);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (editingTask) {
      setEditingTask({ ...editingTask, [e.target.name]: e.target.value });
    }
  };

  const cellTasks = getTasksForDate(date, tasks, undefined); // Get all tasks for the day
  const workload = calculateDayWorkload(date, tasks, allEmployees, employees.length === 1 ? employees[0].id : undefined);
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div
      ref={drop}
      className={`min-h-[120px] p-2 border rounded-lg transition-colors ${isToday ? "ring-2 ring-blue-500" : ""} ${isOver && canDrop ? 'bg-blue-100' : 'bg-white'}`}
    >
      <div className="flex items-center justify-end mb-2">
        {workload.percentage > 0 && (
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getWorkloadColor(workload.percentage)}`}>
            {Math.round(workload.percentage)}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        {cellTasks.slice(0, 5).map(task => {
          const employee = allEmployees.find(e => e.id === task.assigned_employee_id);
          const isWorkDay = employee ? (employee.dias_de_trabalho || ["monday", "tuesday", "wednesday", "thursday", "friday"]).includes(format(date, 'eeee').toLowerCase()) : false;

          if (!isWorkDay) {
            return <div key={task.id} className="p-1 bg-gray-100 border-gray-300 rounded text-xs text-gray-500 italic">Task on non-working day</div>;
          }

          return editingTask?.id === task.id ? (
            <div key={task.id} className="p-2 bg-white rounded border border-blue-500 shadow-lg z-10 relative">
              <Input name="name" value={editingTask.name} onChange={handleInputChange} className="mb-2 text-xs" />
              <Textarea name="description" value={editingTask.description || ''} onChange={handleInputChange} className="mb-2 text-xs" />
              <Input name="estimated_time" type="number" value={editingTask.estimated_time} onChange={handleInputChange} className="mb-2 text-xs" />
              <div className="flex justify-end gap-1">
                <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
                <Button size="sm" onClick={handleSave}><Save className="h-3 w-3 mr-1" /> Save</Button>
              </div>
            </div>
          ) : (
            <DraggableTask key={task.id} task={task} employee={employee} onEdit={() => handleEdit(task)} />
          );
        })}
        {cellTasks.length > 5 && (
          <div className="text-xs text-gray-500 text-center">
            +{cellTasks.length - 5} more
          </div>
        )}
      </div>
      {workload.hours > 0 && (
        <div className="mt-2 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {workload.hours.toFixed(1)}h
            </div>
            {workload.capacity > 0 && (
              <div className="text-xs text-gray-500">
                /{workload.capacity.toFixed(1)}h
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DraggableTask = ({ task, employee, onEdit }: { task: Task, employee?: Employee, onEdit: () => void }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'task',
    item: { task },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`text-xs p-1 bg-blue-50 border border-blue-200 rounded truncate cursor-move group relative ${isDragging ? 'opacity-50' : ''}`}
      title={`${task.name} - ${employee?.name}`}
    >
      <div className="font-medium text-blue-900 truncate">{task.name}</div>
      {employee && <div className="text-blue-600 truncate">{employee.name}</div>}
      <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover:opacity-100" onClick={onEdit}>
        <Edit className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default DetailedWeekView;
