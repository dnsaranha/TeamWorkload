import React from 'react';
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from './ui/button';
import { CalendarIcon } from "lucide-react";
import { format } from 'date-fns';
import type { TaskWithRelations, Employee, Project } from '@/types/tasks';

interface EditTaskFormProps {
    task: TaskWithRelations;
    setTask: (task: any) => void;
    employees: Employee[];
    projects: Project[];
    isRecurring: boolean;
    source: 'list' | 'calendar';
}

const EditTaskForm = ({ task, setTask, employees, projects, isRecurring, source }: EditTaskFormProps) => {
    const handleRepeatDayChange = (day: string, checked: boolean) => {
        const currentDays = task.repeat_days || [];
        if (checked) {
            setTask({ ...task, repeat_days: [...currentDays, day] });
        } else {
            setTask({ ...task, repeat_days: currentDays.filter((d: string) => d !== day) });
        }
    };

    return (
        <div className="space-y-6">
            {/* Core Task Details */}
            <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium text-lg mb-4">Core Task Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {/* Column 1 */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-name">Task Name</Label>
                            <Input id="edit-name" value={task.name} onChange={(e) => setTask({ ...task, name: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="edit-project">Project</Label>
                            <Select onValueChange={(value) => setTask({ ...task, project_id: value === 'none' ? null : value })} value={task.project_id || "none"}>
                                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No project</SelectItem>
                                    {projects.map((project) => (<SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="edit-assigned-employee">Responsável</Label>
                            <Select onValueChange={(value) => setTask({ ...task, assigned_employee_id: value === 'none' ? null : value })} value={task.assigned_employee_id || "none"}>
                                <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Não atribuído</SelectItem>
                                    {employees.map((employee) => (<SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {/* Column 2 */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea id="edit-description" value={task.description || ""} onChange={(e) => setTask({ ...task, description: e.target.value })} className="min-h-[120px]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Scheduling Details */}
            <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium text-lg mb-4">Scheduling</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                        <Label>Total Est. Hours</Label>
                        <Input
                            type="number"
                            value={task.estimated_time || 0}
                            readOnly={isRecurring}
                            onChange={(e) => !isRecurring && setTask({ ...task, estimated_time: Number(e.target.value) })}
                            className={isRecurring ? "bg-muted" : ""}
                        />
                    </div>
                    <div></div> {/* Spacer */}
                    <div>
                        <Label htmlFor="edit-startDate">Start Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {format(new Date(task.start_date + "T00:00:00"), "PPP")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={new Date(task.start_date + "T00:00:00")} onSelect={(date) => date && setTask({ ...task, start_date: date.toISOString().split("T")[0]})} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label htmlFor="edit-endDate">End Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {format(new Date(task.end_date + "T00:00:00"), "PPP")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={new Date(task.end_date + "T00:00:00")} onSelect={(date) => date && setTask({ ...task, end_date: date.toISOString().split("T")[0] })} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {/* Recurrence Details */}
            <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium text-lg mb-2">Recurrence</h4>
                <div className="flex items-center space-x-2">
                    <input id="edit-repeats_weekly" type="checkbox" checked={task.repeats_weekly || false} disabled={source === 'calendar'} onChange={(e) => setTask({ ...task, repeats_weekly: e.target.checked, repeat_days: e.target.checked ? task.repeat_days || [] : [], hours_per_day: e.target.checked ? task.hours_per_day || 0 : 0 })} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                    <Label htmlFor="edit-repeats_weekly" className="text-sm font-medium">This task repeats weekly</Label>
                </div>

                {isRecurring && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                        <div>
                            <Label>Days of the Week</Label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                                {[
                                    { value: "monday", label: "Mon" }, { value: "tuesday", label: "Tue" },
                                    { value: "wednesday", label: "Wed" }, { value: "thursday", label: "Thu" },
                                    { value: "friday", label: "Fri" }, { value: "saturday", label: "Sat" },
                                    { value: "sunday", label: "Sun" },
                                ].map((day) => (
                                    <div key={day.value} className="flex items-center space-x-2">
                                        <input id={`edit-day-${day.value}`} type="checkbox" checked={(task.repeat_days || []).includes(day.value)} disabled={source === 'calendar'} onChange={(e) => handleRepeatDayChange(day.value, e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                                        <Label htmlFor={`edit-day-${day.value}`} className="text-sm font-normal">{day.label}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <Label>Hours per Day</Label>
                            <Input type="number" min="0" step="0.5" value={task.hours_per_day || 0} disabled={source === 'calendar'} onChange={(e) => setTask({ ...task, hours_per_day: parseFloat(e.target.value) || 0 })} placeholder="e.g., 2.5" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditTaskForm;
