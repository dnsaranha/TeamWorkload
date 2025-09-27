import React, { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Info, Grid3X3 } from "lucide-react";
import { format } from "date-fns";
import {
  taskService,
  type Employee,
  type Project,
} from "@/lib/supabaseClient";
import { TaskWithRelations } from "./types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const DraggableTask = ({ task }: { task: TaskWithRelations }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "task",
    item: { task },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`p-2 mb-2 bg-blue-50 border border-blue-200 rounded cursor-move transition-opacity ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
    >
      <div className="font-medium text-sm text-blue-900 truncate">
        {task.name}
      </div>
      <div className="text-xs text-blue-600">
        {task.estimated_time}h - {task.project?.name || "No project"}
      </div>
    </div>
  );
};

const DroppableCell = ({
  date,
  employee,
  tasks,
  onTaskDrop,
  onTasksChange,
}: {
  date: string;
  employee: Employee;
  tasks: TaskWithRelations[];
  onTaskDrop: (
    task: TaskWithRelations,
    employeeId: string,
    date: string,
  ) => void;
  onTasksChange: (tasks: TaskWithRelations[]) => void;
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "task",
    drop: (item: { task: TaskWithRelations }) => {
      onTaskDrop(item.task, employee.id, date);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");

  const cellTasks = tasks.filter((task) => {
    if (task.assigned_employee_id !== employee.id) {
      return false;
    }

    const cellDate = new Date(date + "T00:00:00Z");
    const startDate = new Date(task.start_date + "T00:00:00Z");
    const endDate = new Date(task.end_date + "T00:00:00Z");

    if (cellDate < startDate || cellDate > endDate) {
      return false;
    }

    const cellDayOfWeekJs = cellDate.getUTCDay();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const cellDayName = dayNames[cellDayOfWeekJs];

    if (task.repeats_weekly) {
      return (
        Array.isArray(task.repeat_days) && task.repeat_days.includes(cellDayName)
      );
    }

    const employeeWorkDays = employee.dias_de_trabalho || [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ];
    if (!employeeWorkDays.includes(cellDayName)) {
      return false;
    }

    return true;
  });

  const totalHours = cellTasks.reduce((sum, task) => {
    const startDate = new Date(task.start_date);
    const endDate = new Date(task.end_date);
    const daysDiff = Math.max(
      1,
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1,
    );
    return sum + task.estimated_time / daysDiff;
  }, 0);

  const dailyCapacity = employee.weekly_hours / 5;
  const percentage = (totalHours / dailyCapacity) * 100;

  const getWorkloadColor = (percentage: number) => {
    if (percentage > 100) return "bg-red-100 border-red-300";
    if (percentage >= 50) return "bg-yellow-100 border-yellow-300";
    return "bg-green-100 border-green-300";
  };

  const handleEditTask = (task: TaskWithRelations) => {
    setEditingTask(task.id);
    setTempStartDate(task.start_date);
    setTempEndDate(task.end_date);
  };

  const handleSaveTaskDates = async (taskId: string) => {
    try {
      const updatedTask = await taskService.update(taskId, {
        start_date: tempStartDate,
        end_date: tempEndDate,
      });

      const updatedTasks = tasks.map((t) =>
        t.id === taskId ? (updatedTask as TaskWithRelations) : t,
      );

      onTasksChange(updatedTasks);
      setEditingTask(null);
    } catch (error) {
      console.error("Error updating task dates:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setTempStartDate("");
    setTempEndDate("");
  };

  return (
    <div
      ref={drop}
      className={`min-h-[100px] p-2 border-2 border-dashed transition-colors ${
        isOver ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
      } ${getWorkloadColor(percentage)}`}
    >
      <div className="text-xs text-gray-600 mb-1">
        {totalHours.toFixed(1)}h ({percentage.toFixed(0)}%)
      </div>
      <div className="space-y-1">
        {cellTasks.map((task) => (
          <div key={task.id}>
            {editingTask === task.id ? (
              <div className="text-xs p-2 bg-white border border-blue-300 rounded space-y-2">
                <div className="font-medium truncate text-blue-900">
                  {task.name}
                </div>
                <div className="space-y-1">
                  <div>
                    <Label className="text-xs text-gray-600">Início:</Label>
                    <Input
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Fim:</Label>
                    <Input
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => setTempEndDate(e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => handleSaveTaskDates(task.id)}
                    className="h-5 px-2 text-xs"
                  >
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="h-5 px-2 text-xs"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="text-xs p-1 bg-white border border-gray-300 rounded truncate cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                onClick={() => handleEditTask(task)}
              >
                <div className="font-medium truncate">{task.name}</div>
                <div className="text-gray-500">{task.estimated_time}h</div>
                <div className="text-xs text-gray-400">
                  {format(new Date(task.start_date + "T00:00:00"), "dd/MM")} -{" "}
                  {format(new Date(task.end_date + "T00:00:00"), "dd/MM")}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface DragDropGridProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: TaskWithRelations[];
  employees: Employee[];
  onTasksChange: (tasks: TaskWithRelations[]) => void;
}

export const DragDropGrid: React.FC<DragDropGridProps> = ({
  isOpen,
  onOpenChange,
  tasks,
  employees,
  onTasksChange,
}) => {
  const getWeekDates = (startDate: Date) => {
    const dates = [];
    const start = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
      ),
    );
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }
    return dates;
  };

  const [gridStartDate, setGridStartDate] = useState(() => {
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    const date = today.getUTCDate();
    const day = today.getUTCDay();
    const mondayUTCDate = new Date(
      Date.UTC(year, month, date - day + (day === 0 ? -6 : 1)),
    );
    return mondayUTCDate;
  });

  const weekDates = getWeekDates(gridStartDate);
  const unassignedTasks = tasks.filter((task) => !task.assigned_employee_id);

  const handleTaskDrop = async (
    task: TaskWithRelations,
    employeeId: string,
    date: string,
  ) => {
    try {
      const updatedTask = await taskService.update(task.id, {
        assigned_employee_id: employeeId,
        start_date: date,
        end_date: date,
      });

      const updatedTasks = tasks.map((t) =>
        t.id === task.id ? (updatedTask as TaskWithRelations) : t,
      );

      onTasksChange(updatedTasks);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 size={20} />
            Drag & Drop Task Scheduler
          </DialogTitle>
          <DialogDescription>
            Drag tasks from the unassigned list to employee cells to schedule
            them.
          </DialogDescription>
        </DialogHeader>

        <DndProvider backend={HTML5Backend}>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info size={16} className="text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Como usar:</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>
                      Arraste tarefas não atribuídas para as células dos
                      funcionários
                    </li>
                    <li>
                      As cores indicam a carga de trabalho: Verde (&lt;50%),
                      Amarelo (50-100%), Vermelho (&gt;100%)
                    </li>
                    <li>
                      As tarefas são automaticamente reatribuídas quando soltas
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  const newDate = new Date(gridStartDate);
                  newDate.setDate(gridStartDate.getDate() - 7);
                  setGridStartDate(newDate);
                }}
              >
                ← Semana Anterior
              </Button>
              <h3 className="text-lg font-semibold">
                Semana de {format(gridStartDate, "dd/MM/yyyy")}
              </h3>
              <Button
                variant="outline"
                onClick={() => {
                  const newDate = new Date(gridStartDate);
                  newDate.setDate(gridStartDate.getDate() + 7);
                  setGridStartDate(newDate);
                }}
              >
                Próxima Semana →
              </Button>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Tarefas Não Atribuídas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-96 overflow-y-auto">
                    {unassignedTasks.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Todas as tarefas estão atribuídas
                      </p>
                    ) : (
                      unassignedTasks.map((task) => (
                        <DraggableTask key={task.id} task={task} />
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="col-span-9">
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-8 bg-gray-50">
                    <div className="p-3 font-medium text-sm border-r">
                      Funcionário
                    </div>
                    {weekDates.map((date) => (
                      <div
                        key={date}
                        className="p-3 font-medium text-sm border-r text-center"
                      >
                        <div>{format(new Date(date), "EEE")}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(date), "dd/MM")}
                        </div>
                      </div>
                    ))}
                  </div>

                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="grid grid-cols-8 border-t"
                    >
                      <div className="p-3 font-medium text-sm border-r bg-gray-50 flex items-center">
                        <div>
                          <div>{employee.name}</div>
                          <div className="text-xs text-gray-500">
                            {employee.weekly_hours}h/semana
                          </div>
                        </div>
                      </div>
                      {weekDates.map((date) => (
                        <div
                          key={`${employee.id}-${date}`}
                          className="border-r"
                        >
                          <DroppableCell
                            date={date}
                            employee={employee}
                            tasks={tasks}
                            onTaskDrop={handleTaskDrop}
                            onTasksChange={onTasksChange}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DndProvider>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};