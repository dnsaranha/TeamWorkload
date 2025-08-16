import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Download,
  Upload,
  Calendar,
  Clock,
  User,
  Repeat,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  taskService,
  employeeService,
  projectService,
  type Task,
  type Employee,
  type Project,
} from "@/lib/supabaseClient";

type TaskWithRelations = Task & {
  project: Project | null;
  assigned_employee: Employee | null;
};

const TaskManagement = () => {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskWithRelations | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    estimated_time: 8,
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    project_id: "",
    assigned_employee_id: "",
    status: "pending" as "pending" | "in_progress" | "completed",
    repeats_weekly: false,
    repeat_days: [] as string[],
    hours_per_day: 8,
    category: "",
    special_marker: "none",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, employeesData, projectsData] = await Promise.all([
        taskService.getAll(),
        employeeService.getAll(),
        projectService.getAll(),
      ]);

      setTasks(tasksData as TaskWithRelations[]);
      setEmployees(employeesData);
      setProjects(projectsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : 
               name === "estimated_time" || name === "hours_per_day" ? 
               parseInt(value) || 0 : value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleRepeatDaysChange = (day: string, checked: boolean) => {
    const updatedDays = checked
      ? [...formData.repeat_days, day]
      : formData.repeat_days.filter((d) => d !== day);

    setFormData({
      ...formData,
      repeat_days: updatedDays,
    });
  };

  const handleAddTask = async () => {
    try {
      if (!formData.name.trim()) {
        alert("Task name is required");
        return;
      }

      const newTask = await taskService.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        estimated_time: formData.estimated_time,
        start_date: formData.start_date,
        end_date: formData.end_date,
        project_id: formData.project_id || null,
        assigned_employee_id: formData.assigned_employee_id || null,
        status: formData.status,
        repeats_weekly: formData.repeats_weekly,
        repeat_days: formData.repeats_weekly ? formData.repeat_days : null,
        hours_per_day: formData.repeats_weekly ? formData.hours_per_day : null,
      });

      setTasks([newTask as TaskWithRelations, ...tasks]);
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Failed to add task. Please try again.");
    }
  };

  const handleEditTask = async () => {
    if (!currentTask) return;

    try {
      if (!formData.name.trim()) {
        alert("Task name is required");
        return;
      }

      const updatedTask = await taskService.update(currentTask.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        estimated_time: formData.estimated_time,
        start_date: formData.start_date,
        end_date: formData.end_date,
        project_id: formData.project_id || null,
        assigned_employee_id: formData.assigned_employee_id || null,
        status: formData.status,
        repeats_weekly: formData.repeats_weekly,
        repeat_days: formData.repeats_weekly ? formData.repeat_days : null,
        hours_per_day: formData.repeats_weekly ? formData.hours_per_day : null,
      });

      const updatedTasks = tasks.map((task) =>
        task.id === currentTask.id ? (updatedTask as TaskWithRelations) : task,
      );

      setTasks(updatedTasks);
      resetForm();
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task. Please try again.");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await taskService.delete(id);
      setTasks(tasks.filter((task) => task.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const openEditDialog = (task: TaskWithRelations) => {
    setCurrentTask(task);
    setFormData({
      name: task.name,
      description: task.description || "",
      estimated_time: task.estimated_time,
      start_date: task.start_date,
      end_date: task.end_date,
      project_id: task.project_id || "",
      assigned_employee_id: task.assigned_employee_id || "",
      status: task.status,
      repeats_weekly: task.repeats_weekly || false,
      repeat_days: task.repeat_days || [],
      hours_per_day: task.hours_per_day || 8,
      category: task.category || "",
      special_marker: task.special_marker || "none",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      estimated_time: 8,
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date().toISOString().split("T")[0],
      project_id: "",
      assigned_employee_id: "",
      status: "pending",
      repeats_weekly: false,
      repeat_days: [],
      hours_per_day: 8,
      category: "",
      special_marker: "none",
    });
    setCurrentTask(null);
  };

  const filteredTasks = tasks.filter(
    (task) =>
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assigned_employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const exportToExcel = () => {
    const exportData = filteredTasks.map((task) => ({
      Name: task.name,
      Description: task.description || "",
      "Estimated Time": task.estimated_time,
      "Start Date": task.start_date,
      "End Date": task.end_date,
      Project: task.project?.name || "",
      "Assigned Employee": task.assigned_employee?.name || "",
      Status: task.status,
      "Repeats Weekly": task.repeats_weekly ? "Yes" : "No",
      "Repeat Days": task.repeat_days?.join(", ") || "",
      "Hours Per Day": task.hours_per_day || "",
      Category: task.category || "",
      "Special Marker": task.special_marker || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(
      wb,
      `tasks_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        jsonData.forEach(async (row: any) => {
          if (row["Name"]) {
            try {
              const taskData = {
                name: row["Name"],
                description: row["Description"] || "",
                estimated_time: Number(row["Estimated Time"]) || 8,
                start_date: row["Start Date"] || new Date().toISOString().split("T")[0],
                end_date: row["End Date"] || new Date().toISOString().split("T")[0],
                project_id: null,
                assigned_employee_id: null,
                status: (row["Status"] as "pending" | "in_progress" | "completed") || "pending",
                repeats_weekly: row["Repeats Weekly"]?.toLowerCase() === "yes",
                repeat_days: row["Repeat Days"] ? row["Repeat Days"].split(", ") : null,
                hours_per_day: Number(row["Hours Per Day"]) || null,
              };

              const newTask = await taskService.create(taskData);
              setTasks((prev) => [newTask as TaskWithRelations, ...prev]);
            } catch (error) {
              console.error("Error importing task:", error);
            }
          }
        });

        alert("Import completed! Please refresh to see the new tasks.");
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Error reading file. Please make sure it's a valid Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const WEEKDAYS = [
    { id: "monday", label: "Mon" },
    { id: "tuesday", label: "Tue" },
    { id: "wednesday", label: "Wed" },
    { id: "thursday", label: "Thu" },
    { id: "friday", label: "Fri" },
    { id: "saturday", label: "Sat" },
    { id: "sunday", label: "Sun" },
  ];

  return (
    <div className="bg-background p-6 w-full">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Task Management</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-8 w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="task-file-import"
              />
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() =>
                  document.getElementById("task-file-import")?.click()
                }
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-1">
                  <PlusCircle className="h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Add New Task</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new task.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96">
                  <div className="grid gap-4 py-4 px-1">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="estimated_time" className="text-right">
                        Estimated Time (hours)
                      </Label>
                      <Input
                        id="estimated_time"
                        name="estimated_time"
                        type="number"
                        value={formData.estimated_time}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="start_date" className="text-right">
                        Start Date
                      </Label>
                      <Input
                        id="start_date"
                        name="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="end_date" className="text-right">
                        End Date
                      </Label>
                      <Input
                        id="end_date"
                        name="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="project_id" className="text-right">
                        Project
                      </Label>
                      <Select
                        name="project_id"
                        onValueChange={(value) =>
                          handleSelectChange("project_id", value)
                        }
                        value={formData.project_id}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No Project</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="assigned_employee_id" className="text-right">
                        Assigned Employee
                      </Label>
                      <Select
                        name="assigned_employee_id"
                        onValueChange={(value) =>
                          handleSelectChange("assigned_employee_id", value)
                        }
                        value={formData.assigned_employee_id}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
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
                        name="status"
                        onValueChange={(value) =>
                          handleSelectChange("status", value)
                        }
                        value={formData.status}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="category" className="text-right">
                        Category
                      </Label>
                      <Input
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="special_marker" className="text-right">
                        Special Marker
                      </Label>
                      <Select
                        name="special_marker"
                        onValueChange={(value) =>
                          handleSelectChange("special_marker", value)
                        }
                        value={formData.special_marker}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a marker" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="major_release">Major Release</SelectItem>
                          <SelectItem value="major_deployment">Major Deployment</SelectItem>
                          <SelectItem value="major_theme">Major Theme</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Recurring Task Options */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="repeats_weekly" className="text-right">
                        Repeats Weekly
                      </Label>
                      <div className="col-span-3 flex items-center space-x-2">
                        <Checkbox
                          id="repeats_weekly"
                          checked={formData.repeats_weekly}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              repeats_weekly: !!checked,
                            })
                          }
                        />
                        <Label htmlFor="repeats_weekly" className="text-sm">
                          This task repeats every week
                        </Label>
                      </div>
                    </div>

                    {formData.repeats_weekly && (
                      <>
                        <div className="grid grid-cols-4 items-start gap-4">
                          <Label className="text-right mt-2">Repeat Days</Label>
                          <div className="col-span-3 grid grid-cols-4 gap-2">
                            {WEEKDAYS.map((day) => (
                              <div key={day.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={day.id}
                                  checked={formData.repeat_days.includes(day.id)}
                                  onCheckedChange={(checked) =>
                                    handleRepeatDaysChange(day.id, !!checked)
                                  }
                                />
                                <Label htmlFor={day.id} className="text-sm">
                                  {day.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="hours_per_day" className="text-right">
                            Hours Per Day
                          </Label>
                          <Input
                            id="hours_per_day"
                            name="hours_per_day"
                            type="number"
                            value={formData.hours_per_day}
                            onChange={handleInputChange}
                            className="col-span-3"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddTask}>Add Task</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-6 text-muted-foreground"
                  >
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{task.name}</div>
                        {task.special_marker && task.special_marker !== "none" && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {task.special_marker.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{task.project?.name || "No Project"}</TableCell>
                    <TableCell>
                      {task.assigned_employee?.name || "Unassigned"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(task.status)}>
                        {task.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{task.start_date}</TableCell>
                    <TableCell>{task.end_date}</TableCell>
                    <TableCell>{task.estimated_time}h</TableCell>
                    <TableCell>
                      {task.repeats_weekly ? (
                        <div className="flex items-center gap-1">
                          <Repeat className="h-3 w-3" />
                          <span className="text-xs">
                            {task.repeat_days?.join(", ") || "Weekly"}
                          </span>
                        </div>
                      ) : (
                        "No"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(task)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Task</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {task.name}? This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTask(task.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No tasks found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task's information.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96">
            <div className="grid gap-4 py-4 px-1">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-estimated_time" className="text-right">
                  Estimated Time (hours)
                </Label>
                <Input
                  id="edit-estimated_time"
                  name="estimated_time"
                  type="number"
                  value={formData.estimated_time}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-start_date" className="text-right">
                  Start Date
                </Label>
                <Input
                  id="edit-start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-end_date" className="text-right">
                  End Date
                </Label>
                <Input
                  id="edit-end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-project_id" className="text-right">
                  Project
                </Label>
                <Select
                  name="project_id"
                  onValueChange={(value) =>
                    handleSelectChange("project_id", value)
                  }
                  value={formData.project_id}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-assigned_employee_id" className="text-right">
                  Assigned Employee
                </Label>
                <Select
                  name="assigned_employee_id"
                  onValueChange={(value) =>
                    handleSelectChange("assigned_employee_id", value)
                  }
                  value={formData.assigned_employee_id}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
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
                  name="status"
                  onValueChange={(value) =>
                    handleSelectChange("status", value)
                  }
                  value={formData.status}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category" className="text-right">
                  Category
                </Label>
                <Input
                  id="edit-category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-special_marker" className="text-right">
                  Special Marker
                </Label>
                <Select
                  name="special_marker"
                  onValueChange={(value) =>
                    handleSelectChange("special_marker", value)
                  }
                  value={formData.special_marker}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a marker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="major_release">Major Release</SelectItem>
                    <SelectItem value="major_deployment">Major Deployment</SelectItem>
                    <SelectItem value="major_theme">Major Theme</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recurring Task Options */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-repeats_weekly" className="text-right">
                  Repeats Weekly
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Checkbox
                    id="edit-repeats_weekly"
                    checked={formData.repeats_weekly}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        repeats_weekly: !!checked,
                      })
                    }
                  />
                  <Label htmlFor="edit-repeats_weekly" className="text-sm">
                    This task repeats every week
                  </Label>
                </div>
              </div>

              {formData.repeats_weekly && (
                <>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right mt-2">Repeat Days</Label>
                    <div className="col-span-3 grid grid-cols-4 gap-2">
                      {WEEKDAYS.map((day) => (
                        <div key={day.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${day.id}`}
                            checked={formData.repeat_days.includes(day.id)}
                            onCheckedChange={(checked) =>
                              handleRepeatDaysChange(day.id, !!checked)
                            }
                          />
                          <Label htmlFor={`edit-${day.id}`} className="text-sm">
                            {day.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-hours_per_day" className="text-right">
                      Hours Per Day
                    </Label>
                    <Input
                      id="edit-hours_per_day"
                      name="hours_per_day"
                      type="number"
                      value={formData.hours_per_day}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditTask}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManagement;