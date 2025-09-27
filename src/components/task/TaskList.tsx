import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { TaskWithRelations } from "./types";

interface TaskListProps {
  loading: boolean;
  tasks: TaskWithRelations[];
  filteredTasks: TaskWithRelations[];
  onEdit: (task: TaskWithRelations) => void;
  onDelete: (id: string) => void;
  onAssign: (task: TaskWithRelations) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  loading,
  tasks,
  filteredTasks,
  onEdit,
  onDelete,
  onAssign,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task Name</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Est. Hours</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assigned To</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-6">
              Loading tasks...
            </TableCell>
          </TableRow>
        ) : filteredTasks.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-6">
              {tasks.length === 0
                ? "No tasks found"
                : "No tasks match the current filters"}
            </TableCell>
          </TableRow>
        ) : (
          filteredTasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.name}</TableCell>
              <TableCell>{task.project?.name || "No project"}</TableCell>
              <TableCell>{task.estimated_time}h</TableCell>
              <TableCell>
                {format(new Date(task.start_date + "T00:00:00"), "MMM d")} -{" "}
                {format(new Date(task.end_date + "T00:00:00"), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    task.status === "completed"
                      ? "default"
                      : task.status === "in_progress"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {task.status === "pending"
                    ? "Pendente"
                    : task.status === "in_progress"
                    ? "Em Andamento"
                    : "Concluída"}
                </Badge>
                {task.status === "completed" && task.completion_date && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Concluída em{" "}
                    {format(new Date(task.completion_date), "dd/MM/yyyy")}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {task.assigned_employee?.name || (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAssign(task)}
                  >
                    Assign
                  </Button>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(task)}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(task.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};