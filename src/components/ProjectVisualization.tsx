import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Save,
  X,
  Trash2,
  FolderOpen,
} from "lucide-react";
import {
  projectService,
  taskService,
  employeeService,
  type Project,
  type Task,
  type Employee,
} from "@/lib/supabaseClient";
import { format } from "date-fns";

type ProjectWithStats = Project & {
  totalTasks: number;
  completedTasks: number;
  assignedEmployees: Employee[];
  progress: number;
  status: "active" | "completed" | "upcoming" | "overdue";
  totalHours: number;
  remainingHours: number;
};

type TaskWithRelations = Task & {
  project: Project | null;
  assigned_employee: Employee | null;
};

const ProjectVisualization = () => {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] =
    useState<ProjectWithStats | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, tasksData, employeesData] = await Promise.all([
        projectService.getAll(),
        taskService.getAll(),
        employeeService.getAll(),
      ]);

      setTasks(tasksData as TaskWithRelations[]);
      setEmployees(employeesData);

      // Calculate project statistics
      const projectsWithStats: ProjectWithStats[] = projectsData.map(
        (project) => {
          const projectTasks = (tasksData as TaskWithRelations[]).filter(
            (task) => task.project_id === project.id,
          );

          const totalTasks = projectTasks.length;
          const completedTasks = projectTasks.filter(
            (task) => new Date(task.end_date) < new Date(),
          ).length;

          const assignedEmployeeIds = [
            ...new Set(
              projectTasks
                .filter((task) => task.assigned_employee_id)
                .map((task) => task.assigned_employee_id),
            ),
          ];

          const assignedEmployees = employeesData.filter((emp) =>
            assignedEmployeeIds.includes(emp.id),
          );

          const progress =
            totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0;

          const totalHours = projectTasks.reduce(
            (sum, task) => sum + task.estimated_time,
            0,
          );
          const completedHours = projectTasks
            .filter((task) => new Date(task.end_date) < new Date())
            .reduce((sum, task) => sum + task.estimated_time, 0);
          const remainingHours = totalHours - completedHours;

          // Determine project status
          let status: "active" | "completed" | "upcoming" | "overdue" =
            "active";
          const currentDate = new Date();
          const startDate = project.start_date
            ? new Date(project.start_date)
            : null;
          const endDate = project.end_date ? new Date(project.end_date) : null;

          if (progress === 100) {
            status = "completed";
          } else if (startDate && startDate > currentDate) {
            status = "upcoming";
          } else if (endDate && endDate < currentDate && progress < 100) {
            status = "overdue";
          }

          return {
            ...project,
            totalTasks,
            completedTasks,
            assignedEmployees,
            progress,
            status,
            totalHours,
            remainingHours,
          };
        },
      );

      setProjects(projectsWithStats);
    } catch (error) {
      console.error("Error loading project data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "overdue":
        return "bg-red-500";
      case "upcoming":
        return "bg-blue-500";
      default:
        return "bg-yellow-500";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "overdue":
        return "destructive";
      case "upcoming":
        return "secondary";
      default:
        return "default";
    }
  };

  const startEditProject = (project: ProjectWithStats) => {
    setEditingProject(project.id);
    setEditForm({
      name: project.name,
      description: project.description || "",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
    });
  };

  const cancelEditProject = () => {
    setEditingProject(null);
    setEditForm({ name: "", description: "", start_date: "", end_date: "" });
  };

  const saveProjectChanges = async (projectId: string) => {
    try {
      const updatedProject = await projectService.update(projectId, {
        name: editForm.name,
        description: editForm.description,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
      });

      // Update the projects list
      const updatedProjects = projects.map((p) =>
        p.id === projectId ? { ...p, ...updatedProject } : p,
      );
      setProjects(updatedProjects);
      setEditingProject(null);
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Failed to update project. Please try again.");
    }
  };

  const handleDeleteProject = async (
    projectId: string,
    projectName: string,
  ) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir o projeto "${projectName}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    try {
      await projectService.delete(projectId);

      // Remove project from the list
      const updatedProjects = projects.filter((p) => p.id !== projectId);
      setProjects(updatedProjects);

      alert("Projeto excluído com sucesso!");
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Erro ao excluir projeto. Tente novamente.");
    }
  };

  const ProjectCard = ({ project }: { project: ProjectWithStats }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-background">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editingProject === project.id ? (
              <div className="space-y-2">
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="font-semibold"
                  placeholder="Project name"
                />
                <Input
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  placeholder="Project description"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={editForm.start_date}
                    onChange={(e) =>
                      setEditForm({ ...editForm, start_date: e.target.value })
                    }
                    placeholder="Start date"
                  />
                  <Input
                    type="date"
                    value={editForm.end_date}
                    onChange={(e) =>
                      setEditForm({ ...editForm, end_date: e.target.value })
                    }
                    placeholder="End date"
                  />
                </div>
              </div>
            ) : (
              <>
                <CardTitle className="text-lg font-semibold mb-2">
                  {project.name}
                </CardTitle>
                <Badge
                  variant={getStatusBadge(project.status)}
                  className="mb-2"
                >
                  {project.status.charAt(0).toUpperCase() +
                    project.status.slice(1)}
                </Badge>
              </>
            )}
          </div>
          <div className="flex gap-1">
            {editingProject === project.id ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => saveProjectChanges(project.id)}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={cancelEditProject}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditProject(project)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteProject(project.id, project.name)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>{project.name}</DialogTitle>
                      <DialogDescription>
                        {project.description || "No description available"}
                      </DialogDescription>
                    </DialogHeader>
                    <ProjectDetails project={project} />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>
                {project.completedTasks}/{project.totalTasks} Tasks
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>{project.totalHours}h Total</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <div className="flex -space-x-2">
              {project.assignedEmployees.slice(0, 3).map((employee) => (
                <Avatar
                  key={employee.id}
                  className="w-6 h-6 border-2 border-background"
                >
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.name}`}
                  />
                  <AvatarFallback className="text-xs">
                    {employee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.assignedEmployees.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-background flex items-center justify-center text-xs">
                  +{project.assignedEmployees.length - 3}
                </div>
              )}
            </div>
          </div>

          {project.start_date && project.end_date && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(project.start_date), "MMM d")} -{" "}
                {format(new Date(project.end_date), "MMM d, yyyy")}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const ProjectDetails = ({ project }: { project: ProjectWithStats }) => {
    const projectTasks = tasks.filter((task) => task.project_id === project.id);

    return (
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{project.totalTasks}</div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {project.completedTasks}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{project.totalHours}h</div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {project.assignedEmployees.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Team Members
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h4 className="font-medium mb-2">Progress</h4>
            <Progress value={project.progress} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground mt-1">
              <span>{project.progress}% Complete</span>
              <span>{project.remainingHours}h Remaining</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>
                    {task.assigned_employee?.name || "Unassigned"}
                  </TableCell>
                  <TableCell>{task.estimated_time}h</TableCell>
                  <TableCell>
                    {format(new Date(task.start_date), "MMM d")} -{" "}
                    {format(new Date(task.end_date), "MMM d")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        new Date(task.end_date) < new Date()
                          ? "default"
                          : "secondary"
                      }
                    >
                      {new Date(task.end_date) < new Date()
                        ? "Completed"
                        : "Active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="team">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.assignedEmployees.map((employee) => {
              const employeeTasks = projectTasks.filter(
                (task) => task.assigned_employee_id === employee.id,
              );
              const employeeHours = employeeTasks.reduce(
                (sum, task) => sum + task.estimated_time,
                0,
              );

              return (
                <Card key={employee.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.name}`}
                        />
                        <AvatarFallback>
                          {employee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium">{employee.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {employee.role}
                        </p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span>{employeeTasks.length} tasks</span>
                          <span>{employeeHours}h assigned</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-background">
        <div className="text-center">
          <div className="text-lg font-medium">Loading projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Project Overview</h3>
          <p className="text-sm text-muted-foreground">
            {projects.length} projects •{" "}
            {projects.filter((p) => p.status === "active").length} active
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            List
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No projects found</p>
              <p className="text-sm">
                Create your first project to get started
              </p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        {project.description || "No description"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadge(project.status)}>
                      {project.status.charAt(0).toUpperCase() +
                        project.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="w-20">
                      <Progress value={project.progress} className="h-2" />
                      <div className="text-xs text-center mt-1">
                        {project.progress}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {project.completedTasks}/{project.totalTasks}
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-1">
                      {project.assignedEmployees.slice(0, 3).map((employee) => (
                        <Avatar
                          key={employee.id}
                          className="w-6 h-6 border border-background"
                        >
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.name}`}
                          />
                          <AvatarFallback className="text-xs">
                            {employee.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {project.assignedEmployees.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-200 border border-background flex items-center justify-center text-xs">
                          +{project.assignedEmployees.length - 3}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{project.totalHours}h</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditProject(project)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDeleteProject(project.id, project.name)
                        }
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>{project.name}</DialogTitle>
                            <DialogDescription>
                              {project.description ||
                                "No description available"}
                            </DialogDescription>
                          </DialogHeader>
                          <ProjectDetails project={project} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default ProjectVisualization;
