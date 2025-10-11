import React, { useState, useMemo, useCallback } from 'react';
import { Header } from './Header';
import { TaskList } from './TaskList';
import { GanttChart } from './GanttChart';
import type { Phase, Task } from '../../types';
import { addDays, differenceInDays, format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ROW_HEIGHT, CELL_WIDTH } from '../../constants';
import { AddTaskModal } from './AddTaskModal';

import { taskService, projectService, employeeService, type Task as DBTask, type Project as DBProject, type Employee as DBEmployee } from '../../lib/supabaseClient';

export const GanttContainer: React.FC = () => {
    const [data, setData] = useState<Phase[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        const [tasks, projects, employees] = await Promise.all([
            taskService.getAll(),
            projectService.getAll(),
            employeeService.getAll(),
        ]);

        const taskIdMap = new Map<string, number>();
        let taskCounter = 1;

        const getNumericId = (taskId: string) => {
            if (!taskIdMap.has(taskId)) {
                taskIdMap.set(taskId, taskCounter++);
            }
            return taskIdMap.get(taskId)!;
        };

        const phases = projects.map((project, index) => {
            const projectTasks = tasks
                .filter(t => t.project_id === project.id)
                .map(t => ({
                    id: getNumericId(t.id),
                    name: t.name,
                    assignee: employees.find(e => e.id === t.assigned_employee_id)?.name || 'Unassigned',
                    effort: t.estimated_time,
                    startDate: t.start_date,
                    dueDate: t.end_date,
                    progress: t.status === 'completed' ? 100 : (t.status === 'in_progress' ? 50 : 0),
                    dependencies: (t.dependencies || []).map(depId => getNumericId(depId)),
                    color: index % 2 === 0 ? 'green-500' : 'purple-500',
                }));

            return {
                id: project.id,
                name: project.name,
                startDate: project.start_date,
                dueDate: project.end_date,
                progress: projectTasks.length > 0 ? Math.round(projectTasks.reduce((acc, t) => acc + t.progress, 0) / projectTasks.length) : 0,
                totalEffort: projectTasks.reduce((acc, t) => acc + t.effort, 0),
                isCollapsed: false,
                tasks: projectTasks,
            };
        });

        setData(phases);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const { dateRange, totalWidth } = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const range = eachDayOfInterval({ start, end });
        return {
            dateRange: range,
            totalWidth: range.length * CELL_WIDTH,
        };
    }, [currentDate]);

    const allTasks = useMemo(() => {
        let rowIndex = 0;
        return data.flatMap(phase => {
            const phaseRowIndex = rowIndex;
            rowIndex++;
            if (phase.isCollapsed) {
                return [];
            }
            return phase.tasks.map(task => {
                const taskRowIndex = rowIndex;
                rowIndex++;
                return { ...task, phaseId: phase.id, rowIndex: taskRowIndex };
            });
        });
    }, [data]);

    const totalHeight = useMemo(() => {
        return data.reduce((acc, phase) => acc + (phase.isCollapsed ? 1 : phase.tasks.length + 1) + 1, 0) * ROW_HEIGHT;
    }, [data]);

    const taskPositions = useMemo(() => {
        const positions = new Map<number, { left: number; width: number; y: number }>();
        allTasks.forEach(task => {
            const left = differenceInDays(new Date(task.startDate), dateRange[0]) * CELL_WIDTH;
            const width = (differenceInDays(new Date(task.dueDate), new Date(task.startDate)) + 1) * CELL_WIDTH;
            const y = task.rowIndex * ROW_HEIGHT + (ROW_HEIGHT / 2);
            positions.set(task.id, { left: Math.max(0, left), width: Math.max(CELL_WIDTH, width), y });
        });
        return positions;
    }, [allTasks, dateRange]);

    const handleTogglePhase = useCallback((phaseId: string) => {
        setData(prevData =>
            prevData.map(phase =>
                phase.id === phaseId ? { ...phase, isCollapsed: !phase.isCollapsed } : phase
            )
        );
    }, []);

    const handleAddDependency = useCallback((fromTaskId: number, toTaskId: number) => {
        setData(prevData => {
            const newData = [...prevData];
            const toTaskPhase = newData.find(p => p.tasks.some(t => t.id === toTaskId));
            if (toTaskPhase) {
                const toTask = toTaskPhase.tasks.find(t => t.id === toTaskId);
                if (toTask && !toTask.dependencies.includes(fromTaskId)) {
                    toTask.dependencies.push(fromTaskId);
                }
            }
            return newData;
        });
    }, []);

    const handleNavigate = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => addDays(prev, direction === 'prev' ? -30 : 30));
    };

    const handleGoToToday = () => {
        setCurrentDate(new Date());
    };

    const handleAddTask = (phaseId: string) => {
        setSelectedPhaseId(phaseId);
        setIsModalOpen(true);
    };

    const handleSaveTask = async (taskName: string) => {
        if (!selectedPhaseId) return;

        const newTask = {
            name: taskName,
            project_id: selectedPhaseId,
            start_date: format(new Date(), 'yyyy-MM-dd'),
            end_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
            estimated_time: 8,
        };

        await taskService.create(newTask);
        await loadData();
    };

    return (
        <div className="flex flex-col h-full w-full bg-white">
            <Header
                onGoToToday={handleGoToToday}
                onNavigate={handleNavigate}
                visibleMonthYear={format(currentDate, 'MMMM yyyy')}
            />
            <div className="flex flex-1 overflow-hidden">
                <div className="w-1/3 border-r overflow-y-auto">
                    <TaskList
                        data={data}
                        onTogglePhase={handleTogglePhase}
                        onAddTask={handleAddTask}
                    />
                </div>
                <div className="flex-1 overflow-x-auto">
                     <GanttChart
                        data={data}
                        allTasks={allTasks}
                        startDate={dateRange[0]}
                        dateRange={dateRange}
                        totalWidth={totalWidth}
                        taskPositions={taskPositions}
                        totalHeight={totalHeight}
                        onAddDependency={handleAddDependency}
                    />
                </div>
            </div>
            {isModalOpen && selectedPhaseId && (
                <AddTaskModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveTask}
                    phaseId={selectedPhaseId}
                />
            )}
        </div>
    );
};