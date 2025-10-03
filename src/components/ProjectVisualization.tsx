import React, { useState, useEffect, useMemo } from "react";
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
  Users,
  Clock,
  TrendingUp,
  CheckCircle,
  Search,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  projectService,
  taskService,
  employeeService,
  type Project,
  type Task,
  type Employee,
} from "@/lib/supabaseClient";
import { Input } from "./ui/input";
import { DatePickerWithRange } from "./ui/date-picker-with-range";
import { DateRange } from "react-day-picker";
import { Card } from "./ui/card";

interface ProjectVisualizationProps {
  activeView?: "overview" | "workload" | "timeline";
}

const ProjectVisualization: React.FC<ProjectVisualizationProps> = ({
  activeView = "overview",
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

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

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const searchMatch =
        !searchTerm ||
        searchTerm
          .toLowerCase()
          .split(" ")
          .every((word) => {
            const project = projects.find((p) => p.id === task.project_id);
            const employee = employees.find(
              (e) => e.id === task.assigned_employee_id,
            );
            const taskText = `
            ${task.name}
            ${task.description || ""}
            ${project?.name || ""}
            ${employee?.name || ""}
          `.toLowerCase();
            return taskText.includes(word);
          });

      const dateMatch =
        !dateRange ||
        !dateRange.from ||
        (new Date(task.start_date) >= dateRange.from &&
          (!dateRange.to || new Date(task.end_date) <= dateRange.to));

      return searchMatch && dateMatch;
    });
  }, [tasks, searchTerm, dateRange, projects, employees]);

  const getProjectStats = () => {
    const stats = projects.map((project) => {
      const projectTasks = filteredTasks.filter(
        (task) => task.project_id === project.id,
      );
      const totalHours = projectTasks.reduce(
        (sum, task) => sum + task.estimated_time,
        0,
      );
      return {
        name: project.name,
        totalHours,
      };
    });
    return stats;
  };

  const getWorkloadData = () => {
    const workloadData = employees.map((employee) => {
      const employeeTasks = filteredTasks.filter(
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
    const statusCounts = filteredTasks.reduce(
      (acc, task) => {
        const status = task.status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
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
    const monthlyData = filteredTasks.reduce(
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10"
            />
          </div>
          <DatePickerWithRange onDateChange={setDateRange} />
        </div>
      </div>
      {activeView === "overview" && (
        <div className="space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Hours Chart */}
            <Card>
              <h3 className="text-lg font-medium text-gray-900 mb-4 p-4">
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
            </Card>

            {/* Task Status Distribution */}
            <Card>
              <h3 className="text-lg font-medium text-gray-900 mb-4 p-4">
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
            </Card>
          </div>
        </div>
      )}
      {activeView === "workload" && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-medium text-gray-900 p-4">
              Employee Workload Analysis
            </h3>
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
          </Card>
        </div>
      )}
      {activeView === "timeline" && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-medium text-gray-900 p-4">
              Project Timeline
            </h3>
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
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProjectVisualization;
