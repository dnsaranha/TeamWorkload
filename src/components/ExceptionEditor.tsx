import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Employee, Exception, Task } from '@/lib/supabaseClient';
import { TaskInstance, TaskWithRelations } from '@/types/tasks';

interface ExceptionEditorProps {
  task: TaskInstance | TaskWithRelations;
  instanceDate: string;
  employees: Employee[];
  onUpdateException: (exceptionData: Partial<Exception>) => Promise<void>;
  isSaving?: boolean;
}

const ExceptionEditor = ({ task, instanceDate, employees, onUpdateException, isSaving = false }: ExceptionEditorProps) => {
  const [details, setDetails] = useState<Partial<Exception>>({});

  useEffect(() => {
    const existingException = task.exceptions?.find(ex => ex.date === instanceDate);
    setDetails({
        date: instanceDate,
        estimated_time: existingException?.estimated_time ?? task.hours_per_day,
        assigned_employee_id: existingException?.assigned_employee_id ?? task.assigned_employee_id,
        is_removed: existingException?.is_removed ?? false,
    });
  }, [instanceDate, task]);

  const handleSave = () => {
    onUpdateException(details);
  };

  return (
    <div className="p-4 border bg-muted rounded-lg space-y-4">
        <h4 className="font-semibold text-lg">Edit Occurrence for {format(new Date(instanceDate + "T00:00:00"), "PPP")}</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
                <Label>Execution Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-full justify-start text-left font-normal" disabled={isSaving}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {details.date ? format(new Date(details.date + "T00:00:00"), "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={details.date ? new Date(details.date + "T00:00:00") : undefined}
                            onSelect={(date) => date && setDetails({ ...details, date: date.toISOString().split("T")[0] })}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div>
                <Label>Estimated Hours</Label>
                <Input
                    type="number"
                    value={details.estimated_time || ''}
                    onChange={(e) => setDetails({ ...details, estimated_time: parseFloat(e.target.value) || null })}
                    disabled={isSaving}
                />
            </div>
            <div>
                <Label>Assigned To</Label>
                <Select
                    value={details.assigned_employee_id || 'none'}
                    onValueChange={(value) => setDetails({ ...details, assigned_employee_id: value === 'none' ? null : value })}
                    disabled={isSaving}
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
        <div className="flex justify-between items-center">
            <div>
                <Button variant="destructive" onClick={() => onUpdateException({ ...details, is_removed: true })} disabled={isSaving}>
                    Remove Occurrence
                </Button>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Exception'}
                </Button>
            </div>
        </div>
    </div>
  );
};

export default ExceptionEditor;
