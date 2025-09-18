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
  const displayedEmployees = useMemo(() => selectedEmployeeId
    ? employees.filter(e => e.id === selectedEmployeeId)
    : employees, [selectedEmployeeId, employees]);

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
        {/* Desktop Grid View */}
        <div className="hidden md:grid" style={{ gridTemplateColumns: `150px repeat(7, 1fr)` }}>
          <div className="font-semibold p-2 border-b border-r sticky top-0 bg-white z-10">Employee</div>
          {weekDates.map(date => (
            <div key={date.toISOString()} className="font-semibold p-2 text-center border-b sticky top-0 bg-white z-10">
              <div>{format(date, 'EEE')}</div>
              <div className="text-lg font-bold">{format(date, 'd')}</div>
            </div>
          ))}
          {displayedEmployees.map(employee => (
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

        {/* Mobile List View */}
        <div className="md:hidden p-4 space-y-4">
          {displayedEmployees.map(employee => (
            <div key={employee.id} className="border rounded-lg">
              <h3 className="font-semibold p-3 bg-gray-50 border-b">{employee.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-200">
                {weekDates.map(date => {
                    const isWorkDay = (employee.dias_de_trabalho || ["monday", "tuesday", "wednesday", "thursday", "friday"]).includes(format(date, 'eeee').toLowerCase());
                    if (!isWorkDay) return null; // Don't show non-working days on mobile
                    return (
                        <div key={date.toISOString()} className="bg-white p-2">
                             <div className="font-semibold text-center pb-2 mb-2 border-b">
                                {format(date, 'EEE, MMM d')}
                            </div>
                            <DroppableCell
                                date={date}
                                employee={employee}
                                tasks={tasks}
                                projects={projects}
                                allEmployees={employees}
                                onTaskDrop={onTaskDrop}
                                onTaskUpdate={onTaskUpdate}
                                isMobileView={true}
                            />
                        </div>
                    )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const getWorkloadColor = (percentage: number, isMobileView?: boolean) => {
  if (percentage > 100) return isMobileView ? "bg-red-50" : "bg-red-100 border-red-300 text-red-800";
  if (percentage >= 50) return isMobileView ? "bg-yellow-50" : "bg-yellow-100 border-yellow-300 text-yellow-800";
  if (percentage > 0) return isMobileView ? "bg-green-50" : "bg-green-100 border-green-300 text-green-800";
  return "bg-transparent";
};

const DroppableCell = ({ date, employee, tasks, onTaskDrop, onTaskUpdate, projects, allEmployees, isMobileView = false }: { date: Date; employee: Employee; tasks: Task[]; onTaskDrop: DetailedWeekViewProps['onTaskDrop'], onTaskUpdate: DetailedWeekViewProps['onTaskUpdate'], projects: Project[], allEmployees: Employee[], isMobileView?: boolean }) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const cellTasks = getTasksForDate(date, tasks, employee);
  const workload = calculateDayWorkload(date, tasks, allEmployees, employee.id);
  const isWorkDay = (employee.dias_de_trabalho || ["monday", "tuesday", "wednesday", "thursday", "friday"]).includes(format(date, 'eeee').toLowerCase());

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'task',
    drop: (item: { task: Task }) => {
      onTaskDrop(item.task.id, employee.id, date.toISOString().split('T')[0]);
    },
    canDrop: () => isWorkDay,
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const handleEdit = (task: Task) => setEditingTask({ ...task });
  const handleSave = () => { if (editingTask) { onTaskUpdate(editingTask); setEditingTask(null); } };
  const handleCancel = () => setEditingTask(null);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (editingTask) setEditingTask({ ...editingTask, [e.target.name]: e.target.value });
  };

  const cellClassName = isMobileView
    ? 'min-h-[80px]'
    : `p-1 border-b min-h-[100px] transition-colors ${!isWorkDay ? 'bg-gray-50' : isOver && canDrop ? 'bg-blue-50' : ''}`;

  return (
    <div ref={drop} className={cellClassName}>
      <div className="flex items-center justify-end mb-1">
        {workload.percentage > 0 && (
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getWorkloadColor(workload.percentage, isMobileView)}`}>
            {Math.round(workload.percentage)}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        {cellTasks.map(task =>
          editingTask?.id === task.id ? (
            <div key={task.id} className="p-2 bg-white rounded border border-blue-500 shadow-lg z-10 relative">
              <Input name="name" value={editingTask.name} onChange={handleInputChange} className="mb-2 text-xs" />
              <Input name="estimated_time" type="number" value={editingTask.estimated_time} onChange={handleInputChange} className="mb-2 text-xs" />
              <div className="flex justify-end gap-1">
                <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
                <Button size="sm" onClick={handleSave}><Save className="h-3 w-3 mr-1" /> Save</Button>
              </div>
            </div>
          ) : (
            <DraggableTask key={task.id} task={task} project={projects.find(p => p.id === task.project_id)} onEdit={() => handleEdit(task)} />
          )
        )}
      </div>
    </div>
  );
};

const DraggableTask = ({ task, project, onEdit }: { task: Task, project?: Project, onEdit: () => void }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'task',
    item: { task },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div ref={drag} className={`text-xs p-1 bg-blue-50 border border-blue-200 rounded truncate cursor-move group relative ${isDragging ? 'opacity-50' : ''}`} title={`${task.name} - ${project?.name}`}>
      <div className="font-medium text-blue-900 truncate">{task.name}</div>
      {project && <div className="text-blue-600 truncate">{project.name}</div>}
      <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover:opacity-100" onClick={onEdit}>
        <Edit className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default DetailedWeekView;
