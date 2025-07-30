import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Edit, Plus, Trash2 } from "lucide-react";

interface Task {
  id: string;
  name: string;
  description: string;
  estimatedTime: number;
  startDate: Date;
  endDate: Date;
  project: string;
  assignedEmployee: string | null;
}

const TaskManagement = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      name: "Website Redesign",
      description: "Redesign the company website homepage",
      estimatedTime: 20,
      startDate: new Date(2023, 5, 1),
      endDate: new Date(2023, 5, 10),
      project: "Marketing Refresh",
      assignedEmployee: "John Doe",
    },
    {
      id: "2",
      name: "Database Migration",
      description: "Migrate data to new cloud infrastructure",
      estimatedTime: 15,
      startDate: new Date(2023, 5, 5),
      endDate: new Date(2023, 5, 8),
      project: "Tech Infrastructure",
      assignedEmployee: "Jane Smith",
    },
    {
      id: "3",
      name: "User Testing",
      description: "Conduct user testing sessions for new features",
      estimatedTime: 8,
      startDate: new Date(2023, 5, 12),
      endDate: new Date(2023, 5, 14),
      project: "Product Development",
      assignedEmployee: null,
    },
  ]);

  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [isAssignTaskDialogOpen, setIsAssignTaskDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  // Mock data for dropdowns
  const projects = [
    "Marketing Refresh",
    "Tech Infrastructure",
    "Product Development",
    "HR Initiative",
  ];
  const employees = [
    "John Doe",
    "Jane Smith",
    "Robert Johnson",
    "Emily Davis",
    "Michael Wilson",
  ];

  const [newTask, setNewTask] = useState<Partial<Task>>({
    name: "",
    description: "",
    estimatedTime: 0,
    startDate: new Date(),
    endDate: new Date(),
    project: "",
    assignedEmployee: null,
  });

  const handleCreateTask = () => {
    const task: Task = {
      id: Date.now().toString(),
      name: newTask.name || "",
      description: newTask.description || "",
      estimatedTime: newTask.estimatedTime || 0,
      startDate: newTask.startDate || new Date(),
      endDate: newTask.endDate || new Date(),
      project: newTask.project || "",
      assignedEmployee: newTask.assignedEmployee || null,
    };

    setTasks([...tasks, task]);
    setNewTask({
      name: "",
      description: "",
      estimatedTime: 0,
      startDate: new Date(),
      endDate: new Date(),
      project: "",
      assignedEmployee: null,
    });
    setIsNewTaskDialogOpen(false);
  };

  const handleUpdateTask = () => {
    if (!currentTask) return;

    const updatedTasks = tasks.map((task) =>
      task.id === currentTask.id ? currentTask : task,
    );

    setTasks(updatedTasks);
    setIsEditTaskDialogOpen(false);
  };

  const handleAssignTask = () => {
    if (!currentTask) return;

    const updatedTasks = tasks.map((task) =>
      task.id === currentTask.id ? currentTask : task,
    );

    setTasks(updatedTasks);
    setIsAssignTaskDialogOpen(false);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const openEditDialog = (task: Task) => {
    setCurrentTask(task);
    setIsEditTaskDialogOpen(true);
  };

  const openAssignDialog = (task: Task) => {
    setCurrentTask(task);
    setIsAssignTaskDialogOpen(true);
  };

  return (
    <div className="bg-background p-6 w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Task Management</h1>
        <Dialog
          open={isNewTaskDialogOpen}
          onOpenChange={setIsNewTaskDialogOpen}
        >
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus size={16} />
              Create New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task with details and time estimates.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                  id="estimatedTime"
                  type="number"
                  value={newTask.estimatedTime}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      estimatedTime: Number(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">
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
                        {newTask.startDate ? (
                          format(newTask.startDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newTask.startDate}
                        onSelect={(date) =>
                          date && setNewTask({ ...newTask, startDate: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDate" className="text-right">
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
                        {newTask.endDate ? (
                          format(newTask.endDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newTask.endDate}
                        onSelect={(date) =>
                          date && setNewTask({ ...newTask, endDate: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project" className="text-right">
                  Project
                </Label>
                <Select
                  onValueChange={(value) =>
                    setNewTask({ ...newTask, project: value })
                  }
                  defaultValue={newTask.project || undefined}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateTask}>
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Est. Hours</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>{task.project}</TableCell>
                  <TableCell>{task.estimatedTime}h</TableCell>
                  <TableCell>
                    {format(task.startDate, "MMM d")} -{" "}
                    {format(task.endDate, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {task.assignedEmployee || (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAssignDialog(task)}
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
                        onClick={() => openEditDialog(task)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Task Dialog */}
      <Dialog
        open={isEditTaskDialogOpen}
        onOpenChange={setIsEditTaskDialogOpen}
      >
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details and time estimates.
            </DialogDescription>
          </DialogHeader>
          {currentTask && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Task Name
                </Label>
                <Input
                  id="edit-name"
                  value={currentTask.name}
                  onChange={(e) =>
                    setCurrentTask({ ...currentTask, name: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={currentTask.description}
                  onChange={(e) =>
                    setCurrentTask({
                      ...currentTask,
                      description: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-estimatedTime" className="text-right">
                  Est. Hours
                </Label>
                <Input
                  id="edit-estimatedTime"
                  type="number"
                  value={currentTask.estimatedTime}
                  onChange={(e) =>
                    setCurrentTask({
                      ...currentTask,
                      estimatedTime: Number(e.target.value),
                    })
                  }
                  className="col-span-3"
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
                        {format(currentTask.startDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={currentTask.startDate}
                        onSelect={(date) =>
                          date &&
                          setCurrentTask({ ...currentTask, startDate: date })
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
                        {format(currentTask.endDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={currentTask.endDate}
                        onSelect={(date) =>
                          date &&
                          setCurrentTask({ ...currentTask, endDate: date })
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
                    setCurrentTask({ ...currentTask, project: value })
                  }
                  defaultValue={currentTask.project}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateTask}>
              Update Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Task Dialog */}
      <Dialog
        open={isAssignTaskDialogOpen}
        onOpenChange={setIsAssignTaskDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
            <DialogDescription>
              Assign this task to an employee and schedule it on the calendar.
            </DialogDescription>
          </DialogHeader>
          {currentTask && (
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
                    setCurrentTask({ ...currentTask, assignedEmployee: value })
                  }
                  defaultValue={currentTask.assignedEmployee || undefined}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee} value={employee}>
                        {employee}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right col-span-4 text-sm text-muted-foreground">
                  Note: After assigning, you can drag and position this task on
                  the calendar view.
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" onClick={handleAssignTask}>
              Assign Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManagement;
