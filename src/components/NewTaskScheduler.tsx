import React, { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  taskService,
  employeeService,
  type Task,
  type Employee,
  type Project,
} from "@/lib/supabaseClient";
import { format } from "date-fns";
import { AlertTriangle, GripVertical } from "lucide-react";

type TaskWithRelations = Task & {
  project: Project | null;
  assigned_employee: Employee | null;
};

interface NewTaskSchedulerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const dayNumberToName: { [key: number]: string } = {
  0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday", 4: "thursday", 5: "friday", 6: "saturday",
};

// --- Sub-components for the Scheduler ---

// Draggable Unassigned Task
const DraggableTask = ({ task }: { task: TaskWithRelations }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "task",
    item: { task },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));
  return (
    <div ref={drag} className={`p-2 border-b flex items-center gap-2 ${isDragging ? 'opacity-50' : 'opacity-100'}`}>
      <GripVertical className="h-4 w-4 text-gray-400" />
      <span className="text-sm">{task.name}</span>
    </div>
  );
};

// Droppable Cell in the Grid
const DroppableCell = ({ date, employee, tasks, onTaskDrop }: { date: Date, employee: Employee, tasks: TaskWithRelations[], onTaskDrop: (task: Task, employeeId: string, date: Date) => void }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "task",
    drop: (item: { task: TaskWithRelations }) => onTaskDrop(item.task, employee.id, date),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }));

  const dayName = dayNumberToName[date.getUTCDay()];
  const workDays = employee.dias_de_trabalho || ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const isWorkDay = workDays.includes(dayName);

  const dailyCapacity = (employee.weekly_hours || 40) / (workDays.length || 5);

  const tasksForThisCell = tasks.filter(t => {
    const taskDate = new Date(t.start_date + "T00:00:00Z");
    return t.assigned_employee_id === employee.id && taskDate.getUTCDate() === date.getUTCDate() && taskDate.getUTCMonth() === date.getUTCMonth() && taskDate.getUTCFullYear() === date.getUTCFullYear();
  });

  const hoursInCell = tasksForThisCell.reduce((sum, task) => sum + task.estimated_time, 0);
  const isOverloaded = hoursInCell > dailyCapacity;

  return (
    <div ref={drop} className={`border-r h-24 p-1 space-y-1 overflow-y-auto ${!isWorkDay ? 'bg-gray-200' : isOver ? 'bg-blue-100' : 'bg-white'}`}>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{hoursInCell.toFixed(1)}h / {dailyCapacity.toFixed(1)}h</span>
        {isOverloaded && <AlertTriangle className="h-4 w-4 text-red-500" />}
      </div>
      {tasksForThisCell.map(task => (
         <div key={task.id} className="bg-blue-50 border border-blue-200 rounded p-1 text-xs truncate" title={task.name}>
           {task.name}
         </div>
      ))}
    </div>
  );
};


// --- Main Scheduler Component ---

const NewTaskScheduler: React.FC<NewTaskSchedulerProps> = ({
  isOpen,
  onOpenChange,
}) => {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const getWeekDates = (date: Date) => {
    const week = [];
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const dayOfMonth = date.getUTCDate();
    const dayOfWeek = date.getUTCDay();
    const sundayDate = new Date(Date.UTC(year, month, dayOfMonth - dayOfWeek));
    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(sundayDate.valueOf());
      weekDay.setUTCDate(sundayDate.getUTCDate() + i);
      week.push(weekDay);
    }
    return week;
  };

  const weekDates = getWeekDates(currentDate);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, currentDate]); // Reload data when week changes

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, employeesData] = await Promise.all([
        taskService.getAll(),
        employeeService.getAll(),
      ]);
      setTasks(tasksData as TaskWithRelations[]);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error loading scheduler data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskDrop = async (task: Task, employeeId: string, date: Date) => {
    // This is where the core bug fix happens.
    // The dropped `date` is a clean Date object. We format it to YYYY-MM-DD for the DB.
    const newDateStr = date.toISOString().split("T")[0];

    try {
      const updatedTask = await taskService.update(task.id, {
        assigned_employee_id: employeeId,
        start_date: newDateStr,
        end_date: newDateStr, // Simple drop sets start and end to the same day
      });

      // Update local state to reflect the change immediately
      setTasks(prevTasks => prevTasks.map(t => t.id === task.id ? updatedTask as TaskWithRelations : t));

    } catch (error) {
       console.error("Failed to update task on drop", error);
       alert("Failed to schedule task. Please try again.");
    }
  };

  const unassignedTasks = tasks.filter((task) => !task.assigned_employee_id);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-auto">
        <DndProvider backend={HTML5Backend}>
          <DialogHeader>
            <DialogTitle>New Task Scheduler</DialogTitle>
            <DialogDescription>
              Drag tasks from the unassigned list to schedule them.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between p-4">
            <Button
              variant="outline"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() - 7);
                setCurrentDate(newDate);
              }}
            >
              &larr; Previous Week
            </Button>
            <h3 className="text-lg font-semibold">
              Week of {format(weekDates[0], "MMMM d, yyyy")}
            </h3>
            <Button
              variant="outline"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() + 7);
                setCurrentDate(newDate);
              }}
            >
              Next Week &rarr;
            </Button>
          </div>

          <div className="grid grid-cols-12 gap-4 p-4">
            <div className="col-span-3">
              <h4 className="font-bold mb-2">Unassigned Tasks</h4>
              <div className="p-2 border rounded-lg h-full max-h-[60vh] overflow-y-auto">
                {loading ? <p>Loading...</p> : unassignedTasks.map(task => (
                  <DraggableTask key={task.id} task={task} />
                ))}
              </div>
            </div>

            <div className="col-span-9">
               <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-8 bg-gray-50">
                    <div className="p-3 font-medium text-sm border-r">Employee</div>
                    {weekDates.map((date) => (
                      <div key={date.toISOString()} className="p-3 font-medium text-sm border-r text-center">
                        <div>{format(date, "EEE")}</div>
                        <div className="text-xs text-gray-500">{format(date, "dd/MM")}</div>
                      </div>
                    ))}
                  </div>
                  {loading ? <div className="p-4 text-center">Loading employees...</div> : employees.map((employee) => (
                     <div key={employee.id} className="grid grid-cols-8 border-t">
                        <div className="p-3 font-medium text-sm border-r bg-gray-50 flex items-center">
                           {employee.name}
                        </div>
                        {weekDates.map((date) => (
                           <DroppableCell key={date.toISOString()} date={date} employee={employee} tasks={tasks} onTaskDrop={handleTaskDrop} />
                        ))}
                     </div>
                  ))}
               </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DndProvider>
      </DialogContent>
    </Dialog>
  );
};

export default NewTaskScheduler;
