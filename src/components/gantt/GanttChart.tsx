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
}

export const GanttChart: React.FC<GanttChartProps> = ({ data, allTasks, startDate, dateRange, totalWidth, taskPositions, totalHeight, onAddDependency }) => {

    const today = new Date();
    const todayOffset = differenceInDays(today, startDate) * CELL_WIDTH;
    const chartRef = useRef<HTMLDivElement>(null);
    const [dependencyDrawingState, setDependencyDrawingState] = useState<{
        isDrawing: boolean;
        startPos: { x: number; y: number } | null;
        endPos: { x: number; y: number } | null;
        sourceTaskId: number | null;
    }>({ isDrawing: false, startPos: null, endPos: null, sourceTaskId: null });

    // Calculate phase positions for project lines
    const getPhasePosition = (phase: Phase) => {
        const phaseStartDate = new Date(phase.tasks[0]?.startDate || phase.startDate);
        const phaseEndDate = new Date(phase.tasks[phase.tasks.length - 1]?.dueDate || phase.dueDate);

        const left = differenceInDays(phaseStartDate, startDate) * CELL_WIDTH;
        const width = (differenceInDays(phaseEndDate, phaseStartDate) + 1) * CELL_WIDTH;

        return { left: Math.max(0, left), width: Math.max(CELL_WIDTH, width) };
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
        if (!dependencyDrawingState.isDrawing || !chartRef.current) return;
        const rect = chartRef.current.getBoundingClientRect();
        setDependencyDrawingState(prev => ({
            ...prev,
            endPos: {
                x: e.clientX - rect.left + chartRef.current.scrollLeft,
                y: e.clientY - rect.top + chartRef.current.scrollTop
            }
        }));
    };

    const handleGlobalMouseUp = () => {
        if (dependencyDrawingState.isDrawing) {
            setDependencyDrawingState({ isDrawing: false, startPos: null, endPos: null, sourceTaskId: null });
        }
    };

    const handleTaskMouseUp = (targetTaskId: number) => {
        if (dependencyDrawingState.isDrawing && dependencyDrawingState.sourceTaskId && dependencyDrawingState.sourceTaskId !== targetTaskId) {
            onAddDependency(dependencyDrawingState.sourceTaskId, targetTaskId);
        }
        setDependencyDrawingState({ isDrawing: false, startPos: null, endPos: null, sourceTaskId: null });
    };

    return (
        <div
            ref={chartRef}
            className="relative"
            style={{ width: totalWidth, cursor: dependencyDrawingState.isDrawing ? 'crosshair' : 'default' }}
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
                            acc.push({ week, width: count * CELL_WIDTH });
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
                        <div key={index} className={`flex-shrink-0 text-center border-r ${getDay(date) === 0 || getDay(date) === 6 ? 'bg-gray-200' : 'bg-white'}`} style={{ width: CELL_WIDTH }}>
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
                    <div key={index} className="absolute top-0 bottom-0 border-l border-gray-200" style={{ left: index * CELL_WIDTH, width: CELL_WIDTH }}></div>
                ))}

                 {/* Today Marker */}
                {todayOffset >= 0 && todayOffset <= totalWidth && (
                     <div className="absolute top-0 bottom-0 border-l-2 border-red-500 z-20" style={{ left: todayOffset + CELL_WIDTH / 2}}>
                        <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                     </div>
                )}

                {/* Phase/Project Lines */}
                {data.map((phase, phaseIndex) => {
                    if (phase.isCollapsed) return null;

                    const phasePosition = getPhasePosition(phase);
                    const phaseRowY = phaseIndex * (ROW_HEIGHT * (phase.tasks.length + 2)) + 6; // Position at phase header level

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
                    return (
                        <div
                            key={task.id}
                            className="absolute group"
                            style={{ top: task.rowIndex * ROW_HEIGHT + 6, left: pos.left, height: ROW_HEIGHT - 12, zIndex: 10 }}
                            onMouseUp={(e) => {
                                e.stopPropagation();
                                handleTaskMouseUp(task.id);
                            }}
                        >
                            <div className={`relative flex items-center h-full bg-${task.color} rounded-md px-2 text-white text-xs font-semibold shadow-sm`} style={{ width: pos.width }}>
                                <span className="truncate">{task.name}</span>
                                <div
                                    className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-${task.color} rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity`}
                                    onMouseDown={(e) => handleStartDrawing(e, task)}
                                ></div>
                            </div>
                        </div>
                    )
                 })}

                 {/* Dependency Lines */}
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ width: totalWidth, height: totalHeight }}>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                        </marker>
                    </defs>
                    {allTasks.flatMap(task => {
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
};