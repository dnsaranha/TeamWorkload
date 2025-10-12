import React, { useState, useRef } from 'react';
import type { Phase, Task } from '../../types';
import { CELL_WIDTH, ROW_HEIGHT } from '../../constants';
import { addDays, differenceInDays, format, getDay, getWeek, startOfWeek } from 'date-fns';

type FullTask = Task & { phaseId: string; rowIndex: number };

interface GanttChartProps {
  data: Phase[];
  allTasks: FullTask[];
  startDate: Date;
  dateRange: Date[];
  totalWidth: number;
  taskPositions: Map<number, { left: number; width: number; y: number; }>;
  totalHeight: number;
  onAddDependency: (fromTaskId: number, toTaskId: number) => void;
  onTaskDateChange: (taskId: number, newStartDate: string, newDueDate: string) => void;
    onTaskDoubleClick: (task: Task & { phaseId:string; rowIndex: number }) => void;
    showDependencies: boolean;
    highlightWeekends: boolean;
    showProgress: boolean;
    cellWidth: number;
    baselines: any[];
    showBaselines: boolean;
}

export const GanttChart = React.forwardRef<HTMLDivElement, GanttChartProps>(({
  data,
  allTasks,
  startDate,
  dateRange, 
  totalWidth, 
  taskPositions, 
  totalHeight, 
  onAddDependency,
  onTaskDateChange,
  onTaskDoubleClick,
  showDependencies,
  highlightWeekends,
  showProgress,
  cellWidth,
  baselines,
  showBaselines
}, ref) => {

    const today = new Date();
    const todayOffset = differenceInDays(today, startDate) * cellWidth;
    const chartRef = ref as React.RefObject<HTMLDivElement>;
    const [dependencyDrawingState, setDependencyDrawingState] = useState<{
        isDrawing: boolean;
        startPos: { x: number; y: number } | null;
        endPos: { x: number; y: number } | null;
        sourceTaskId: number | null;
    }>({ isDrawing: false, startPos: null, endPos: null, sourceTaskId: null });

    const [dragState, setDragState] = useState<{
        isDragging: boolean;
        taskId: number | null;
        dragType: 'move' | 'resize-start' | 'resize-end' | null;
        startX: number;
        originalLeft: number;
        originalWidth: number;
    }>({ isDragging: false, taskId: null, dragType: null, startX: 0, originalLeft: 0, originalWidth: 0 });

    // Calculate phase positions for project lines
    const getPhasePosition = (phase: Phase) => {
        if (phase.tasks.length === 0) {
            const left = differenceInDays(new Date(phase.startDate), startDate) * cellWidth;
            const width = (differenceInDays(new Date(phase.dueDate), new Date(phase.startDate)) + 1) * cellWidth;
            return { left: Math.max(0, left), width: Math.max(cellWidth, width) };
        }

        // Find earliest start date and latest due date from tasks
        const taskStartDates = phase.tasks.map(t => new Date(t.startDate));
        const taskDueDates = phase.tasks.map(t => new Date(t.dueDate));
        
        const earliestStart = new Date(Math.min(...taskStartDates.map(d => d.getTime())));
        const latestEnd = new Date(Math.max(...taskDueDates.map(d => d.getTime())));

        const left = differenceInDays(earliestStart, startDate) * cellWidth;
        const width = (differenceInDays(latestEnd, earliestStart) + 1) * cellWidth;

        return { left: Math.max(0, left), width: Math.max(cellWidth, width) };
    };

    const handleStartDrawing = (e: React.MouseEvent, sourceTask: FullTask) => {
        e.stopPropagation();
        const pos = taskPositions.get(sourceTask.id);
        if (!pos || !chartRef.current) return;

        const rect = chartRef.current.getBoundingClientRect();
        const startX = pos.left + pos.width;
        const startY = pos.y;

        setDependencyDrawingState({
            isDrawing: true,
            sourceTaskId: sourceTask.id,
            startPos: { x: startX, y: startY },
            endPos: { x: e.clientX - rect.left + chartRef.current.scrollLeft, y: e.clientY - rect.top + chartRef.current.scrollTop },
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (dependencyDrawingState.isDrawing && chartRef.current) {
            const rect = chartRef.current.getBoundingClientRect();
            setDependencyDrawingState(prev => ({
                ...prev,
                endPos: {
                    x: e.clientX - rect.left + chartRef.current!.scrollLeft,
                    y: e.clientY - rect.top + chartRef.current!.scrollTop
                }
            }));
        }

        if (dragState.isDragging && dragState.taskId && chartRef.current) {
            const rect = chartRef.current.getBoundingClientRect();
            const currentX = e.clientX - rect.left + chartRef.current.scrollLeft;
            const deltaX = currentX - dragState.startX;
            
            const task = allTasks.find(t => t.id === dragState.taskId);
            if (!task) return;

            const pos = taskPositions.get(dragState.taskId);
            if (!pos) return;

            if (dragState.dragType === 'move') {
                const newLeft = Math.max(0, dragState.originalLeft + deltaX);
                const daysOffset = Math.round(newLeft / cellWidth);
                const newStartDate = addDays(dateRange[0], daysOffset);
                const duration = differenceInDays(new Date(task.dueDate), new Date(task.startDate));
                const newDueDate = addDays(newStartDate, duration);
                
                taskPositions.set(dragState.taskId, { ...pos, left: newLeft });
            } else if (dragState.dragType === 'resize-start') {
                const newLeft = Math.max(0, Math.min(dragState.originalLeft + deltaX, dragState.originalLeft + dragState.originalWidth - cellWidth));
                const newWidth = dragState.originalWidth - (newLeft - dragState.originalLeft);
                taskPositions.set(dragState.taskId, { ...pos, left: newLeft, width: newWidth });
            } else if (dragState.dragType === 'resize-end') {
                const newWidth = Math.max(cellWidth, dragState.originalWidth + deltaX);
                taskPositions.set(dragState.taskId, { ...pos, width: newWidth });
            }
        }
    };

    const handleGlobalMouseUp = () => {
        if (dependencyDrawingState.isDrawing) {
            setDependencyDrawingState({ isDrawing: false, startPos: null, endPos: null, sourceTaskId: null });
        }

        if (dragState.isDragging && dragState.taskId) {
            const task = allTasks.find(t => t.id === dragState.taskId);
            const pos = taskPositions.get(dragState.taskId);
            
            if (task && pos) {
                const daysFromStart = Math.round(pos.left / cellWidth);
                const durationDays = Math.round(pos.width / cellWidth);
                
                const newStartDate = addDays(dateRange[0], daysFromStart);
                const newDueDate = addDays(newStartDate, durationDays - 1);
                
                onTaskDateChange(
                    dragState.taskId,
                    format(newStartDate, 'yyyy-MM-dd'),
                    format(newDueDate, 'yyyy-MM-dd')
                );
            }
            
            setDragState({ isDragging: false, taskId: null, dragType: null, startX: 0, originalLeft: 0, originalWidth: 0 });
        }
    };

    const handleTaskMouseUp = (targetTaskId: number) => {
        if (dependencyDrawingState.isDrawing && dependencyDrawingState.sourceTaskId && dependencyDrawingState.sourceTaskId !== targetTaskId) {
            onAddDependency(dependencyDrawingState.sourceTaskId, targetTaskId);
        }
        setDependencyDrawingState({ isDrawing: false, startPos: null, endPos: null, sourceTaskId: null });
    };

    const handleTaskBarMouseDown = (e: React.MouseEvent, task: FullTask, dragType: 'move' | 'resize-start' | 'resize-end') => {
        e.stopPropagation();
        if (!chartRef.current) return;

        const rect = chartRef.current.getBoundingClientRect();
        const pos = taskPositions.get(task.id);
        if (!pos) return;

        setDragState({
            isDragging: true,
            taskId: task.id,
            dragType,
            startX: e.clientX - rect.left + chartRef.current.scrollLeft,
            originalLeft: pos.left,
            originalWidth: pos.width,
        });
    };

    const handleTaskDoubleClick = (e: React.MouseEvent, task: FullTask) => {
        e.stopPropagation();
        onTaskDoubleClick(task);
    };

    return (
        <div
            ref={chartRef}
            className="relative"
            style={{ width: totalWidth, cursor: dependencyDrawingState.isDrawing ? 'crosshair' : dragState.isDragging ? 'grabbing' : 'default' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleGlobalMouseUp}
        >
            {/* Timeline Header */}
            <div className="sticky top-0 z-10 bg-gray-100 border-b-2 border-gray-200">
                <div className="flex" style={{ width: totalWidth }}>
                     {dateRange.reduce((acc: { week: string; width: number }[], date) => {
                        const week = `W${getWeek(date, { weekStartsOn: 1 })}`;
                        if (!acc.find(item => item.week === week)) {
                             const weekStartDate = startOfWeek(date, { weekStartsOn: 1 });
                             let count = 0;
                             for(let i=0; i<7; i++) {
                                if(dateRange.some(d => d.getTime() === addDays(weekStartDate, i).getTime())) {
                                    count++;
                                }
                             }
                            acc.push({ week, width: count * cellWidth });
                        }
                        return acc;
                    }, [] as { week: string; width: number }[]).map(({ week, width }) => (
                        <div key={week} className="text-center font-semibold text-gray-600 border-r" style={{ width }}>
                            {week}
                        </div>
                    ))}
                </div>
                <div className="flex h-[41px]" style={{ width: totalWidth }}>
                    {dateRange.map((date, index) => (
                        <div key={index} className={`flex-shrink-0 text-center border-r ${highlightWeekends && (getDay(date) === 0 || getDay(date) === 6) ? 'bg-gray-200' : 'bg-white'}`} style={{ width: cellWidth }}>
                            <div className="text-xs text-gray-500">{format(date, 'MMM')}</div>
                            <div className="text-sm font-medium text-gray-800">{format(date, 'd')}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Grid and Tasks */}
            <div className="relative" style={{ height: totalHeight }}>
                 {/* Vertical Lines */}
                {dateRange.map((_, index) => (
                    <div key={index} className="absolute top-0 bottom-0 border-l border-gray-200" style={{ left: index * cellWidth, width: cellWidth }}></div>
                ))}

                 {/* Today Marker */}
                {todayOffset >= 0 && todayOffset <= totalWidth && (
                     <div className="absolute top-0 bottom-0 border-l-2 border-red-500 z-20" style={{ left: todayOffset + cellWidth / 2}}>
                        <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                     </div>
                )}

                {/* Phase/Project Lines */}
                {data.map((phase, phaseIndex) => {
                    if (phase.isCollapsed) return null;

                    const phasePosition = getPhasePosition(phase);
                    const phaseRowY = phaseIndex * (ROW_HEIGHT * (phase.tasks.length + 2)) + 6;

                    return (
                        <div
                            key={`phase-${phase.id}`}
                            className="absolute"
                            style={{
                                top: phaseRowY,
                                left: phasePosition.left,
                                height: ROW_HEIGHT - 12,
                                zIndex: 5
                            }}
                        >
                            <div
                                className="relative flex items-center h-full bg-blue-600 rounded-md px-2 text-white text-xs font-bold shadow-md border-2 border-blue-700"
                                style={{ width: phasePosition.width }}
                            >
                                <span className="truncate">{phase.name}</span>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <div className="w-full bg-blue-300 rounded-full h-2">
                                        <div
                                            className="bg-white h-2 rounded-full"
                                            style={{ width: `${phase.progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Task Bars */}
                 {allTasks.map(task => {
                    const pos = taskPositions.get(task.id);
                    if (!pos) return null;
                    
                    // Only render if task is within visible date range
                    const taskStart = new Date(task.startDate);
                    const taskEnd = new Date(task.dueDate);
                    const rangeStart = dateRange[0];
                    const rangeEnd = dateRange[dateRange.length - 1];
                    
                    if (taskEnd < rangeStart || taskStart > rangeEnd) {
                        return null;
                    }
                    
                    return (
                        <div
                            key={task.id}
                            className="absolute group"
                            style={{ top: task.rowIndex * ROW_HEIGHT + 6, left: pos.left, height: ROW_HEIGHT - 12, zIndex: 10 }}
                            onMouseUp={(e) => {
                                e.stopPropagation();
                                handleTaskMouseUp(task.id);
                            }}
                            onDoubleClick={(e) => handleTaskDoubleClick(e, task)}
                        >
                            <div 
                                className={`relative flex items-center h-full bg-${task.color} rounded-md px-2 text-white text-xs font-semibold shadow-sm cursor-grab active:cursor-grabbing`} 
                                style={{ width: pos.width }}
                                onMouseDown={(e) => handleTaskBarMouseDown(e, task, 'move')}
                            >
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        handleTaskBarMouseDown(e, task, 'resize-start');
                                    }}
                                />
                                <span className="truncate pointer-events-none">{task.name}</span>
                                {showProgress && (
                                    <div className="absolute top-0 left-0 h-full bg-black/20 rounded-md" style={{ width: `${task.progress}%` }}></div>
                                )}
                                <div
                                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        handleTaskBarMouseDown(e, task, 'resize-end');
                                    }}
                                />
                                <div
                                    className={`absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-${task.color} rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-20`}
                                    onMouseDown={(e) => handleStartDrawing(e, task)}
                                ></div>
                            </div>
                        </div>
                    )
                 })}

                {/* Baselines */}
                {showBaselines && baselines.map((baseline, baselineIndex) => (
                    baseline.tasks.map((baselineTask: any) => {
                        const task = allTasks.find(t => t.id === baselineTask.id);
                        if (!task) return null;

                        const pos = taskPositions.get(task.id);
                        if (!pos) return null;

                        const baselineLeft = differenceInDays(new Date(baselineTask.startDate), dateRange[0]) * cellWidth;
                        const baselineWidth = (differenceInDays(new Date(baselineTask.dueDate), new Date(baselineTask.startDate)) + 1) * cellWidth;

                        return (
                            <div
                                key={`baseline-${baselineIndex}-${baselineTask.id}`}
                                className="absolute h-2 bg-gray-400 rounded-full"
                                style={{
                                    top: pos.y + ROW_HEIGHT / 2 - 1,
                                    left: baselineLeft,
                                    width: baselineWidth,
                                    zIndex: 5
                                }}
                                title={`Baseline from ${new Date(baseline.date).toLocaleString()}`}
                            />
                        );
                    })
                ))}

                 {/* Dependency Lines */}
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ width: totalWidth, height: totalHeight }}>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                        </marker>
                    </defs>
                    {showDependencies && allTasks.flatMap(task => {
                        const toPos = taskPositions.get(task.id);
                        if (!toPos) return [];

                        return task.dependencies.map(depId => {
                            const fromPos = taskPositions.get(depId);
                            if (!fromPos) return null;

                            const fromX = fromPos.left + fromPos.width;
                            const fromY = fromPos.y;
                            const toX = toPos.left;
                            const toY = toPos.y;

                            const controlPointOffset = Math.abs(toY - fromY) > ROW_HEIGHT ? 30 : 20;
                            const path = `M ${fromX} ${fromY} C ${fromX + controlPointOffset} ${fromY}, ${toX - controlPointOffset} ${toY}, ${toX} ${toY}`;

                            return <path key={`${depId}-${task.id}`} d={path} stroke="#6b7280" strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead)" />;
                        });
                    })}
                     {dependencyDrawingState.isDrawing && dependencyDrawingState.startPos && dependencyDrawingState.endPos && (
                        <line
                            x1={dependencyDrawingState.startPos.x}
                            y1={dependencyDrawingState.startPos.y}
                            x2={dependencyDrawingState.endPos.x}
                            y2={dependencyDrawingState.endPos.y}
                            stroke="#4f46e5"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                        />
                    )}
                </svg>
            </div>
        </div>
    );
});