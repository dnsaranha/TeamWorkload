import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { TaskWithRelations, Employee, Exception } from '@/types/tasks';
import { taskService } from '@/lib/supabaseClient';

interface ExceptionEditorProps {
  task: TaskWithRelations;
  setTask: (task: any) => void; // A bit generic, but needed to update the parent state
  instanceDate: string;
  employees: Employee[];
}

const ExceptionEditor = ({ task, setTask, instanceDate, employees }: ExceptionEditorProps) => {
  const [exceptionDetails, setExceptionDetails] = useState({
    date: instanceDate,
    estimated_time: task.hours_per_day,
    assigned_employee_id: task.assigned_employee_id,
  });

  useEffect(() => {
    const existingException = task.exceptions?.find(ex => ex.date === instanceDate);
    if (existingException) {
      setExceptionDetails({
        date: existingException.date,
        estimated_time: existingException.estimated_time ?? task.hours_per_day,
        assigned_employee_id: existingException.assigned_employee_id ?? task.assigned_employee_id,
      });
    } else {
        setExceptionDetails({
            date: instanceDate,
            estimated_time: task.hours_per_day,
            assigned_employee_id: task.assigned_employee_id,
        });
    }
  }, [instanceDate, task]);

  const handleSaveException = async () => {
    const currentExceptions = task.exceptions || [];
    const existingIndex = currentExceptions.findIndex(ex => ex.date === instanceDate);

    let newExceptions: Exception[];

    const newExceptionData = {
        date: exceptionDetails.date,
        estimated_time: exceptionDetails.estimated_time,
        assigned_employee_id: exceptionDetails.assigned_employee_id,
        is_removed: false,
    };

    if (existingIndex > -1) {
      newExceptions = [...currentExceptions];
      newExceptions[existingIndex] = { ...newExceptions[existingIndex], ...newExceptionData };
    } else {
      newExceptions = [...currentExceptions, newExceptionData];
    }

    try {
        const updatedTask = await taskService.update(task.id, { exceptions: newExceptions });
        // Optimistically update the parent task state
        setTask(updatedTask);
        alert('Exception saved!');
    } catch (error) {
        console.error("Failed to save exception:", error);
        alert('Error saving exception.');
    }
  };

  return (
    <div className="p-4 border bg-muted rounded-lg space-y-4">
        <h4 className="font-semibold text-lg">Edit Occurrence</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
                <Label>Execution Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(new Date(exceptionDetails.date + "T00:00:00"), "PPP")}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={new Date(exceptionDetails.date + "T00:00:00")}
                            onSelect={(date) => date && setExceptionDetails({ ...exceptionDetails, date: date.toISOString().split("T")[0] })}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div>
                <Label>Estimated Hours</Label>
                <Input
                    type="number"
                    value={exceptionDetails.estimated_time || ''}
                    onChange={(e) => setExceptionDetails({ ...exceptionDetails, estimated_time: parseFloat(e.target.value) || null })}
                />
            </div>
            <div>
                <Label>Assigned To</Label>
                <Select
                    value={exceptionDetails.assigned_employee_id || 'none'}
                    onValueChange={(value) => setExceptionDetails({ ...exceptionDetails, assigned_employee_id: value === 'none' ? null : value })}
                >
                    <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        <div className="flex justify-end">
            <Button onClick={handleSaveException}>Save Exception</Button>
        </div>
    </div>
  );
};

export default ExceptionEditor;
