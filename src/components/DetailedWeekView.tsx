import React, { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { format } from 'date-fns';
import { type Task, type Employee, type Project } from '@/lib/supabaseClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Edit, Save } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { calculateDayWorkload } from '@/lib/workloadUtils';

interface DetailedWeekViewProps {
  tasks: Task[];
  employees: Employee[];
  projects: Project[];
  weekDates: Date[];
  onTaskDrop: (taskId: string, employeeId: string, date: string) => void;
  onTaskUpdate: (task: Task) => void;
  onGoBack: () => void;
}

const DetailedWeekView: React.FC<DetailedWeekViewProps> = ({
  tasks,
  employees,
  projects,
  weekDates,
  onTaskDrop,
  onTaskUpdate,
  onGoBack,
}) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-xl font-semibold">Detailed Week View</h2>
        <button onClick={onGoBack} className="text-blue-600 hover:underline">
          &larr; Back to Summary
        </button>
      </div>
      <ScrollArea className="flex-grow">
        <div className="grid" style={{ gridTemplateColumns: `150px repeat(7, 1fr)` }}>
          {/* Header */}
          <div className="font-semibold p-2 border-b border-r sticky top-0 bg-white z-10">Employee</div>
          {weekDates.map(date => (
            <div key={date.toISOString()} className="font-semibold p-2 text-center border-b sticky top-0 bg-white z-10">
              <div>{format(date, 'EEE')}</div>
              <div className="text-xs text-gray-500">{format(date, 'dd/MM')}</div>
            </div>
          ))}

          {/* Body */}
          {employees.map(employee => (
            <React.Fragment key={employee.id}>
              <div className="p-2 border-r flex items-center bg-gray-50 sticky left-0">
                <div className="font-medium">{employee.name}</div>
              </div>
              {weekDates.map(date => (
                <DroppableCell
                  key={date.toISOString()}
                  date={date}
                  employee={employee}
                  tasks={tasks}
                  projects={projects}
                allEmployees={employees}
                  onTaskDrop={onTaskDrop}
                  onTaskUpdate={onTaskUpdate}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const getWorkloadColor = (percentage: number) => {
  if (percentage > 100) return "bg-red-100";
  if (percentage >= 50) return "bg-yellow-100";
  if (percentage > 0) return "bg-green-100";
  return "bg-white";
};

const DroppableCell = ({ date, employee, tasks, onTaskDrop, onTaskUpdate, projects, allEmployees }: { date: Date; employee: Employee; tasks: Task[]; onTaskDrop: DetailedWeekViewProps['onTaskDrop'], onTaskUpdate: DetailedWeekViewProps['onTaskUpdate'], projects: Project[], allEmployees: Employee[] }) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const dateString = date.toISOString().split('T')[0];
  const cellTasks = tasks.filter(task =>
    task.assigned_employee_id === employee.id &&
    task.start_date <= dateString &&
    task.end_date >= dateString
  );

  const workload = calculateDayWorkload(date, tasks, allEmployees, employee.id);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'task',
    drop: (item: { task: Task }) => {
      onTaskDrop(item.task.id, employee.id, dateString);
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
    }),
  }));

  const handleEdit = (task: Task) => {
    setEditingTask({ ...task });
  };

  const handleSave = () => {
    if (editingTask) {
      onTaskUpdate(editingTask);
      setEditingTask(null);
    }
  };

  const handleCancel = () => {
    setEditingTask(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (editingTask) {
      setEditingTask({ ...editingTask, [e.target.name]: e.target.value });
    }
  };

  return (
    <div
      ref={drop}
      className={`p-1 border-b min-h-[100px] transition-colors ${isOver ? 'bg-blue-50' : getWorkloadColor(workload.percentage)}`}
    >
      <div className="text-xs text-gray-500 text-right">{workload.hours.toFixed(1)}h ({Math.round(workload.percentage)}%)</div>
      {cellTasks.map(task => (
        editingTask?.id === task.id ? (
          <div key={task.id} className="p-2 bg-white rounded border border-blue-500">
            <Input name="name" value={editingTask.name} onChange={handleInputChange} className="mb-2" />
            <Textarea name="description" value={editingTask.description || ''} onChange={handleInputChange} className="mb-2" />
            <Input name="estimated_time" type="number" value={editingTask.estimated_time} onChange={handleInputChange} className="mb-2" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
              <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save</Button>
            </div>
          </div>
        ) : (
          <DraggableTask key={task.id} task={task} onEdit={() => handleEdit(task)} />
        )
      ))}
    </div>
  );
};

const DraggableTask = ({ task, onEdit }: { task: Task, onEdit: () => void }) => {
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
      className={`p-2 mb-1 bg-blue-100 rounded text-sm cursor-move group relative ${isDragging ? 'opacity-50' : ''}`}
    >
      {task.name}
      <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={onEdit}>
        <Edit className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default DetailedWeekView;
