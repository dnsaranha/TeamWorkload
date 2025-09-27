import React from "react";
import { Button } from "../ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Project, Employee } from "@/lib/supabaseClient";
import { NewTask } from "./types";

interface NewTaskDialogProps {
  newTask: NewTask;
  onNewTaskChange: (
    field: keyof NewTask,
    value: string | number | boolean | string[],
  ) => void;
  projects: Project[];
  employees: Employee[];
  onSubmit: () => void;
  handleRepeatDayChange: (day: string, checked: boolean) => void;
}

export const NewTaskDialog: React.FC<NewTaskDialogProps> = ({
  newTask,
  onNewTaskChange,
  projects,
  employees,
  onSubmit,
  handleRepeatDayChange,
}) => {
  return (
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
              onChange={(e) => onNewTaskChange("name", e.target.value)}
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
              onChange={(e) => onNewTaskChange("description", e.target.value)}
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
                onNewTaskChange("estimated_time", Number(e.target.value))
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
              <Popover>
                <PopoverTrigger asChild>
                  <Input
                    id="startDate"
                    type="date"
                    value={newTask.start_date}
                    onChange={(e) =>
                      onNewTaskChange("start_date", e.target.value)
                    }
                    className="w-full"
                  />
                </PopoverTrigger>
              </Popover>
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
                onChange={(e) => onNewTaskChange("end_date", e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project" className="text-right">
              Project
            </Label>
            <Select
              onValueChange={(value) => onNewTaskChange("project_id", value)}
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
                onNewTaskChange("assigned_employee_id", value)
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
              onValueChange={(value: "pending" | "in_progress" | "completed") =>
                onNewTaskChange("status", value)
              }
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
                  onNewTaskChange("completion_date", e.target.value)
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
                onNewTaskChange("special_marker", value)
              }
              value={newTask.special_marker}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione um marcador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="major_release">Major Release</SelectItem>
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
                onChange={(e) => {
                  onNewTaskChange("repeats_weekly", e.target.checked);
                  if (!e.target.checked) {
                    onNewTaskChange("repeat_days", []);
                    onNewTaskChange("hours_per_day", 0);
                  }
                }}
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
                          handleRepeatDayChange(day.value, e.target.checked)
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
                    onNewTaskChange(
                      "hours_per_day",
                      parseFloat(e.target.value) || 0,
                    )
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
        <Button type="submit" onClick={onSubmit}>
          Create Task
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};