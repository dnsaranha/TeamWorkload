import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, ListTodo, BarChart3, Home } from "lucide-react";
import WorkloadCalendar from "./WorkloadCalendar";
import EmployeeList from "./EmployeeList";
import TaskManagement from "./TaskManagement";
import WorkloadSummary from "./WorkloadSummary";
import { employeeService, taskService } from "@/lib/supabaseClient";

const HomePage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeTasks, setActiveTasks] = useState(0);
  const [avgWorkload, setAvgWorkload] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [employees, tasks] = await Promise.all([
        employeeService.getAll(),
        taskService.getAll(),
      ]);

      setTotalEmployees(employees.length);

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
      <div className="w-64 border-r bg-card p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary">Workload Manager</h1>
          <p className="text-sm text-muted-foreground">
            Team capacity planning
          </p>
        </div>

        <nav className="space-y-2 flex-1">
          <Button
            variant={activeTab === "dashboard" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setActiveTab("dashboard")}
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === "employees" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setActiveTab("employees")}
          >
            <Users className="mr-2 h-4 w-4" />
            Employees
          </Button>
          <Button
            variant={activeTab === "tasks" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setActiveTab("tasks")}
          >
            <ListTodo className="mr-2 h-4 w-4" />
            Tasks
          </Button>
          <Button
            variant={activeTab === "reports" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setActiveTab("reports")}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
          </Button>
        </nav>

        <div className="pt-4 border-t">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              U
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium">User Name</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <WorkloadCalendar />
                </div>
                <div className="w-80">
                  <WorkloadSummary />
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

          {activeTab === "reports" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Reports</h2>
              <Tabs defaultValue="employee">
                <TabsList>
                  <TabsTrigger value="employee">By Employee</TabsTrigger>
                  <TabsTrigger value="project">By Project</TabsTrigger>
                </TabsList>
                <TabsContent value="employee" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-medium mb-4">
                        Employee Workload Report
                      </h3>
                      <div className="space-y-4">
                        {/* Placeholder for employee report content */}
                        <div className="h-80 bg-muted/20 rounded-md flex items-center justify-center">
                          <p className="text-muted-foreground">
                            Employee report visualization will appear here
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="project" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-medium mb-4">
                        Project Workload Report
                      </h3>
                      <div className="space-y-4">
                        {/* Placeholder for project report content */}
                        <div className="h-80 bg-muted/20 rounded-md flex items-center justify-center">
                          <p className="text-muted-foreground">
                            Project report visualization will appear here
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
