import React from "react";
import { Button } from "../ui/button";
import {
  Dialog,
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
import { Calendar } from "../ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Task, Project, Employee } from "@/lib/supabaseClient";

interface EditTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentTask: Task | null;
  onCurrentTaskChange: (
    field: keyof Task,
    value: string | number | boolean | string[] | null,
  ) => void;
  projects: Project[];
  employees: Employee[];
  onSubmit: () => void;
  handleCurrentTaskRepeatDayChange: (day: string, checked: boolean) => void;
}

export const EditTaskDialog: React.FC<EditTaskDialogProps> = ({
  isOpen,
  onOpenChange,
  currentTask,
  onCurrentTaskChange,
  projects,
  employees,
  onSubmit,
  handleCurrentTaskRepeatDayChange,
}) => {
  if (!currentTask) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details and time estimates.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96">
          <div className="grid gap-4 p-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Task Name
              </Label>
              <Input
                id="edit-name"
                value={currentTask.name}
                onChange={(e) => onCurrentTaskChange("name", e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={currentTask.description || ""}
                onChange={(e) =>
                  onCurrentTaskChange("description", e.target.value)
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-estimatedTime" className="text-right">
                Est. Hours
              </Label>
              <Input
                id="edit-estimated_time"
                type="number"
                value={currentTask.estimated_time}
                readOnly={currentTask.repeats_weekly}
                onChange={(e) =>
                  !currentTask.repeats_weekly &&
                  onCurrentTaskChange("estimated_time", Number(e.target.value))
                }
                className={`col-span-3 ${
                  currentTask.repeats_weekly
                    ? "bg-gray-100 cursor-not-allowed"
                    : ""
                }`}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-startDate" className="text-right">
                Start Date
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(
                        new Date(currentTask.start_date + "T00:00:00"),
                        "PPP",
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={new Date(currentTask.start_date + "T00:00:00")}
                      onSelect={(date) =>
                        date &&
                        onCurrentTaskChange(
                          "start_date",
                          date.toISOString().split("T")[0],
                        )
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-endDate" className="text-right">
                End Date
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(
                        new Date(currentTask.end_date + "T00:00:00"),
                        "PPP",
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={new Date(currentTask.end_date + "T00:00:00")}
                      onSelect={(date) =>
                        date &&
                        onCurrentTaskChange(
                          "end_date",
                          date.toISOString().split("T")[0],
                        )
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-project" className="text-right">
                Project
              </Label>
              <Select
                onValueChange={(value) =>
                  onCurrentTaskChange("project_id", value)
                }
                value={currentTask.project_id || "none"}
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
              <Label htmlFor="edit-status" className="text-right">
                Status
              </Label>
              <Select
                onValueChange={(
                  value: "pending" | "in_progress" | "completed",
                ) => onCurrentTaskChange("status", value)}
                value={currentTask.status}
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
            {currentTask.status === "completed" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-completion_date" className="text-right">
                  Data de Conclusão
                </Label>
                <Input
                  id="edit-completion_date"
                  type="date"
                  value={currentTask.completion_date || ""}
                  onChange={(e) =>
                    onCurrentTaskChange("completion_date", e.target.value)
                  }
                  className="col-span-3"
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-special_marker" className="text-right">
                Marcador Especial
              </Label>
              <Select
                onValueChange={(value) =>
                  onCurrentTaskChange("special_marker", value)
                }
                value={currentTask.special_marker || "none"}
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
              <Label htmlFor="edit-repeats_weekly" className="text-right">
                Repetição Semanal
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <input
                  id="edit-repeats_weekly"
                  type="checkbox"
                  checked={currentTask.repeats_weekly || false}
                  onChange={(e) =>
                    onCurrentTaskChange("repeats_weekly", e.target.checked)
                  }
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <Label htmlFor="edit-repeats_weekly" className="text-sm">
                  Esta tarefa se repete semanalmente
                </Label>
              </div>
            </div>
            {currentTask.repeats_weekly && (
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
                          id={`edit-day-${day.value}`}
                          type="checkbox"
                          checked={(currentTask.repeat_days || []).includes(
                            day.value,
                          )}
                          onChange={(e) =>
                            handleCurrentTaskRepeatDayChange(
                              day.value,
                              e.target.checked,
                            )
                          }
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <Label
                          htmlFor={`edit-day-${day.value}`}
                          className="text-sm"
                        >
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-hours_per_day" className="text-right">
                    Horas por Dia
                  </Label>
                  <Input
                    id="edit-hours_per_day"
                    type="number"
                    min="0"
                    step="0.5"
                    value={currentTask.hours_per_day || 0}
                    onChange={(e) =>
                      onCurrentTaskChange(
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-assigned-employee" className="text-right">
                Responsável
              </Label>
              <Select
                onValueChange={(value) =>
                  onCurrentTaskChange("assigned_employee_id", value)
                }
                value={currentTask.assigned_employee_id || "none"}
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
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="submit" onClick={onSubmit}>
            Update Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};