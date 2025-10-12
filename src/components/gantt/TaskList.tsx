import React from "react";
import type { Phase } from "../../types";
import { PlusIcon, CheckCircleIcon, UserCircleIcon, MinusIcon } from "./Icons";

interface TaskListProps {
  data: Phase[];
  onTogglePhase: (phaseId: string) => void;
  onTaskDragStart?: (taskId: number, phaseId: string) => void;
  onTaskDrop?: (taskId: number, newPhaseId: string, newIndex: number) => void;
  onAddTask: (phaseId: string) => void;
  onTaskDoubleClick: (taskId: number, phaseId: string) => void;
    visibleColumns: {
        assignee: boolean;
        effort: boolean;
        startDate: boolean;
        dueDate: boolean;
        progress: boolean;
    };
}

const TaskListHeader: React.FC<{ visibleColumns: TaskListProps['visibleColumns'] }> = ({ visibleColumns }) => (
    <div className="sticky top-0 z-10 grid grid-cols-12 gap-2 px-4 py-2 font-semibold text-gray-500 bg-gray-100 border-b-2 border-gray-200 h-[41px]">
        <div className="col-span-5 flex items-center">TASK</div>
        {visibleColumns.assignee && <div className="col-span-2 flex items-center">ASSIGNEE</div>}
        {visibleColumns.effort && <div className="col-span-1 flex items-center">EH</div>}
        {visibleColumns.startDate && <div className="col-span-2 flex items-center">START</div>}
        {visibleColumns.dueDate && <div className="col-span-1 flex items-center">DUE</div>}
        {visibleColumns.progress && <div className="col-span-1 flex items-center">%</div>}
    </div>
);

const PhaseRow: React.FC<{ phase: Phase, onToggle: () => void, onAddTask: () => void }> = ({ phase, onToggle, onAddTask }) => (
    <div
        className="grid grid-cols-12 gap-2 px-2 py-2 font-bold text-gray-800 bg-blue-50 border-b border-t h-[41px] cursor-pointer select-none"
        onClick={onToggle}
        role="button"
        aria-expanded={!phase.isCollapsed}
    >
        <div className="col-span-5 flex items-center space-x-2 w-[307px] h-[30px]">
            {phase.isCollapsed ? <PlusIcon className="text-gray-500 w-4 h-4" /> : <MinusIcon className="text-gray-500" />}
            <span className="font-semibold text-blue-700 w-[213px] h-[26px]">{phase.name}</span>
        </div>
        <div className="col-span-2 w-[84px] h-[28px]"></div>
        <div className="col-span-1 flex items-center font-semibold text-blue-700">{phase.totalEffort}</div>
        <div className="col-span-2 flex items-center font-semibold text-blue-700">{phase.startDate}</div>
        <div className="col-span-1 flex items-center font-semibold text-blue-700">{phase.dueDate}</div>
        <div className="col-span-1 flex items-center">
            <div className="w-full bg-blue-200 rounded-full h-4">
                <div
                    className="bg-blue-500 h-4 rounded-full text-white text-center text-[10px] leading-4"
                    style={{ width: `${phase.progress}%` }}
                >
                    {phase.progress}%
                </div>
            </div>
        </div>
    </div>
);

const TaskRow: React.FC<{ task: any, onDoubleClick: () => void, visibleColumns: TaskListProps['visibleColumns'], draggable?: boolean, onDragStart?: (e: React.DragEvent) => void, onDragOver?: (e: React.DragEvent) => void, onDrop?: (e: React.DragEvent) => void }> = ({ task, onDoubleClick, visibleColumns, draggable, onDragStart, onDragOver, onDrop }) => (
    <div
        className="grid grid-cols-12 gap-2 px-2 py-2 items-center hover:bg-blue-50 h-[41px] cursor-move"
        onDoubleClick={onDoubleClick}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
    >
        <div className="col-span-5 flex items-center space-x-2">
            <CheckCircleIcon className="text-green-500 w-4 h-4" />
            <span className="text-gray-700 truncate">{task.name}</span>
        </div>
        {visibleColumns.assignee && (
            <div className="col-span-2 flex items-center text-gray-500">
                {task.assignee !== 'Unassigned' ? task.assignee : <span className="text-gray-400">Unassigned</span>}
            </div>
        )}
        {visibleColumns.effort && <div className="col-span-1 flex items-center text-gray-500">{task.effort}</div>}
        {visibleColumns.startDate && (
            <div className="col-span-2 flex items-center text-gray-500">
                {new Date(task.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
            </div>
        )}
        {visibleColumns.dueDate && (
            <div className="col-span-1 flex items-center text-gray-500">
                {new Date(task.dueDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
            </div>
        )}
        {visibleColumns.progress && (
            <div className="col-span-1 flex items-center">
                <div className="w-full bg-green-200 rounded-full h-4">
                    <div
                        className="bg-green-500 h-4 rounded-full text-white text-center text-[10px] leading-4"
                        style={{ width: `${task.progress}%` }}
                    >
                        {task.progress}%
                    </div>
                </div>
                <UserCircleIcon className="ml-2 text-gray-300 w-5 h-5" />
            </div>
        )}
    </div>
);

export const TaskList: React.FC<TaskListProps> = ({
  data,
  onTogglePhase,
  onTaskDragStart,
  onTaskDrop,
  onAddTask,
  onTaskDoubleClick,
  visibleColumns,
}) => {
    const [draggedTask, setDraggedTask] = React.useState<{
        taskId: number;
        phaseId: string;
    } | null>(null);

    const handleDragStart = (
        e: React.DragEvent,
        taskId: number,
        phaseId: string,
    ) => {
        setDraggedTask({ taskId, phaseId });
        onTaskDragStart?.(taskId, phaseId);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (
        e: React.DragEvent,
        targetPhaseId: string,
        targetIndex: number,
    ) => {
        e.preventDefault();
        if (draggedTask) {
            onTaskDrop?.(draggedTask.taskId, targetPhaseId, targetIndex);
            setDraggedTask(null);
        }
    };

    return (
        <div className="w-full text-xs">
            <TaskListHeader visibleColumns={visibleColumns} />
            <div className="divide-y divide-gray-200">
                {data.map((phase) => (
                    <div key={phase.id}>
                        <PhaseRow phase={phase} onToggle={() => onTogglePhase(phase.id)} onAddTask={() => onAddTask(phase.id)} />
                        {!phase.isCollapsed && (
                            <>
                                {phase.tasks.map((task, taskIndex) => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id, phase.id)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, phase.id, taskIndex)}
                                        onDoubleClick={() => onTaskDoubleClick(task.id, phase.id)}
                                        visibleColumns={visibleColumns}
                                    />
                                ))}
                                <div className="grid grid-cols-12 gap-2 px-2 py-2 items-center h-[41px]">
                                    <div className="col-span-5 flex items-center">
                                        <button onClick={() => onAddTask(phase.id)} className="flex items-center space-x-1 text-blue-600 hover:underline">
                                            <PlusIcon className="w-4 h-4" />
                                            <span>Add task</span>
                                        </button>
                                        <button className="ml-4 flex items-center space-x-1 text-blue-600 hover:underline">
                                            <PlusIcon className="w-4 h-4" />
                                            <span>Add section</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};