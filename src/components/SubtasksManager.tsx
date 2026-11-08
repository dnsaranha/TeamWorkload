import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Clock,
  Calendar as CalendarIcon,
  User,
  Users,
  Sparkles,
  ListTodo,
  Check,
  Edit2,
  ArrowRight,
} from "lucide-react";
import {
  type Task,
  type Subtask,
  type Employee,
  taskService,
} from "@/lib/supabaseClient";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { format, parseISO } from "date-fns";

interface SubtasksManagerProps {
  task: Task;
  employees: Employee[];
  onTaskUpdated?: (updatedTask: Task) => void;
  compact?: boolean;
}

export const SubtasksManager: React.FC<SubtasksManagerProps> = ({
  task,
  employees,
  onTaskUpdated,
  compact = false,
}) => {
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Form state for adding new subtask
  const [newTitle, setNewTitle] = useState("");
  const [newEstimatedHours, setNewEstimatedHours] = useState<string>("");
  const [newEmployeeId, setNewEmployeeId] = useState<string>("none");
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleAddSubtask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const assignedEmp = employees.find((emp) => emp.id === newEmployeeId);

      const hoursNum = parseFloat(newEstimatedHours);
      let effectiveDueDate = newDueDate ? newDueDate : null;
      if (effectiveDueDate) {
        if (task.start_date && effectiveDueDate < task.start_date) {
          effectiveDueDate = task.start_date;
        }
        if (task.end_date && effectiveDueDate > task.end_date) {
          effectiveDueDate = task.end_date;
        }
      }

      const updated = await taskService.addSubtask(task.id, {
        title: newTitle.trim(),
        completed: false,
        estimated_time: !isNaN(hoursNum) && hoursNum > 0 ? hoursNum : null,
        assigned_employee_id: newEmployeeId !== "none" ? newEmployeeId : null,
        assigned_employee_name: assignedEmp ? assignedEmp.name : null,
        due_date: effectiveDueDate,
      });

      // Clear form
      setNewTitle("");
      setNewEstimatedHours("");
      setNewEmployeeId("none");
      setNewDueDate("");

      if (onTaskUpdated) {
        onTaskUpdated(updated);
      }
    } catch (err) {
      console.error("Erro ao adicionar subtarefa:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (subtaskId: string) => {
    try {
      const updated = await taskService.toggleSubtask(task.id, subtaskId);
      if (onTaskUpdated) {
        onTaskUpdated(updated);
      }
    } catch (err) {
      console.error("Erro ao alternar status da subtarefa:", err);
    }
  };

  const handleDelete = async (subtaskId: string) => {
    try {
      const updated = await taskService.deleteSubtask(task.id, subtaskId);
      if (onTaskUpdated) {
        onTaskUpdated(updated);
      }
    } catch (err) {
      console.error("Erro ao remover subtarefa:", err);
    }
  };

  const handleUpdateSubtaskField = async (
    subtaskId: string,
    patch: Partial<Subtask>
  ) => {
    try {
      const updated = await taskService.updateSubtask(task.id, subtaskId, patch);
      if (onTaskUpdated) {
        onTaskUpdated(updated);
      }
    } catch (err) {
      console.error("Erro ao atualizar campo da subtarefa:", err);
    }
  };

  const saveEditTitle = async (subtaskId: string) => {
    if (!editingTitle.trim()) {
      setEditingSubtaskId(null);
      return;
    }
    await handleUpdateSubtaskField(subtaskId, { title: editingTitle.trim() });
    setEditingSubtaskId(null);
  };

  return (
    <div className={`space-y-3 ${compact ? "p-3 bg-muted/20 rounded-md border border-border/70" : "p-4 bg-card rounded-lg border border-border"}`}>
      {/* Header with stats and progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <ListTodo className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
              <span>Subtarefas</span>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold">
                {completedCount} de {totalCount} concluída{totalCount === 1 ? "" : "s"}
              </Badge>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {totalCount === 0
                ? "Divida esta tarefa em etapas menores executáveis"
                : `${percent}% concluído`}
            </p>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="flex items-center gap-2.5 sm:w-48">
            <div className="flex-1">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    percent === 100
                      ? "bg-emerald-500"
                      : percent > 50
                      ? "bg-primary"
                      : "bg-amber-500"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              {percent}%
            </span>
          </div>
        )}
      </div>

      {/* Subtasks List */}
      <div className="space-y-1.5">
        {totalCount === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground bg-muted/10 rounded-md border border-dashed border-border/80">
            <p className="font-medium">Nenhuma subtarefa adicionada</p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              Utilize o formulário abaixo para adicionar a primeira subtarefa
            </p>
          </div>
        ) : (
          subtasks.map((subtask, index) => {
            const assignedEmp = employees.find((e) => e.id === subtask.assigned_employee_id);
            const isEditing = editingSubtaskId === subtask.id;

            return (
              <div
                key={subtask.id}
                className={`flex items-center justify-between gap-2 p-2 rounded-md transition-colors text-xs border ${
                  subtask.completed
                    ? "bg-muted/30 border-border/40 text-muted-foreground"
                    : "bg-background border-border/60 hover:border-primary/40 shadow-2xs"
                }`}
              >
                {/* Left: Checkbox & Title */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(subtask.id)}
                    className="shrink-0 p-0.5 rounded-full hover:scale-110 transition-transform cursor-pointer"
                    title={subtask.completed ? "Desmarcar subtarefa" : "Concluir subtarefa"}
                  >
                    {subtask.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/60 hover:text-primary transition-colors" />
                    )}
                  </button>

                  <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-4">
                    {index + 1}.
                  </span>

                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <Input
                        type="text"
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditTitle(subtask.id);
                          if (e.key === "Escape") setEditingSubtaskId(null);
                        }}
                        className="h-7 text-xs py-0 px-2"
                      />
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => saveEditTitle(subtask.id)}
                        className="h-7 px-2 text-[10px]"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span
                      onClick={() => {
                        setEditingSubtaskId(subtask.id);
                        setEditingTitle(subtask.title);
                      }}
                      className={`truncate flex-1 font-medium cursor-text hover:underline ${
                        subtask.completed ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                      title="Clique para editar título"
                    >
                      {subtask.title}
                    </span>
                  )}
                </div>

                {/* Right: Meta (Hours, Due Date, Assignee, Actions) */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Estimated Hours */}
                  {subtask.estimated_time ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 px-1.5 gap-1 font-mono text-muted-foreground bg-muted/30"
                      title="Esforço estimado da subtarefa"
                    >
                      <Clock className="h-2.5 w-2.5" />
                      <span>{subtask.estimated_time}h</span>
                    </Badge>
                  ) : null}

                  {/* Due Date */}
                  {subtask.due_date ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 px-1.5 gap-1 text-muted-foreground bg-muted/30 hidden sm:inline-flex"
                      title="Prazo da subtarefa"
                    >
                      <CalendarIcon className="h-2.5 w-2.5" />
                      <span>{format(parseISO(subtask.due_date), "dd/MM")}</span>
                    </Badge>
                  ) : null}

                  {/* Assignee Selection */}
                  <Select
                    value={subtask.assigned_employee_id || "none"}
                    onValueChange={(val) => {
                      const emp = employees.find((e) => e.id === val);
                      handleUpdateSubtaskField(subtask.id, {
                        assigned_employee_id: val === "none" ? null : val,
                        assigned_employee_name: emp ? emp.name : null,
                      });
                    }}
                  >
                    <SelectTrigger className="h-6 w-24 sm:w-28 text-[10px] px-1.5 py-0 border-border/60 bg-muted/30">
                      <div className="flex items-center gap-1 truncate">
                        <User className="h-2.5 w-2.5 shrink-0 opacity-60" />
                        <span className="truncate">
                          {assignedEmp ? assignedEmp.name.split(" ")[0] : "Sem resp."}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">Sem responsável</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id} className="text-xs">
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(subtask.id)}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Excluir subtarefa"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Add Subtask Form */}
      <form
        onSubmit={handleAddSubtask}
        className="pt-2 border-t border-border/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
      >
        <div className="relative flex-1">
          <Input
            placeholder="Nova subtarefa... (ex: Preparar documentação)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={isSubmitting}
            className="h-8 text-xs bg-background pr-6"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {/* Estimated Hours */}
          <div className="relative w-20">
            <Input
              type="number"
              step="0.5"
              min="0.5"
              placeholder="Horas"
              value={newEstimatedHours}
              onChange={(e) => setNewEstimatedHours(e.target.value)}
              disabled={isSubmitting}
              className="h-8 text-xs font-mono px-2"
              title="Horas estimadas"
            />
            <span className="absolute right-2 top-2 text-[10px] text-muted-foreground pointer-events-none">
              h
            </span>
          </div>

          {/* Assignee select */}
          <Select
            value={newEmployeeId}
            onValueChange={setNewEmployeeId}
            disabled={isSubmitting}
          >
            <SelectTrigger className="h-8 w-28 text-xs px-2">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">Nenhum</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id} className="text-xs">
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Due date picker (constrained by task start and end) */}
          <div className="relative w-28">
            <Input
              type="date"
              value={newDueDate}
              min={task.start_date || undefined}
              max={task.end_date || undefined}
              onChange={(e) => setNewDueDate(e.target.value)}
              disabled={isSubmitting}
              className="h-8 text-[11px] px-1 font-mono"
              title={`Prazo da subtarefa (restrito ao período de ${task.start_date} a ${task.end_date})`}
            />
          </div>

          {/* Add Button */}
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !newTitle.trim()}
            className="h-8 px-3 text-xs gap-1.5 font-semibold shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SubtasksManager;
