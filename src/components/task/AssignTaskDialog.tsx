import React from "react";
import { Button } from "../ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Employee } from "@/lib/supabaseClient";
import { TaskWithRelations } from "./types";

interface AssignTaskDialogProps {
  currentTask: TaskWithRelations;
  onCurrentTaskChange: (
    field: keyof TaskWithRelations,
    value: string | null,
  ) => void;
  employees: Employee[];
  onSubmit: () => void;
}

export const AssignTaskDialog: React.FC<AssignTaskDialogProps> = ({
  currentTask,
  onCurrentTaskChange,
  employees,
  onSubmit,
}) => {
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Assign Task</DialogTitle>
        <DialogDescription>
          Assign this task to an employee and schedule it on the calendar.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="task-name" className="text-right">
            Task
          </Label>
          <div className="col-span-3 font-medium">{currentTask.name}</div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="assign-employee" className="text-right">
            Employee
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
              <SelectItem value="none">No employee</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right col-span-4 text-sm text-muted-foreground">
            Note: After assigning, you can drag and position this task on the
            calendar view.
          </Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" onClick={onSubmit}>
          Assign Task
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};