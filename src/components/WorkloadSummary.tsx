import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
  Legend,
} from "recharts";
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

interface EmployeeWithWorkload extends Employee {
  workload: number; // percentage
}

interface ProjectWithWorkload extends Project {
  progress: number; // percentage
  workload: number; // percentage
}

interface WorkloadSummaryProps {
  employees?: EmployeeWithWorkload[];
  projects?: ProjectWithWorkload[];
  period?: string;
  onPeriodChange?: (period: string) => void;
  showCharts?: boolean;
}

interface ChartConfig {
  employeeWorkload: boolean;
  projectProgress: boolean;
  taskDistribution: boolean;
  timelineProgress: boolean;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

const WorkloadSummary = ({
  employees = [],
  projects = [],
  period = "This Week",
  onPeriodChange = () => {},
  showCharts = false,
}: WorkloadSummaryProps) => {
  const [activeTab, setActiveTab] = useState(
    showCharts ? "charts" : "employees",
  );
  const [dbEmployees, setDbEmployees] = useState<EmployeeWithWorkload[]>([]);
  const [dbProjects, setDbProjects] = useState<ProjectWithWorkload[]>([]);
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    employeeWorkload: true,
    projectProgress: true,
    taskDistribution: true,
    timelineProgress: false,
  });

  // Load data from database
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

      // Set tasks state
      setTasks(tasksData as TaskWithRelations[]);

      // Calculate workload for employees based on filtered period
      const employeesWithWorkload: EmployeeWithWorkload[] = employeesData.map(
        (employee) => {
          const employeeTasks = (tasksData as TaskWithRelations[]).filter(
            (task) => task.assigned_employee_id === employee.id,
          );

          // Filter tasks based on the selected period and calculate workload
          const filteredTasks = filterTasksByPeriod(employeeTasks, period);
          const totalHours = calculatePeriodHours(filteredTasks, period);
          const periodCapacity = calculatePeriodCapacity(
            employee.weekly_hours,
            period,
          );

          const workload =
            periodCapacity > 0
              ? Math.round((totalHours / periodCapacity) * 100)
              : 0;

          return {
            ...employee,
            workload,
          };
        },
      );

      // Calculate workload for projects
      const projectsWithWorkload: ProjectWithWorkload[] = projectsData.map(
        (project) => {
          const projectTasks = (tasksData as TaskWithRelations[]).filter(
            (task) => task.project_id === project.id,
          );

          const totalHours = projectTasks.reduce(
            (sum, task) => sum + task.estimated_time,
            0,
          );
          const completedTasks = projectTasks.filter(
            (task) => new Date(task.end_date) < new Date(),
          ).length;

          const progress =
            projectTasks.length > 0
              ? Math.round((completedTasks / projectTasks.length) * 100)
              : 0;
          const workload = Math.min(100, Math.round((totalHours / 40) * 100)); // Assuming 40h baseline

          return {
            ...project,
            progress,
            workload,
          };
        },
      );

      setDbEmployees(employeesWithWorkload);
      setDbProjects(projectsWithWorkload);
    } catch (error) {
      console.error("Error loading workload summary data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for period-based calculations
  const filterTasksByPeriod = (
    tasks: TaskWithRelations[],
    selectedPeriod: string,
  ) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (selectedPeriod) {
      case "Today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        );
        break;
      case "This Week":
        const dayOfWeek = now.getDay();
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - dayOfWeek,
        );
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + (6 - dayOfWeek) + 1,
        );
        break;
      case "This Month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "This Quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      default:
        return tasks;
    }

    return tasks.filter((task) => {
      const taskStart = new Date(task.start_date);
      const taskEnd = new Date(task.end_date);

      // Task overlaps with the period if it starts before period ends and ends after period starts
      return taskStart < endDate && taskEnd >= startDate;
    });
  };

  const calculatePeriodHours = (
    tasks: TaskWithRelations[],
    selectedPeriod: string,
  ) => {
    const now = new Date();

    return tasks.reduce((total, task) => {
      // If task is completed, only count hours up to completion date
      if (task.status === "completed" && task.completion_date) {
        const completionDate = new Date(task.completion_date);
        const taskStart = new Date(task.start_date);
        const taskEnd = new Date(task.end_date);

        // If completed before the task period, don't count any hours
        if (completionDate < taskStart) return total;

        // Calculate the proportion of task completed within the period
        const effectiveEnd =
          completionDate < taskEnd ? completionDate : taskEnd;
        const taskDuration = Math.max(
          1,
          (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24),
        );
        const completedDuration = Math.max(
          1,
          (effectiveEnd.getTime() - taskStart.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        return total + task.estimated_time * (completedDuration / taskDuration);
      }

      // For non-completed tasks, count full estimated time
      return total + task.estimated_time;
    }, 0);
  };

  const calculatePeriodCapacity = (
    weeklyHours: number,
    selectedPeriod: string,
  ) => {
    switch (selectedPeriod) {
      case "Today":
        return weeklyHours / 5; // Assuming 5 work days per week
      case "This Week":
        return weeklyHours;
      case "This Month":
        return weeklyHours * 4.33; // Average weeks per month
      case "This Quarter":
        return weeklyHours * 13; // Average weeks per quarter
      default:
        return weeklyHours;
    }
  };

  // Use database data if available, otherwise use props
  const displayEmployees = employees.length > 0 ? employees : dbEmployees;
  const displayProjects = projects.length > 0 ? projects : dbProjects;

  const getWorkloadColor = (workload: number) => {
    if (workload > 100) return "bg-red-500";
    if (workload >= 50) return "bg-amber-500";
    return "bg-green-500";
  };

  const getWorkloadBadge = (workload: number) => {
    if (workload > 100) return "destructive";
    if (workload >= 50) return "default";
    return "secondary";
  };

  // Prepare chart data
  const employeeChartData = displayEmployees.map((emp) => ({
    name: emp.name.split(" ")[0], // First name only for chart
    workload: emp.workload,
    capacity: 100,
  }));

  const projectChartData = displayProjects.map((proj) => ({
    name:
      proj.name.length > 15 ? proj.name.substring(0, 15) + "..." : proj.name,
    progress: proj.progress,
    workload: proj.workload,
  }));

  const taskDistributionData = displayEmployees
    .map((emp) => {
      const employeeTasks = tasks.filter(
        (task) => task.assigned_employee_id === emp.id,
      );
      return {
        name: emp.name.split(" ")[0],
        tasks: employeeTasks.length,
        hours: employeeTasks.reduce(
          (sum, task) => sum + task.estimated_time,
          0,
        ),
      };
    })
    .filter((item) => item.tasks > 0);

  const workloadStatusData = [
    {
      name: "Overloaded (>100%)",
      value: displayEmployees.filter((emp) => emp.workload > 100).length,
      color: "#FF8042",
    },
    {
      name: "Optimal (50-100%)",
      value: displayEmployees.filter(
        (emp) => emp.workload >= 50 && emp.workload <= 100,
      ).length,
      color: "#FFBB28",
    },
    {
      name: "Underutilized (<50%)",
      value: displayEmployees.filter((emp) => emp.workload < 50).length,
      color: "#00C49F",
    },
  ].filter((item) => item.value > 0);

  return (
    <Card className="h-full bg-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            Workload Summary
          </CardTitle>
          <Select defaultValue={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="This Week">This Week</SelectItem>
              <SelectItem value="This Month">This Month</SelectItem>
              <SelectItem value="This Quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className={`grid w-full ${showCharts ? "grid-cols-3" : "grid-cols-2"}`}
          >
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            {showCharts && <TabsTrigger value="charts">Charts</TabsTrigger>}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="px-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <ScrollArea className="h-[600px] pr-4">
            <TabsContent value="employees" className="mt-0">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-6">Loading employees...</div>
                ) : displayEmployees.length === 0 ? (
                  <div className="text-center py-6">No employees found</div>
                ) : (
                  displayEmployees.map((employee) => (
                    <div key={employee.id} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-3 mb-3">
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
                        <div>
                          <h4 className="font-medium text-sm">
                            {employee.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {employee.role}
                          </p>
                        </div>
                        <Badge
                          variant={getWorkloadBadge(employee.workload)}
                          className="ml-auto"
                        >
                          {employee.workload}%
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Workload</span>
                          <span
                            className={
                              employee.workload > 100
                                ? "text-red-500 font-medium"
                                : ""
                            }
                          >
                            {employee.workload}%
                          </span>
                        </div>
                        <Progress
                          value={employee.workload}
                          max={150}
                          className={`h-2 ${getWorkloadColor(employee.workload)}`}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="projects" className="mt-0">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-6">Loading projects...</div>
                ) : displayProjects.length === 0 ? (
                  <div className="text-center py-6">No projects found</div>
                ) : (
                  displayProjects.map((project) => (
                    <div key={project.id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm">{project.name}</h4>
                        <Badge variant={getWorkloadBadge(project.workload)}>
                          {project.workload}%
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Workload</span>
                            <span
                              className={
                                project.workload > 100
                                  ? "text-red-500 font-medium"
                                  : ""
                              }
                            >
                              {project.workload}%
                            </span>
                          </div>
                          <Progress
                            value={project.workload}
                            max={150}
                            className={`h-2 ${getWorkloadColor(project.workload)}`}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span>{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {showCharts && (
              <TabsContent value="charts" className="mt-0">
                <div className="space-y-4">
                  {/* Employee Workload Bar Chart */}
                  {chartConfig.employeeWorkload &&
                    employeeChartData.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">
                            Employee Workload
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={employeeChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="workload" fill="#8884d8" />
                                <Bar
                                  dataKey="capacity"
                                  fill="#e0e0e0"
                                  opacity={0.3}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Project Progress Chart */}
                  {chartConfig.projectProgress &&
                    projectChartData.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">
                            Project Progress
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={projectChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="progress" fill="#00C49F" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Task Distribution Pie Chart */}
                  {chartConfig.taskDistribution &&
                    workloadStatusData.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">
                            Workload Distribution
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={workloadStatusData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, value }) =>
                                    `${name}: ${value}`
                                  }
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {workloadStatusData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={entry.color}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Task Distribution by Employee */}
                  {chartConfig.taskDistribution &&
                    taskDistributionData.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">
                            Task Distribution by Employee
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={taskDistributionData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Legend />
                                <Bar
                                  dataKey="tasks"
                                  fill="#8884d8"
                                  name="Tasks"
                                />
                                <Bar
                                  dataKey="hours"
                                  fill="#82ca9d"
                                  name="Hours"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </div>
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WorkloadSummary;
