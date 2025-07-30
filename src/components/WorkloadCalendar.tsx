import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";

interface Task {
  id: string;
  name: string;
  project: string;
  estimatedHours: number;
  startDate: Date;
  endDate: Date;
  employeeId: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  weeklyHours: number;
  skills: string[];
}

interface WorkloadCalendarProps {
  tasks?: Task[];
  employees?: Employee[];
  onTaskClick?: (task: Task) => void;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
}

const WorkloadCalendar = ({
  tasks = [],
  employees = [],
  onTaskClick = () => {},
  onDateRangeChange = () => {},
}: WorkloadCalendarProps) => {
  const [view, setView] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Mock data for demonstration
  const mockEmployees: Employee[] =
    employees.length > 0
      ? employees
      : [
          {
            id: "1",
            name: "John Doe",
            role: "Developer",
            weeklyHours: 40,
            skills: ["React", "TypeScript"],
          },
          {
            id: "2",
            name: "Jane Smith",
            role: "Designer",
            weeklyHours: 35,
            skills: ["UI/UX", "Figma"],
          },
          {
            id: "3",
            name: "Mike Johnson",
            role: "Project Manager",
            weeklyHours: 40,
            skills: ["Agile", "Scrum"],
          },
        ];

  const mockTasks: Task[] =
    tasks.length > 0
      ? tasks
      : [
          {
            id: "1",
            name: "Frontend Development",
            project: "Website Redesign",
            estimatedHours: 30,
            startDate: new Date(2023, 5, 1),
            endDate: new Date(2023, 5, 5),
            employeeId: "1",
          },
          {
            id: "2",
            name: "UI Design",
            project: "Mobile App",
            estimatedHours: 20,
            startDate: new Date(2023, 5, 3),
            endDate: new Date(2023, 5, 7),
            employeeId: "2",
          },
          {
            id: "3",
            name: "Sprint Planning",
            project: "Website Redesign",
            estimatedHours: 10,
            startDate: new Date(2023, 5, 2),
            endDate: new Date(2023, 5, 2),
            employeeId: "3",
          },
        ];

  // Helper functions to navigate dates
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
    calculateDateRange(newDate, view);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    calculateDateRange(newDate, view);
  };

  const calculateDateRange = (date: Date, viewType: "week" | "month") => {
    const startDate = new Date(date);
    const endDate = new Date(date);

    if (viewType === "week") {
      // Set to beginning of week (Sunday)
      const day = startDate.getDay();
      startDate.setDate(startDate.getDate() - day);

      // Set to end of week (Saturday)
      endDate.setDate(startDate.getDate() + 6);
    } else {
      // Set to beginning of month
      startDate.setDate(1);

      // Set to end of month
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
    }

    onDateRangeChange(startDate, endDate);
    return { startDate, endDate };
  };

  // Calculate the date range based on current view and date
  const { startDate, endDate } = calculateDateRange(currentDate, view);

  // Format date range for display
  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  };

  // Generate days for the calendar based on view
  const generateDays = () => {
    const days = [];
    const currentDay = new Date(startDate);

    while (currentDay <= endDate) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return days;
  };

  const days = generateDays();

  // Calculate workload percentage for an employee on a specific day
  const calculateWorkload = (employeeId: string, date: Date) => {
    const dailyHours = mockTasks
      .filter(
        (task) =>
          task.employeeId === employeeId &&
          date >= task.startDate &&
          date <= task.endDate,
      )
      .reduce((total, task) => {
        // Distribute task hours evenly across days
        const taskDays = Math.max(
          1,
          Math.ceil(
            (task.endDate.getTime() - task.startDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
        return total + task.estimatedHours / taskDays;
      }, 0);

    const employee = mockEmployees.find((emp) => emp.id === employeeId);
    if (!employee) return 0;

    // Daily capacity (weekly hours / 5 workdays)
    const dailyCapacity = employee.weeklyHours / 5;

    // Skip weekends in workload calculation
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 0;

    return Math.round((dailyHours / dailyCapacity) * 100);
  };

  // Determine color based on workload percentage
  const getWorkloadColor = (percentage: number) => {
    if (percentage > 100) return "bg-red-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Format date for column headers
  const formatColumnDate = (date: Date) => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      day: dayNames[date.getDay()],
      date: date.getDate(),
    };
  };

  return (
    <Card className="w-full bg-white">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Workload Calendar</CardTitle>
          <div className="flex items-center space-x-2">
            <Tabs
              defaultValue={view}
              onValueChange={(value) => setView(value as "week" | "month")}
            >
              <TabsList>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="website">Website Redesign</SelectItem>
                <SelectItem value="mobile">Mobile App</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">{formatDateRange()}</div>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Today
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="p-2 border-b border-r min-w-[120px] sticky left-0 bg-white z-10">
                  Employee
                </th>
                {days.map((day, index) => {
                  const { day: dayName, date } = formatColumnDate(day);
                  return (
                    <th
                      key={index}
                      className="p-2 border-b text-center min-w-[80px]"
                    >
                      <div>{dayName}</div>
                      <div className="font-bold">{date}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {mockEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td className="p-2 border-r sticky left-0 bg-white z-10">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {employee.role}
                    </div>
                  </td>
                  {days.map((day, dayIndex) => {
                    const workload = calculateWorkload(employee.id, day);
                    const workloadColor = getWorkloadColor(workload);
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                    return (
                      <td
                        key={dayIndex}
                        className={`p-2 border border-gray-100 ${isWeekend ? "bg-gray-50" : ""}`}
                      >
                        {!isWeekend && (
                          <div className="flex flex-col space-y-1">
                            {workload > 0 && (
                              <div
                                className={`text-xs font-medium text-white rounded px-2 py-1 ${workloadColor}`}
                              >
                                {workload}%
                              </div>
                            )}
                            {mockTasks
                              .filter(
                                (task) =>
                                  task.employeeId === employee.id &&
                                  day >= task.startDate &&
                                  day <= task.endDate,
                              )
                              .map((task) => (
                                <div
                                  key={task.id}
                                  className="text-xs p-1 bg-blue-100 border-l-4 border-blue-500 rounded cursor-pointer"
                                  onClick={() => onTaskClick(task)}
                                >
                                  <div className="font-medium truncate">
                                    {task.name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {task.project}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkloadCalendar;
