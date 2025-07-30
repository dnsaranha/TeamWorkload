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
}

const WorkloadSummary = ({
  employees = [],
  projects = [],
  period = "This Week",
  onPeriodChange = () => {},
}: WorkloadSummaryProps) => {
  const [activeTab, setActiveTab] = useState("employees");
  const [dbEmployees, setDbEmployees] = useState<EmployeeWithWorkload[]>([]);
  const [dbProjects, setDbProjects] = useState<ProjectWithWorkload[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Calculate workload for employees
      const employeesWithWorkload: EmployeeWithWorkload[] = employeesData.map(
        (employee) => {
          const employeeTasks = (tasksData as TaskWithRelations[]).filter(
            (task) => task.assigned_employee_id === employee.id,
          );

          const totalHours = employeeTasks.reduce(
            (sum, task) => sum + task.estimated_time,
            0,
          );
          const workload =
            employee.weekly_hours > 0
              ? Math.round((totalHours / employee.weekly_hours) * 100)
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
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
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WorkloadSummary;
