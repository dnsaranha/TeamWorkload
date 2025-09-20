import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  ListTodo,
  BarChart3,
  Home,
  Menu,
  X,
  FolderOpen,
  Target,
  CalendarIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format } from "date-fns";
import WorkloadCalendar from "./WorkloadCalendar";
import EmployeeList from "./EmployeeList";
import TaskManagement from "./TaskManagement";
import WorkloadSummary from "./WorkloadSummary";
import ProjectVisualization from "./ProjectVisualization";
import ProjectList from "./ProjectList";
import UserProfile from "./UserProfile";
import Roadmap from "./Roadmap";
import {
  employeeService,
  taskService,
  projectService,
  type Task,
  type Project,
  type Employee,
} from "@/lib/supabaseClient";

const HomePage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeTasks, setActiveTasks] = useState(0);
  const [avgWorkload, setAvgWorkload] = useState(0);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [dataVersion, setDataVersion] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTask(null);
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      await taskService.update(editingTask.id, editingTask);
      setDataVersion((v) => v + 1); // Trigger data refresh
      handleCloseEditModal();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleCurrentTaskRepeatDayChange = (day: string, checked: boolean) => {
    if (!editingTask) return;
    const currentDays = editingTask.repeat_days || [];
    if (checked) {
      setEditingTask({
        ...editingTask,
        repeat_days: [...currentDays, day],
      });
    } else {
      setEditingTask({
        ...editingTask,
        repeat_days: currentDays.filter((d) => d !== day),
      });
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Check for mobile screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Auto-refresh dashboard data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);

    return () => {
      window.removeEventListener("resize", checkMobile);
      clearInterval(interval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [employeesData, tasks, projectsData] = await Promise.all([
        employeeService.getAll(),
        taskService.getAll(),
        projectService.getAll(),
      ]);

      setEmployees(employeesData);
      setProjects(projectsData);
      setTotalEmployees(employeesData.length);
      setTotalProjects(projectsData.length);

      // Count active tasks (tasks that are assigned and within current date range)
      const currentDate = new Date();
      const activeTasksCount = tasks.filter((task) => {
        const startDate = new Date(task.start_date);
        const endDate = new Date(task.end_date);
        return (
          task.assigned_employee_id &&
          startDate <= currentDate &&
          endDate >= currentDate
        );
      }).length;
      setActiveTasks(activeTasksCount);

      // Calculate average workload
      if (employeesData.length > 0) {
        const totalCapacity = employeesData.reduce(
          (sum, emp) => sum + emp.weekly_hours,
          0,
        );
        const totalAssignedHours = tasks
          .filter((task) => task.assigned_employee_id)
          .reduce((sum, task) => sum + task.estimated_time, 0);

        const avgWorkloadPercent =
          totalCapacity > 0
            ? Math.round((totalAssignedHours / totalCapacity) * 100)
            : 0;
        setAvgWorkload(avgWorkloadPercent);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`${isMobile ? "fixed bottom-0 left-0 right-0 z-50 h-16 flex-row border-t" : sidebarCollapsed ? "w-16" : "w-64"} ${isMobile ? "" : "border-r"} bg-card ${isMobile ? "p-2" : "p-4"} flex ${isMobile ? "flex-row justify-around items-center" : "flex-col"} transition-all duration-300`}
      >
        {!isMobile && (
          <div className="mb-8">
            {!sidebarCollapsed && (
              <>
                <h1 className="text-2xl font-bold text-primary">
                  Workload Manager
                </h1>
                <p className="text-sm text-muted-foreground">
                  Team capacity planning
                </p>
              </>
            )}
            {sidebarCollapsed && (
              <div className="text-center">
                <h1 className="text-lg font-bold text-primary">WM</h1>
              </div>
            )}
          </div>
        )}

        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`mb-4 ${sidebarCollapsed ? "w-8 h-8 p-0" : "w-full justify-start"}`}
          >
            {sidebarCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <>
                <Menu className="mr-2 h-4 w-4" />
                Toggle
              </>
            )}
          </Button>
        )}

        <nav
          className={`${isMobile ? "flex flex-row justify-around w-full" : "space-y-2 flex-1"}`}
        >
          <Button
            variant={activeTab === "dashboard" ? "default" : "ghost"}
            className={`${isMobile ? "flex-col p-2 h-12" : sidebarCollapsed ? "w-8 h-8 p-0" : "w-full justify-start"}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <Home
              className={`${isMobile ? "mb-1" : sidebarCollapsed ? "" : "mr-2"} h-4 w-4`}
            />
            {!sidebarCollapsed && !isMobile && "Dashboard"}
            {isMobile && <span className="text-xs">Home</span>}
          </Button>
          <Button
            variant={activeTab === "employees" ? "default" : "ghost"}
            className={`${isMobile ? "flex-col p-2 h-12" : sidebarCollapsed ? "w-8 h-8 p-0" : "w-full justify-start"}`}
            onClick={() => setActiveTab("employees")}
          >
            <Users
              className={`${isMobile ? "mb-1" : sidebarCollapsed ? "" : "mr-2"} h-4 w-4`}
            />
            {!sidebarCollapsed && !isMobile && "Employees"}
            {isMobile && <span className="text-xs">Team</span>}
          </Button>
          <Button
            variant={activeTab === "tasks" ? "default" : "ghost"}
            className={`${isMobile ? "flex-col p-2 h-12" : sidebarCollapsed ? "w-8 h-8 p-0" : "w-full justify-start"}`}
            onClick={() => setActiveTab("tasks")}
          >
            <ListTodo
              className={`${isMobile ? "mb-1" : sidebarCollapsed ? "" : "mr-2"} h-4 w-4`}
            />
            {!sidebarCollapsed && !isMobile && "Tasks"}
            {isMobile && <span className="text-xs">Tasks</span>}
          </Button>
          <Button
            variant={activeTab === "projects" ? "default" : "ghost"}
            className={`${isMobile ? "flex-col p-2 h-12" : sidebarCollapsed ? "w-8 h-8 p-0" : "w-full justify-start"}`}
            onClick={() => setActiveTab("projects")}
          >
            <FolderOpen
              className={`${isMobile ? "mb-1" : sidebarCollapsed ? "" : "mr-2"} h-4 w-4`}
            />
            {!sidebarCollapsed && !isMobile && "Projects"}
            {isMobile && <span className="text-xs">Projects</span>}
          </Button>
          <Button
            variant={activeTab === "roadmap" ? "default" : "ghost"}
            className={`${isMobile ? "flex-col p-2 h-12" : sidebarCollapsed ? "w-8 h-8 p-0" : "w-full justify-start"}`}
            onClick={() => setActiveTab("roadmap")}
          >
            <Target
              className={`${isMobile ? "mb-1" : sidebarCollapsed ? "" : "mr-2"} h-4 w-4`}
            />
            {!sidebarCollapsed && !isMobile && "Roadmap"}
            {isMobile && <span className="text-xs">Roadmap</span>}
          </Button>
          <Button
            variant={activeTab === "reports" ? "default" : "ghost"}
            className={`${isMobile ? "flex-col p-2 h-12" : sidebarCollapsed ? "w-8 h-8 p-0" : "w-full justify-start"}`}
            onClick={() => setActiveTab("reports")}
          >
            <BarChart3
              className={`${isMobile ? "mb-1" : sidebarCollapsed ? "" : "mr-2"} h-4 w-4`}
            />
            {!sidebarCollapsed && !isMobile && "Reports"}
            {isMobile && <span className="text-xs">Reports</span>}
          </Button>
        </nav>

        {!isMobile && (
          <div className="pt-4 border-t">
            <Button
              variant={activeTab === "profile" ? "default" : "ghost"}
              className={`${sidebarCollapsed ? "w-8 h-8 p-0" : "w-full justify-start"} hover:bg-accent`}
              onClick={() => setActiveTab("profile")}
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                U
              </div>
              {!sidebarCollapsed && (
                <div className="ml-2 text-left">
                  <p className="text-sm font-medium">User Name</p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-auto p-6 ${isMobile ? "pb-20" : ""}`}>
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Dashboard</h2>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Calendar className="mr-2 h-4 w-4" />
                    Weekly View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Calendar className="mr-2 h-4 w-4" />
                    Monthly View
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Employees
                      </p>
                      <p className="text-2xl font-bold">
                        {loading ? "..." : totalEmployees}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                      <ListTodo className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Active Tasks
                      </p>
                      <p className="text-2xl font-bold">
                        {loading ? "..." : activeTasks}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                      <FolderOpen className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Projects
                      </p>
                      <p className="text-2xl font-bold">
                        {loading ? "..." : totalProjects}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mr-4">
                      <BarChart3 className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Avg. Workload
                      </p>
                      <p className="text-2xl font-bold">
                        {loading ? "..." : `${avgWorkload}%`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-6 h-[calc(100vh-280px)]">
                <div className="flex-1">
                  <WorkloadCalendar
                    selectedEmployeeId={selectedEmployeeId}
                    dataVersion={dataVersion}
                    onTaskAssigned={() => setDataVersion((v) => v + 1)}
                    onTaskClick={handleEditTask}
                  />
                </div>
                <div className="w-80">
                  <WorkloadSummary
                    selectedEmployeeId={selectedEmployeeId}
                    onEmployeeSelect={setSelectedEmployeeId}
                    dataVersion={dataVersion}
                    onTaskClick={handleEditTask}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "employees" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Employee Management</h2>
              <EmployeeList />
            </div>
          )}

          {activeTab === "tasks" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Task Management</h2>
              <TaskManagement />
            </div>
          )}

          {activeTab === "projects" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Projects</h2>
              <Tabs defaultValue="projects" className="w-full">
                <TabsList>
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="workload">Workload</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>
                <TabsContent value="projects">
                  <ProjectList />
                </TabsContent>
                <TabsContent value="overview">
                  <ProjectVisualization activeView="overview" />
                </TabsContent>
                <TabsContent value="workload">
                  <ProjectVisualization activeView="workload" />
                </TabsContent>
                <TabsContent value="timeline">
                  <ProjectVisualization activeView="timeline" />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeTab === "roadmap" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Strategic Roadmap</h2>
              <Roadmap />
            </div>
          )}

          {activeTab === "reports" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Reports</h2>
              <WorkloadSummary showCharts={true} />
            </div>
          )}

          {activeTab === "profile" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">User Profile</h2>
              <UserProfile
                isOpen={true}
                onClose={() => setActiveTab("dashboard")}
              />
            </div>
          )}
        </div>
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details and time estimates.
            </DialogDescription>
          </DialogHeader>
          {editingTask && (
            <ScrollArea className="h-96">
              <div className="grid gap-4 p-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Task Name
                  </Label>
                  <Input
                    id="edit-name"
                    value={editingTask.name}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, name: e.target.value })
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
                    value={editingTask.description || ""}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
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
                    id="edit-estimated_time"
                    type="number"
                    value={editingTask.estimated_time}
                    readOnly={editingTask.repeats_weekly}
                    onChange={(e) =>
                      !editingTask.repeats_weekly &&
                      setEditingTask({
                        ...editingTask,
                        estimated_time: Number(e.target.value),
                      })
                    }
                    className={`col-span-3 ${
                      editingTask.repeats_weekly
                        ? "bg-gray-100 cursor-not-allowed"
                        : ""
                    }`}
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
                          {format(
                            new Date(editingTask.start_date + "T00:00:00"),
                            "PPP",
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={new Date(editingTask.start_date + "T00:00:00")}
                          onSelect={(date) =>
                            date &&
                            setEditingTask({
                              ...editingTask,
                              start_date: date.toISOString().split("T")[0],
                            })
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
                          {format(
                            new Date(editingTask.end_date + "T00:00:00"),
                            "PPP",
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={new Date(editingTask.end_date + "T00:00:00")}
                          onSelect={(date) =>
                            date &&
                            setEditingTask({
                              ...editingTask,
                              end_date: date.toISOString().split("T")[0],
                            })
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
                      setEditingTask({ ...editingTask, project_id: value })
                    }
                    value={editingTask.project_id || "none"}
                  >
                    <SelectTrigger className="col-span-3">
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-status" className="text-right">
                    Status
                  </Label>
                  <Select
                    onValueChange={(
                      value: "pending" | "in_progress" | "completed",
                    ) => setEditingTask({ ...editingTask, status: value })}
                    value={editingTask.status}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editingTask.status === "completed" && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-completion_date" className="text-right">
                      Data de Conclusão
                    </Label>
                    <Input
                      id="edit-completion_date"
                      type="date"
                      value={editingTask.completion_date || ""}
                      onChange={(e) =>
                        setEditingTask({
                          ...editingTask,
                          completion_date: e.target.value,
                        })
                      }
                      className="col-span-3"
                    />
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-special_marker" className="text-right">
                    Marcador Especial
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      setEditingTask({
                        ...editingTask,
                        special_marker: value,
                      })
                    }
                    value={editingTask.special_marker || "none"}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione um marcador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="major_release">Major Release</SelectItem>
                      <SelectItem value="major_deployment">
                        Major Deployment
                      </SelectItem>
                      <SelectItem value="major_theme">Major Theme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-repeats_weekly" className="text-right">
                    Repetição Semanal
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <input
                      id="edit-repeats_weekly"
                      type="checkbox"
                      checked={editingTask.repeats_weekly || false}
                      onChange={(e) =>
                        setEditingTask({
                          ...editingTask,
                          repeats_weekly: e.target.checked,
                          repeat_days: e.target.checked
                            ? editingTask.repeat_days || []
                            : null,
                          hours_per_day: e.target.checked
                            ? editingTask.hours_per_day || 0
                            : null,
                        })
                      }
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="edit-repeats_weekly" className="text-sm">
                      Esta tarefa se repete semanalmente
                    </Label>
                  </div>
                </div>
                {editingTask.repeats_weekly && (
                  <>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label className="text-right pt-2">Dias da Semana</Label>
                      <div className="col-span-3 grid grid-cols-2 gap-2">
                        {[
                          { value: "monday", label: "Segunda" },
                          { value: "tuesday", label: "Terça" },
                          { value: "wednesday", label: "Quarta" },
                          { value: "thursday", label: "Quinta" },
                          { value: "friday", label: "Sexta" },
                          { value: "saturday", label: "Sábado" },
                          { value: "sunday", label: "Domingo" },
                        ].map((day) => (
                          <div
                            key={day.value}
                            className="flex items-center space-x-2"
                          >
                            <input
                              id={`edit-day-${day.value}`}
                              type="checkbox"
                              checked={(editingTask.repeat_days || []).includes(
                                day.value,
                              )}
                              onChange={(e) =>
                                handleCurrentTaskRepeatDayChange(
                                  day.value,
                                  e.target.checked,
                                )
                              }
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <Label
                              htmlFor={`edit-day-${day.value}`}
                              className="text-sm"
                            >
                              {day.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-hours_per_day" className="text-right">
                        Horas por Dia
                      </Label>
                      <Input
                        id="edit-hours_per_day"
                        type="number"
                        min="0"
                        step="0.5"
                        value={editingTask.hours_per_day || 0}
                        onChange={(e) =>
                          setEditingTask({
                            ...editingTask,
                            hours_per_day: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="col-span-3"
                        placeholder="Ex: 2.5"
                      />
                    </div>
                  </>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-assigned-employee" className="text-right">
                    Responsável
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      setEditingTask({
                        ...editingTask,
                        assigned_employee_id: value,
                      })
                    }
                    value={editingTask.assigned_employee_id || "none"}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não atribuído</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateTask}>
              Update Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePage;
