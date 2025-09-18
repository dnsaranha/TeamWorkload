import { type Task, type Employee } from './supabaseClient';

export const dayNumberToName: { [key: number]: string } = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export const getTasksForDate = (
  date: Date,
  tasks: (Task & { is_recurring_instance?: boolean })[],
  selectedEmployee?: Employee | null,
): (Task & { is_recurring_instance?: boolean })[] => {
  const dayOfWeekName = dayNumberToName[date.getUTCDay()];

  if (selectedEmployee) {
    const workDays = selectedEmployee.dias_de_trabalho || [
      "monday", "tuesday", "wednesday", "thursday", "friday",
    ];
    if (!workDays.includes(dayOfWeekName)) {
      return [];
    }
  }

  const dayTasks: (Task & { is_recurring_instance?: boolean })[] = [];
  const dateStr = date.toISOString().split("T")[0];

  tasks.forEach((task) => {
    const taskStart = new Date(task.start_date + "T00:00:00Z");
    const taskEnd = new Date(task.end_date + "T00:00:00Z");

    if (task.repeats_weekly && task.repeat_days && dayOfWeekName) {
      if (
        date >= taskStart &&
        date <= taskEnd &&
        task.repeat_days.includes(dayOfWeekName)
      ) {
        dayTasks.push({
          ...task,
          id: `${task.id}-${dateStr}`,
          start_date: dateStr,
          end_date: dateStr,
          estimated_time: task.hours_per_day || 0,
          is_recurring_instance: true,
        });
      }
    } else {
      if (date >= taskStart && date <= taskEnd) {
        dayTasks.push(task);
      }
    }
  });

  return dayTasks;
};

export const calculateDayWorkload = (
  date: Date,
  tasks: (Task & { is_recurring_instance?: boolean })[],
  employees: Employee[],
  employeeId?: string,
) => {
  const selectedEmployee = employees.find(emp => emp.id === employeeId);
  const dayTasks = getTasksForDate(date, tasks, selectedEmployee);

  const filteredTasksByEmployee = employeeId
    ? dayTasks.filter((task) => task.assigned_employee_id === employeeId)
    : dayTasks;

  const dayOfWeekName = dayNumberToName[date.getUTCDay()];

  if (employeeId) {
    const workDays = selectedEmployee?.dias_de_trabalho || [
      "monday", "tuesday", "wednesday", "thursday", "friday",
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

    const employeeWorkDays = taskEmployee?.dias_de_trabalho || [
      "monday", "tuesday", "wednesday", "thursday", "friday",
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
    const numWorkDays = selectedEmployee?.dias_de_trabalho?.length || 5;
    const dailyCapacity =
      selectedEmployee && numWorkDays > 0 ? selectedEmployee.weekly_hours / numWorkDays : 0;

    return {
      hours: totalHours,
      percentage:
        dailyCapacity > 0 ? (totalHours / dailyCapacity) * 100 : 0,
      capacity: dailyCapacity,
    };
  }

  const totalCapacity = employees.reduce((sum, emp) => {
    const workDays = emp.dias_de_trabalho || [
      "monday", "tuesday", "wednesday", "thursday", "friday",
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
