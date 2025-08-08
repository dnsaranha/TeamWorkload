import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Calendar,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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
import {
  projectService,
  taskService,
  employeeService,
  type Project,
  type Task,
  type Employee,
} from "@/lib/supabaseClient";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Task {
  id: string;
  name: string;
  description?: string | null;
  estimated_time: number;
  start_date: string;
  end_date: string;
  assigned_employee_id: string | null;
  project_id: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  weekly_hours: number;
  skills: any;
  created_at: string | null;
  updated_at: string | null;
}

const ProjectVisualization: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<
    "overview" | "workload" | "timeline" | "projects"
  >("projects");

  // Project CRUD states
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
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

      setProjects(projectsData);
      setTasks(tasksData as Task[]);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      const createdProject = await projectService.create(newProject);
      setProjects([createdProject, ...projects]);

      setNewProject({
        name: "",
        description: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
      });
      setIsNewProjectDialogOpen(false);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleUpdateProject = async () => {
    if (!currentProject) return;

    try {
      const updatedProject = await projectService.update(currentProject.id, {
        name: currentProject.name,
        description: currentProject.description,
        start_date: currentProject.start_date,
        end_date: currentProject.end_date,
      });

      const updatedProjects = projects.map((project) =>
        project.id === currentProject.id ? updatedProject : project,
      );

      setProjects(updatedProjects);
      setIsEditProjectDialogOpen(false);
      setCurrentProject(null);
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      await projectService.delete(id);
      setProjects(projects.filter((project) => project.id !== id));
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const openEditDialog = (project: Project) => {
    setCurrentProject(project);
    setIsEditProjectDialogOpen(true);
  };

  const getProjectStats = () => {
    const stats = projects.map((project) => {
      const projectTasks = tasks.filter(
        (task) => task.project_id === project.id,
      );
      const totalHours = projectTasks.reduce(
        (sum, task) => sum + task.estimated_time,
        0,
      );
      const completedTasks = projectTasks.filter(
        (task) => task.status === "completed",
      ).length;
      const totalTasks = projectTasks.length;
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        name: project.name,
        totalHours,
        totalTasks,
        completedTasks,
        progress,
      };
    });

    return stats;
  };

  const getWorkloadData = () => {
    const workloadData = employees.map((employee) => {
      const employeeTasks = tasks.filter(
        (task) => task.assigned_employee_id === employee.id,
      );
      const totalHours = employeeTasks.reduce(
        (sum, task) => sum + task.estimated_time,
        0,
      );
      const weeklyCapacity = employee.weekly_hours;
      const utilization =
        weeklyCapacity > 0 ? (totalHours / weeklyCapacity) * 100 : 0;

      return {
        name: employee.name,
        totalHours,
        weeklyCapacity,
        utilization,
        taskCount: employeeTasks.length,
      };
    });

    return workloadData;
  };

  const getStatusDistribution = () => {
    const statusCounts = tasks.reduce(
      (acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace("_", " ").toUpperCase(),
      value: count,
      color: getStatusColor(status),
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10B981";
      case "in_progress":
        return "#3B82F6";
      case "pending":
        return "#F59E0B";
      case "cancelled":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getTimelineData = () => {
    const monthlyData = tasks.reduce(
      (acc, task) => {
        const month = new Date(task.start_date).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        if (!acc[month]) {
          acc[month] = { month, tasks: 0, hours: 0 };
        }
        acc[month].tasks += 1;
        acc[month].hours += task.estimated_time;
        return acc;
      },
      {} as Record<string, { month: string; tasks: number; hours: number }>,
    );

    return Object.values(monthlyData).sort(
      (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime(),
    );
  };

  const projectStats = getProjectStats();
  const workloadData = getWorkloadData();
  const statusDistribution = getStatusDistribution();
  const timelineData = getTimelineData();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Project Visualization
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedView("projects")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedView === "projects"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => setSelectedView("overview")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedView === "overview"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedView("workload")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedView === "workload"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Workload
            </button>
            <button
              onClick={() => setSelectedView("timeline")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedView === "timeline"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedView === "projects" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Project Management
              </h3>
              <Dialog
                open={isNewProjectDialogOpen}
                onOpenChange={setIsNewProjectDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus size={16} />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                      Add a new project to organize your tasks.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="project-name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="project-name"
                        value={newProject.name}
                        onChange={(e) =>
                          setNewProject({ ...newProject, name: e.target.value })
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="project-description"
                        className="text-right"
                      >
                        Description
                      </Label>
                      <Textarea
                        id="project-description"
                        value={newProject.description}
                        onChange={(e) =>
                          setNewProject({
                            ...newProject,
                            description: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="project-start-date"
                        className="text-right"
                      >
                        Start Date
                      </Label>
                      <Input
                        id="project-start-date"
                        type="date"
                        value={newProject.start_date}
                        onChange={(e) =>
                          setNewProject({
                            ...newProject,
                            start_date: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="project-end-date" className="text-right">
                        End Date
                      </Label>
                      <Input
                        id="project-end-date"
                        type="date"
                        value={newProject.end_date}
                        onChange={(e) =>
                          setNewProject({
                            ...newProject,
                            end_date: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleCreateProject}>
                      Create Project
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Projects List</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Tasks</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6">
                          Loading projects...
                        </TableCell>
                      </TableRow>
                    ) : projects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6">
                          No projects found
                        </TableCell>
                      </TableRow>
                    ) : (
                      projects.map((project) => {
                        const projectTasks = tasks.filter(
                          (task) => task.project_id === project.id,
                        );
                        return (
                          <TableRow key={project.id}>
                            <TableCell className="font-medium">
                              {project.name}
                            </TableCell>
                            <TableCell>
                              {project.description || "No description"}
                            </TableCell>
                            <TableCell>
                              {project.start_date
                                ? new Date(
                                    project.start_date,
                                  ).toLocaleDateString()
                                : "Not set"}
                            </TableCell>
                            <TableCell>
                              {project.end_date
                                ? new Date(
                                    project.end_date,
                                  ).toLocaleDateString()
                                : "Not set"}
                            </TableCell>
                            <TableCell>{projectTasks.length} tasks</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(project)}
                                >
                                  <Edit size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleDeleteProject(project.id)
                                  }
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Edit Project Dialog */}
            <Dialog
              open={isEditProjectDialogOpen}
              onOpenChange={setIsEditProjectDialogOpen}
            >
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Project</DialogTitle>
                  <DialogDescription>Update project details.</DialogDescription>
                </DialogHeader>
                {currentProject && (
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-project-name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="edit-project-name"
                        value={currentProject.name}
                        onChange={(e) =>
                          setCurrentProject({
                            ...currentProject,
                            name: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="edit-project-description"
                        className="text-right"
                      >
                        Description
                      </Label>
                      <Textarea
                        id="edit-project-description"
                        value={currentProject.description || ""}
                        onChange={(e) =>
                          setCurrentProject({
                            ...currentProject,
                            description: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="edit-project-start-date"
                        className="text-right"
                      >
                        Start Date
                      </Label>
                      <Input
                        id="edit-project-start-date"
                        type="date"
                        value={currentProject.start_date || ""}
                        onChange={(e) =>
                          setCurrentProject({
                            ...currentProject,
                            start_date: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="edit-project-end-date"
                        className="text-right"
                      >
                        End Date
                      </Label>
                      <Input
                        id="edit-project-end-date"
                        type="date"
                        value={currentProject.end_date || ""}
                        onChange={(e) =>
                          setCurrentProject({
                            ...currentProject,
                            end_date: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit" onClick={handleUpdateProject}>
                    Update Project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {selectedView === "overview" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">
                      Total Projects
                    </p>
                    <p className="text-2xl font-semibold text-blue-900">
                      {projects.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">
                      Total Tasks
                    </p>
                    <p className="text-2xl font-semibold text-green-900">
                      {tasks.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">
                      Team Members
                    </p>
                    <p className="text-2xl font-semibold text-purple-900">
                      {employees.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-600">
                      Total Hours
                    </p>
                    <p className="text-2xl font-semibold text-orange-900">
                      {tasks.reduce(
                        (sum, task) => sum + task.estimated_time,
                        0,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Hours Chart */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Project Hours Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalHours" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Task Status Distribution */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Task Status Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {selectedView === "workload" && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">
              Employee Workload Analysis
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={workloadData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="utilization"
                    fill="#10B981"
                    name="Utilization %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Workload Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tasks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weekly Capacity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilization
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workloadData.map((employee, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {employee.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.taskCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.totalHours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.weeklyCapacity}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            employee.utilization > 100
                              ? "bg-red-100 text-red-800"
                              : employee.utilization >= 50
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {employee.utilization.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedView === "timeline" && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">
              Project Timeline
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar
                    yAxisId="left"
                    dataKey="tasks"
                    fill="#3B82F6"
                    name="Tasks"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="hours"
                    stroke="#10B981"
                    name="Hours"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectVisualization;
