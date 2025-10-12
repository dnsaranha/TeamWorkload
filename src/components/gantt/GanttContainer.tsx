import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Header } from './Header';
import { TaskList } from './TaskList';
import { GanttChart } from './GanttChart';
import type { Phase, Task } from '../../types';
import { addDays, differenceInDays, format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ROW_HEIGHT, CELL_WIDTH } from '../../constants';
import { AddTaskModal } from './AddTaskModal';
import { EditTaskModal } from './EditTaskModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { taskService, projectService, employeeService, type Task as DBTask, type Project as DBProject, type Employee as DBEmployee } from '../../lib/supabaseClient';

export const GanttContainer: React.FC = () => {
    const [data, setData] = useState<Phase[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [listWidth, setListWidth] = useState(33); // percentage
    const dividerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const ganttChartRef = useRef<HTMLDivElement>(null);
    const [cellWidth, setCellWidth] = useState(CELL_WIDTH);
    const [baselines, setBaselines] = useState<any[]>([]);
    const [showBaselines, setShowBaselines] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
    const [startDateFilter, setStartDateFilter] = useState<Date | null>(null);
    const [dueDateFilter, setDueDateFilter] = useState<Date | null>(null);
    const [groupBy, setGroupBy] = useState<string | null>(null);
    const [history, setHistory] = useState<Phase[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // New states for options
    const [showDependencies, setShowDependencies] = useState(true);
    const [showProgress, setShowProgress] = useState(true);
    const [highlightWeekends, setHighlightWeekends] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState({
        assignee: true,
        effort: true,
        startDate: true,
        dueDate: true,
        progress: true,
    });

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

        setDataWithHistory(phases);
        setLoading(false);
    };

    const setDataWithHistory = (newData: Phase[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newData);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setData(newData);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            setData(history[historyIndex - 1]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
            setData(history[historyIndex + 1]);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDividerMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = listWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!containerRef.current) return;
            const containerWidth = containerRef.current.offsetWidth;
            const deltaX = moveEvent.clientX - startX;
            const deltaPercent = (deltaX / containerWidth) * 100;
            const newWidth = Math.min(Math.max(startWidth + deltaPercent, 20), 60); // Min 20%, Max 60%
            setListWidth(newWidth);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const { dateRange, totalWidth } = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const range = eachDayOfInterval({ start, end });
        return {
            dateRange: range,
            totalWidth: range.length * cellWidth,
        };
    }, [currentDate, cellWidth]);

    const allTasks = useMemo(() => {
        let rowIndex = 0;
        let processedData = data.map(phase => {
            const filteredTasks = phase.tasks.filter(task => {
                const taskStartDate = new Date(task.startDate);
                const taskDueDate = new Date(task.dueDate);

                return (
                    task.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    (!assigneeFilter || task.assignee === assigneeFilter) &&
                    (!startDateFilter || taskStartDate >= startDateFilter) &&
                    (!dueDateFilter || taskDueDate <= dueDateFilter)
                );
            });
            return { ...phase, tasks: filteredTasks };
        });

        if (groupBy) {
            const grouped = processedData.flatMap(p => p.tasks).reduce((acc, task) => {
                const key = (task as any)[groupBy] || 'Unassigned';
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(task);
                return acc;
            }, {} as { [key: string]: Task[] });

            processedData = Object.entries(grouped).map(([name, tasks]) => ({
                id: name,
                name,
                startDate: '',
                dueDate: '',
                progress: 0,
                totalEffort: 0,
                isCollapsed: false,
                tasks,
            }));
        }

        return processedData.flatMap(phase => {
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
    }, [data, searchTerm, assigneeFilter, startDateFilter, dueDateFilter, groupBy]);

    const totalHeight = useMemo(() => {
        return data.reduce((acc, phase) => acc + (phase.isCollapsed ? 1 : phase.tasks.length + 1) + 1, 0) * ROW_HEIGHT;
    }, [data]);

    const taskPositions = useMemo(() => {
        const positions = new Map<number, { left: number; width: number; y: number }>();
        allTasks.forEach(task => {
            const left = differenceInDays(new Date(task.startDate), dateRange[0]) * cellWidth;
            const width = (differenceInDays(new Date(task.dueDate), new Date(task.startDate)) + 1) * cellWidth;
            const y = task.rowIndex * ROW_HEIGHT + (ROW_HEIGHT / 2);
            positions.set(task.id, { left: Math.max(0, left), width: Math.max(cellWidth, width), y });
        });
        return positions;
    }, [allTasks, dateRange, cellWidth]);

    const handleTogglePhase = useCallback((phaseId: string) => {
        const newData = data.map(phase =>
            phase.id === phaseId ? { ...phase, isCollapsed: !phase.isCollapsed } : phase
        );
        setDataWithHistory(newData);
    }, [data]);

    const handleAddDependency = useCallback((fromTaskId: number, toTaskId: number) => {
        const newData = JSON.parse(JSON.stringify(data));
        const toTaskPhase = newData.find((p: Phase) => p.tasks.some((t: Task) => t.id === toTaskId));
        if (toTaskPhase) {
            const toTask = toTaskPhase.tasks.find((t: Task) => t.id === toTaskId);
            if (toTask && !toTask.dependencies.includes(fromTaskId)) {
                toTask.dependencies.push(fromTaskId);
            }
        }
        setDataWithHistory(newData);
    }, [data, history, historyIndex]);

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

    const handleTaskDateChange = useCallback((taskId: number, newStartDate: string, newDueDate: string) => {
        const newData = JSON.parse(JSON.stringify(data));
        for (const phase of newData) {
            const task = phase.tasks.find((t: Task) => t.id === taskId);
            if (task) {
                task.startDate = newStartDate;
                task.dueDate = newDueDate;
                break;
            }
        }
        setDataWithHistory(newData);
    }, [data, history, historyIndex]);

    const handleTaskDoubleClickFromChart = useCallback((task: Task & { phaseId: string }) => {
        setSelectedTask(task);
        setIsEditModalOpen(true);
    }, []);

    const handleTaskDoubleClickFromList = useCallback((taskId: number, phaseId: string) => {
        const phase = data.find(p => p.id === phaseId);
        const task = phase?.tasks.find(t => t.id === taskId);
        if (task) {
            setSelectedTask(task);
            setIsEditModalOpen(true);
        }
    }, [data]);

    const handleEditTask = useCallback((taskId: number, updates: Partial<Task>) => {
        const newData = JSON.parse(JSON.stringify(data));
        const phase = newData.find((p: Phase) => p.tasks.some((t: Task) => t.id === taskId));
        if (phase) {
            const task = phase.tasks.find((t: Task) => t.id === taskId);
            if (task) {
                Object.assign(task, updates);
            }
        }
        setDataWithHistory(newData);
        setIsEditModalOpen(false);
    }, [data, history, historyIndex]);

    const handleToggleColumn = (column: keyof typeof visibleColumns) => {
        setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
    };

    const handleExportPNG = () => {
        if (ganttChartRef.current) {
            html2canvas(ganttChartRef.current).then(canvas => {
                const link = document.createElement('a');
                link.download = 'gantt-chart.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        }
    };

    const handleExportPDF = () => {
        if (ganttChartRef.current) {
            html2canvas(ganttChartRef.current).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('l', 'px', [canvas.width, canvas.height]);
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save('gantt-chart.pdf');
            });
        }
    };

    const handleShareLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    };

    const handleZoomIn = () => {
        setCellWidth(prev => Math.min(prev + 20, 200));
    };

    const handleZoomOut = () => {
        setCellWidth(prev => Math.max(prev - 20, 20));
    };

    const handleSearchChange = (term: string) => {
        setSearchTerm(term);
    };

    const handleAssigneeChange = (assignee: string | null) => {
        setAssigneeFilter(assignee);
    };

    const handleStartDateChange = (date: Date | null) => {
        setStartDateFilter(date);
    };

    const handleDueDateChange = (date: Date | null) => {
        setDueDateFilter(date);
    };

    const handleGroupBy = (field: string | null) => {
        setGroupBy(field);
    };

    const handleSetBaseline = () => {
        const newBaseline = {
            date: new Date(),
            tasks: data.flatMap(p => p.tasks.map(t => ({ id: t.id, startDate: t.startDate, dueDate: t.dueDate })))
        };
        setBaselines(prev => [...prev, newBaseline]);
        alert('Baseline set!');
    };

    const handleShowBaselines = () => {
        setShowBaselines(prev => !prev);
    };

    const assignees = useMemo(() => {
        const allAssignees = data.flatMap(p => p.tasks.map(t => t.assignee));
        return [...new Set(allAssignees)];
    }, [data]);

    const handleTaskDragStart = (taskId: number, phaseId: string) => {
        // console.log("drag start", taskId, phaseId);
    };

    const handleTaskDrop = (taskId: number, newPhaseId: string, newIndex: number) => {
        const newData = [...data];
        const oldPhase = newData.find(p => p.tasks.some(t => t.id === taskId));
        if (!oldPhase) return;

        const taskIndex = oldPhase.tasks.findIndex(t => t.id === taskId);
        const [task] = oldPhase.tasks.splice(taskIndex, 1);

        const newPhase = newData.find(p => p.id === newPhaseId);
        if (!newPhase) return;

        newPhase.tasks.splice(newIndex, 0, task);
        setDataWithHistory(newData);
    };

    return (
        <div className="flex flex-col h-full w-full bg-white">
            <Header
                onGoToToday={handleGoToToday}
                onNavigate={handleNavigate}
                visibleMonthYear={format(currentDate, 'MMMM yyyy')}
                options={{ showDependencies, showProgress, highlightWeekends }}
                onToggleDependencies={() => setShowDependencies(prev => !prev)}
                onToggleProgress={() => setShowProgress(prev => !prev)}
                onToggleWeekends={() => setHighlightWeekends(prev => !prev)}
                visibleColumns={visibleColumns}
                onToggleColumn={handleToggleColumn}
                onExportPNG={handleExportPNG}
                onExportPDF={handleExportPDF}
                onShareLink={handleShareLink}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onUndo={undo}
                onRedo={redo}
                onSetBaseline={handleSetBaseline}
                onShowBaselines={handleShowBaselines}
                showBaselines={showBaselines}
                onSearchChange={handleSearchChange}
                onAssigneeChange={handleAssigneeChange}
                onStartDateChange={handleStartDateChange}
                onDueDateChange={handleDueDateChange}
                onGroupBy={handleGroupBy}
                assignees={assignees}
            />
            <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
                <div className="overflow-y-auto" style={{ width: `${listWidth}%` }}>
                    <TaskList
                        data={data}
                        onTogglePhase={handleTogglePhase}
                        onAddTask={handleAddTask}
                        onTaskDoubleClick={handleTaskDoubleClickFromList}
                        visibleColumns={visibleColumns}
                        onTaskDragStart={handleTaskDragStart}
                        onTaskDrop={handleTaskDrop}
                    />
                </div>
                <div
                    ref={dividerRef}
                    className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize flex-shrink-0 relative group"
                    onMouseDown={handleDividerMouseDown}
                >
                    <div className="absolute inset-y-0 -left-1 -right-1" />
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
                        onTaskDateChange={handleTaskDateChange}
                        onTaskDoubleClick={handleTaskDoubleClickFromChart}
                        showDependencies={showDependencies}
                        highlightWeekends={highlightWeekends}
                        showProgress={showProgress}
                        cellWidth={cellWidth}
                        baselines={baselines}
                        showBaselines={showBaselines}
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
            {isEditModalOpen && selectedTask && (
                <EditTaskModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleEditTask}
                    task={selectedTask}
                    allTasks={allTasks}
                />
            )}
        </div>
    );
};