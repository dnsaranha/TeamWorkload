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
} from "lucide-react";
import WorkloadCalendar from "./WorkloadCalendar";
import EmployeeList from "./EmployeeList";
import TaskManagement from "./TaskManagement";
import WorkloadSummary from "./WorkloadSummary";
import ProjectVisualization from "./ProjectVisualization";
import ProjectList from "./ProjectList";
import UserProfile from "./UserProfile";
import Roadmap from "./Roadmap";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  employeeService,
  taskService,
  projectService,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);

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
      const [employees, tasks, projects] = await Promise.all([
        employeeService.getAll(),
        taskService.getAll(),
        projectService.getAll(),
      ]);

      setTotalEmployees(employees.length);
      setTotalProjects(projects.length);

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
      if (employees.length > 0) {
        const totalCapacity = employees.reduce(
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

              <DndProvider backend={HTML5Backend}>
                <div className="flex gap-6 h-[calc(100vh-280px)]">
                  <div className="flex-1">
                    <WorkloadCalendar selectedEmployeeId={selectedEmployeeId} />
                  </div>
                  <div className="w-80">
                    <WorkloadSummary
                      selectedEmployeeId={selectedEmployeeId}
                      onEmployeeSelect={setSelectedEmployeeId}
                    />
                  </div>
                </div>
              </DndProvider>
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
    </div>
  );
};

export default HomePage;
