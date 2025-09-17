import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Edit, Save, Trash2 } from "lucide-react";
import {
  type Task,
  type Employee,
  type Project,
} from "@/lib/supabaseClient";

interface ExpandedDayViewProps {
  date: Date;
  employee: Employee;
  tasks: Task[];
  projects: Project[];
  onClose: () => void;
  onTaskUpdate: (task: Task) => void;
  onTaskUnassign: (taskId: string) => void;
}

const ExpandedDayView: React.FC<ExpandedDayViewProps> = ({
  date,
  employee,
  tasks,
  projects,
  onClose,
  onTaskUpdate,
  onTaskUnassign,
}) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleEditClick = (task: Task) => {
    setEditingTask({ ...task });
  };

  const handleSaveClick = () => {
    if (editingTask) {
      onTaskUpdate(editingTask);
      setEditingTask(null);
    }
  };

  const handleCancelClick = () => {
    setEditingTask(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (editingTask) {
      setEditingTask({
        ...editingTask,
        [e.target.name]: e.target.value,
      });
    }
  };

  const handleProjectChange = (projectId: string) => {
    if (editingTask) {
      setEditingTask({
        ...editingTask,
        project_id: projectId,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <Card className="w-1/2 max-w-4xl h-3/4 flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                Tasks for {employee.name} on {date.toLocaleDateString()}
              </CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <ScrollArea className="h-full p-6">
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="p-4 border rounded-lg">
                  {editingTask?.id === task.id ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Task Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={editingTask.name}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={editingTask.description || ""}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="estimated_time">Est. Hours</Label>
                          <Input
                            id="estimated_time"
                            name="estimated_time"
                            type="number"
                            value={editingTask.estimated_time}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div>
                          <Label htmlFor="project_id">Project</Label>
                          <Select
                            value={editingTask.project_id || "none"}
                            onValueChange={handleProjectChange}
                          >
                            <SelectTrigger>
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
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={handleCancelClick}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleSaveClick}>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{task.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {task.estimated_time}h -{" "}
                          {projects.find((p) => p.id === task.project_id)?.name || "No project"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(task)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onTaskUnassign(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  No tasks scheduled for this day.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ExpandedDayView;
