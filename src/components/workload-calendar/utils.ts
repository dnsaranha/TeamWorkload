import { type Task, type Employee, type Project } from "@/lib/supabaseClient";
import { TaskInstance } from "@/types/tasks";

export const dayNumberToName: { [key: number]: string } = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export const getWeekDates = (date: Date) => {
  const week = [];
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const dayOfMonth = date.getUTCDate();
  const dayOfWeek = date.getUTCDay(); // 0 for Sunday, 1 for Monday, etc.

  // Find the date of the Sunday for the current week
  const sundayDate = new Date(Date.UTC(year, month, dayOfMonth - dayOfWeek));

  for (let i = 0; i < 7; i++) {
    const weekDay = new Date(sundayDate.valueOf());
    weekDay.setUTCDate(sundayDate.getUTCDate() + i);
    week.push(weekDay);
  }
  return week;
};

export const getMonthDates = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  // First day of the month in UTC
  const firstDay = new Date(Date.UTC(year, month, 1));
  // Last day of the month in UTC
  const lastDay = new Date(Date.UTC(year, month + 1, 0));

  // Find the Sunday of the week where the month starts
  const startDate = new Date(firstDay.valueOf());
  startDate.setUTCDate(startDate.getUTCDate() - firstDay.getUTCDay());

  // Find the Saturday of the week where the month ends
  const endDate = new Date(lastDay.valueOf());
  endDate.setUTCDate(endDate.getUTCDate() + (6 - lastDay.getUTCDay()));

  const dates = [];
  const current = new Date(startDate.valueOf());

  while (current <= endDate) {
    dates.push(new Date(current.valueOf()));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

export const getTasksForDate = (
  date: Date,
  filteredTasks: Task[],
  projects: Project[],
  employees: Employee[],
  selectedEmployee?: Employee | null,
): TaskInstance[] => {
  const dayOfWeekName = dayNumberToName[date.getUTCDay()];

  if (selectedEmployee) {
    const workDays = selectedEmployee.dias_de_trabalho || [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ];
    if (!workDays.includes(dayOfWeekName)) return [];
  }

  const dayTasks: TaskInstance[] = [];
  const dateStr = date.toISOString().split("T")[0];

  filteredTasks.forEach((task) => {
    const taskStart = new Date(task.start_date + "T00:00:00Z");
    const taskEnd = new Date(task.end_date + "T00:00:00Z");

    const exception = task.exceptions?.find((ex) => ex.date === dateStr);

    if (task.repeats_weekly && task.repeat_days?.includes(dayOfWeekName)) {
      if (date >= taskStart && date <= taskEnd) {
        if (exception?.is_removed) {
          return; // Skip this instance
        }

        dayTasks.push({
          ...task,
          id: task.id, // Use original ID
          start_date: dateStr,
          end_date: dateStr,
          estimated_time:
            exception?.estimated_time ?? task.hours_per_day ?? 0,
          assigned_employee_id:
            exception?.assigned_employee_id ?? task.assigned_employee_id,
          is_recurring_instance: true,
          isException: !!exception,
          instanceDate: dateStr,
          project: projects.find((p) => p.id === task.project_id) || null,
          assigned_employee:
            employees.find((e) => e.id === task.assigned_employee_id) || null,
        });
      }
    } else if (date >= taskStart && date <= taskEnd) {
      dayTasks.push({
        ...task,
        is_recurring_instance: false,
        isException: false,
        instanceDate: dateStr,
        project: projects.find((p) => p.id === task.project_id) || null,
        assigned_employee:
          employees.find((e) => e.id === task.assigned_employee_id) || null,
      });
    }
  });

  return dayTasks;
};

export const calculateDayWorkload = (
  date: Date,
  getTasksForDate: (date: Date) => TaskInstance[],
  employees: Employee[],
  employeeId?: string,
) => {
  const dayTasks = getTasksForDate(date);
  const filteredTasksByEmployee = employeeId
    ? dayTasks.filter((task) => task.assigned_employee_id === employeeId)
    : dayTasks;

  const dayOfWeekName = dayNumberToName[date.getUTCDay()];

  // For single employee view, if it's not a workday, they have 0 capacity.
  if (employeeId) {
    const employee = employees.find((emp) => emp.id === employeeId);
    // Default to Mon-Fri if dias_de_trabalho is not set.
    const workDays = employee?.dias_de_trabalho || [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ];
    const isWorkDay = workDays.includes(dayOfWeekName);

    if (!isWorkDay) {
      return { hours: 0, percentage: 0, capacity: 0 };
    }
  }

  const totalHours = filteredTasksByEmployee.reduce((sum, task) => {
    if (task.is_recurring_instance) {
      return sum + task.estimated_time;
    }

    const startDate = new Date(task.start_date + "T00:00:00Z");
    const endDate = new Date(task.end_date + "T00:00:00Z");

    let workingDays = 0;
    const tempDate = new Date(startDate.valueOf());
    const taskEmployee = employees.find(
      (emp) => emp.id === task.assigned_employee_id,
    );

    // Default to Mon-Fri if not specified
    const employeeWorkDays = taskEmployee?.dias_de_trabalho || [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ];

    while (tempDate <= endDate) {
      const currentDayName = dayNumberToName[tempDate.getUTCDay()];
      if (employeeWorkDays.includes(currentDayName)) {
        workingDays++;
      }
      tempDate.setUTCDate(tempDate.getUTCDate() + 1);
    }

    const daysDiff = Math.max(1, workingDays);
    return sum + task.estimated_time / daysDiff;
  }, 0);

  if (employeeId) {
    const employee = employees.find((emp) => emp.id === employeeId);
    const numWorkDays = employee?.dias_de_trabalho?.length || 5;
    const dailyCapacity =
      employee && numWorkDays > 0 ? employee.weekly_hours / numWorkDays : 0;

    return {
      hours: totalHours,
      percentage:
        dailyCapacity > 0 ? (totalHours / dailyCapacity) * 100 : 0,
      capacity: dailyCapacity,
    };
  }

  // For all employees view, calculate average workload
  const totalCapacity = employees.reduce((sum, emp) => {
    const workDays = emp.dias_de_trabalho || [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ];
    const isWorkDay = workDays.includes(dayOfWeekName);

    if (!isWorkDay) {
      return sum;
    }

    const numWorkDays = workDays.length || 5;
    const dailyCapacity =
      numWorkDays > 0 ? emp.weekly_hours / numWorkDays : 0;
    return sum + dailyCapacity;
  }, 0);

  return {
    hours: totalHours,
    percentage: totalCapacity > 0 ? (totalHours / totalCapacity) * 100 : 0,
    capacity: totalCapacity,
  };
};

export const getWorkloadColor = (percentage: number) => {
  if (percentage > 100) return "bg-red-100 border-red-300 text-red-800";
  if (percentage >= 50)
    return "bg-yellow-100 border-yellow-300 text-yellow-800";
  return "bg-green-100 border-green-300 text-green-800";
};

export const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};
