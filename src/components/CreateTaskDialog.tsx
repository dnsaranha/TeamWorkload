import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  taskService,
  type Task,
  type Project,
  type Employee,
} from "@/lib/supabaseClient";

interface CreateTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  projects: Project[];
  employees: Employee[];
  onTaskCreated: () => void;
}

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  isOpen,
  onOpenChange,
  projects,
  employees,
  onTaskCreated,
}) => {
  const [newTask, setNewTask] = useState({
    name: "",
    description: "",
    estimated_time: 0,
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    project_id: "none",
    assigned_employee_id: "none",
    status: "pending" as "pending" | "in_progress" | "completed",
    completion_date: "",
    repeats_weekly: false,
    repeat_days: [] as string[],
    hours_per_day: 0,
    special_marker: "none",
  });

  useEffect(() => {
    if (newTask.repeats_weekly) {
      const calculatedHours =
        (newTask.repeat_days?.length || 0) * (newTask.hours_per_day || 0);
      setNewTask((prev) => ({ ...prev, estimated_time: calculatedHours }));
    }
  }, [newTask.repeats_weekly, newTask.repeat_days, newTask.hours_per_day]);

  const handleCreateTask = async () => {
    try {
      const taskData = {
        name: newTask.name,
        description: newTask.description,
        estimated_time: newTask.estimated_time,
        start_date: newTask.start_date,
        end_date: newTask.end_date,
        project_id:
          newTask.project_id === "none" ? null : newTask.project_id || null,
        assigned_employee_id:
          newTask.assigned_employee_id === "none"
            ? null
            : newTask.assigned_employee_id || null,
        status: newTask.status,
        completion_date:
          newTask.status === "completed" && newTask.completion_date
            ? newTask.completion_date
            : null,
        repeats_weekly: newTask.repeats_weekly,
        repeat_days: newTask.repeats_weekly ? newTask.repeat_days : null,
        hours_per_day: newTask.repeats_weekly ? newTask.hours_per_day : null,
        special_marker:
          newTask.special_marker === "none" ? null : newTask.special_marker,
      };

      await taskService.create(taskData);
      onTaskCreated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleRepeatDayChange = (day: string, checked: boolean) => {
    if (checked) {
      setNewTask({
        ...newTask,
        repeat_days: [...newTask.repeat_days, day],
      });
    } else {
      setNewTask({
        ...newTask,
        repeat_days: newTask.repeat_days.filter((d) => d !== day),
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task with details and time estimates.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96">
          <div className="grid gap-4 p-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Task Name
              </Label>
              <Input
                id="name"
                value={newTask.name}
                onChange={(e) =>
                  setNewTask({ ...newTask, name: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="estimatedTime" className="text-right">
                Est. Hours
              </Label>
              <Input
                id="estimated_time"
                type="number"
                value={newTask.estimated_time}
                readOnly={newTask.repeats_weekly}
                onChange={(e) =>
                  !newTask.repeats_weekly &&
                  setNewTask({
                    ...newTask,
                    estimated_time: Number(e.target.value),
                  })
                }
                className={`col-span-3 ${
                  newTask.repeats_weekly
                    ? "bg-gray-100 cursor-not-allowed"
                    : ""
                }`}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start Date
              </Label>
              <div className="col-span-3">
                <Input
                  id="startDate"
                  type="date"
                  value={newTask.start_date}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      start_date: e.target.value,
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">
                End Date
              </Label>
              <div className="col-span-3">
                <Input
                  id="endDate"
                  type="date"
                  value={newTask.end_date}
                  onChange={(e) =>
                    setNewTask({ ...newTask, end_date: e.target.value })
                  }
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project" className="text-right">
                Project
              </Label>
              <Select
                onValueChange={(value) =>
                  setNewTask({ ...newTask, project_id: value })
                }
                value={newTask.project_id}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assigned_employee" className="text-right">
                Responsável
              </Label>
              <Select
                onValueChange={(value) =>
                  setNewTask({ ...newTask, assigned_employee_id: value })
                }
                value={newTask.assigned_employee_id}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não atribuído</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                onValueChange={(
                  value: "pending" | "in_progress" | "completed",
                ) => setNewTask({ ...newTask, status: value })}
                value={newTask.status}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newTask.status === "completed" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="completion_date" className="text-right">
                  Data de Conclusão
                </Label>
                <Input
                  id="completion_date"
                  type="date"
                  value={newTask.completion_date}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      completion_date: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="special_marker" className="text-right">
                Marcador Especial
              </Label>
              <Select
                onValueChange={(value) =>
                  setNewTask({ ...newTask, special_marker: value })
                }
                value={newTask.special_marker}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um marcador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="major_release">
                    Major Release
                  </SelectItem>
                  <SelectItem value="major_deployment">
                    Major Deployment
                  </SelectItem>
                  <SelectItem value="major_theme">Major Theme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="repeats_weekly" className="text-right">
                Repetição Semanal
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <input
                  id="repeats_weekly"
                  type="checkbox"
                  checked={newTask.repeats_weekly}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      repeats_weekly: e.target.checked,
                      repeat_days: e.target.checked
                        ? newTask.repeat_days
                        : [],
                      hours_per_day: e.target.checked
                        ? newTask.hours_per_day
                        : 0,
                    })
                  }
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <Label htmlFor="repeats_weekly" className="text-sm">
                  Esta tarefa se repete semanalmente
                </Label>
              </div>
            </div>
            {newTask.repeats_weekly && (
              <>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Dias da Semana</Label>
                  <div className="col-span-3 grid grid-cols-2 gap-2">
                    {[
                      { value: "monday", label: "Segunda" },
                      { value: "tuesday", label: "Terça" },
                      { value: "wednesday", label: "Quarta" },
                      { value: "thursday", label: "Quinta" },
                      { value: "friday", label: "Sexta" },
                      { value: "saturday", label: "Sábado" },
                      { value: "sunday", label: "Domingo" },
                    ].map((day) => (
                      <div
                        key={day.value}
                        className="flex items-center space-x-2"
                      >
                        <input
                          id={`day-${day.value}`}
                          type="checkbox"
                          checked={newTask.repeat_days.includes(day.value)}
                          onChange={(e) =>
                            handleRepeatDayChange(
                              day.value,
                              e.target.checked,
                            )
                          }
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <Label
                          htmlFor={`day-${day.value}`}
                          className="text-sm"
                        >
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hours_per_day" className="text-right">
                    Horas por Dia
                  </Label>
                  <Input
                    id="hours_per_day"
                    type="number"
                    min="0"
                    step="0.5"
                    value={newTask.hours_per_day}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        hours_per_day: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="col-span-3"
                    placeholder="Ex: 2.5"
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="submit" onClick={handleCreateTask}>
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
