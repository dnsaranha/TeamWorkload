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
  Users,
  Clock,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
import {
  projectService,
  taskService,
  employeeService,
  type Project,
  type Task,
  type Employee,
} from "@/lib/supabaseClient";

interface ProjectVisualizationProps {
  activeView: "overview" | "workload" | "timeline";
}

const ProjectVisualization: React.FC<ProjectVisualizationProps> = ({ activeView }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {activeView === "overview" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-600" />
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

      {activeView === "workload" && (
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

      {activeView === "timeline" && (
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
  );
};

export default ProjectVisualization;
