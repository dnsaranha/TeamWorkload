import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, SearchIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { AssigneeFilter } from './AssigneeFilter';
import { DateFilter } from './DateFilter';

interface HeaderProps {
    onGoToToday: () => void;
    onNavigate: (direction: 'prev' | 'next') => void;
    visibleMonthYear: string;
    options: {
        showDependencies: boolean;
        showProgress: boolean;
        highlightWeekends: boolean;
    };
    onToggleDependencies: () => void;
    onToggleProgress: () => void;
    onToggleWeekends: () => void;
    visibleColumns: {
        assignee: boolean;
        effort: boolean;
        startDate: boolean;
        dueDate: boolean;
        progress: boolean;
    };
    onToggleColumn: (column: keyof HeaderProps['visibleColumns']) => void;
    onExportPNG: () => void;
    onExportPDF: () => void;
    onShareLink: () => void;
    viewMode: 'day' | 'week' | 'month';
    onSetViewMode: (mode: 'day' | 'week' | 'month') => void;
    onUndo: () => void;
    onRedo: () => void;
    onSetBaseline: () => void;
    onShowBaselines: () => void;
    showBaselines: boolean;
    onSearchChange: (term: string) => void;
    onAssigneeChange: (assignee: string | null) => void;
    onStartDateChange: (date: Date | null) => void;
    onDueDateChange: (date: Date | null) => void;
    onGroupBy: (field: string | null) => void;
    assignees: string[];
}

const MenuItem: React.FC<{ onClick?: () => void; children: React.ReactNode; active?: boolean }> = ({ onClick, children, active }) => (
    <li onClick={onClick} className={`px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer whitespace-nowrap flex items-center justify-between ${active ? 'bg-gray-200' : ''}`}>
        {children}
        {active && <span className="text-green-500">✓</span>}
    </li>
);

const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="absolute top-full mt-2 w-auto bg-white rounded-md shadow-lg z-20 border border-gray-200">
        <ul className="py-1">
            {children}
        </ul>
    </div>
);

const NavButton: React.FC<{ children: React.ReactNode, onClick: () => void }> = ({ children, onClick }) => (
    <button onClick={onClick} className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-md">
        <span>{children}</span>
        <ChevronDownIcon />
    </button>
);

export const Header: React.FC<HeaderProps> = ({
    onGoToToday,
    onNavigate,
    visibleMonthYear,
    options,
    onToggleDependencies,
    onToggleProgress,
    onToggleWeekends,
    visibleColumns,
    onToggleColumn,
    onExportPNG,
    onExportPDF,
    onShareLink,
    viewMode,
    onSetViewMode,
    onUndo,
    onRedo,
    onSetBaseline,
    onShowBaselines,
    showBaselines,
    onSearchChange,
    onAssigneeChange,
    onStartDateChange,
    onDueDateChange,
    onGroupBy,
    assignees
}) => {
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const headerRef = useRef<HTMLElement>(null);


    const handleMenuToggle = (menuName: string) => {
        setOpenMenu(prev => (prev === menuName ? null : menuName));
    };

    const handleScaleChange = (newScale: 'day' | 'week' | 'month') => {
        onSetViewMode(newScale);
        setOpenMenu(null);
    };

    const handleExportPNG = () => {
        onExportPNG();
        setOpenMenu(null);
    };

    const handleExportPDF = () => {
        onExportPDF();
        setOpenMenu(null);
    };

    const handleShareLink = () => {
        onShareLink();
        setOpenMenu(null);
    };

    const handleSetBaseline = () => {
        onSetBaseline();
        setOpenMenu(null);
    };

    const handleShowBaselines = () => {
        onShowBaselines();
    };

    const handleToggleDependencies = () => {
        onToggleDependencies();
        // setOpenMenu(null); // Keep menu open to show status
    };

    const handleToggleProgressBar = () => {
        onToggleProgress();
        // setOpenMenu(null);
    };

    const handleHighlightWeekends = () => {
        onToggleWeekends();
        // setOpenMenu(null);
    };

    const handleColumnToggle = (column: string) => {
        alert(`Toggle ${column} column - Feature coming soon!`);
        setOpenMenu(null);
    };

    const handleSegmentFilter = (filter: string) => {
        alert(`${filter} - Feature coming soon!`);
        setOpenMenu(null);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
                setOpenMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header ref={headerRef} className="flex-shrink-0 bg-gray-50/95 border-b border-gray-200 z-20 relative">
            <div className="flex items-center justify-between p-2 h-14">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <NavButton onClick={() => handleMenuToggle('export')}>Export & Share</NavButton>
                        {openMenu === 'export' && (
                            <DropdownMenu>
                                <MenuItem onClick={handleExportPNG}>Export as PNG</MenuItem>
                                <MenuItem onClick={handleExportPDF}>Export as PDF</MenuItem>
                                <MenuItem onClick={handleShareLink}>Share Link</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                     <div className="relative">
                        <NavButton onClick={() => handleMenuToggle('baselines')}>Baselines</NavButton>
                        {openMenu === 'baselines' && (
                            <DropdownMenu>
                                <MenuItem onClick={handleSetBaseline}>Set Baseline</MenuItem>
                                <MenuItem onClick={handleShowBaselines} active={showBaselines}>Show Baselines</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                     <div className="relative">
                        <NavButton onClick={() => handleMenuToggle('options')}>Options</NavButton>
                        {openMenu === 'options' && (
                            <DropdownMenu>
                                <MenuItem onClick={handleToggleDependencies} active={options.showDependencies}>Show Dependencies</MenuItem>
                                <MenuItem onClick={handleToggleProgressBar} active={options.showProgress}>Show Progress Bar</MenuItem>
                                <MenuItem onClick={handleHighlightWeekends} active={options.highlightWeekends}>Highlight Weekends</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                     <div className="relative">
                        <NavButton onClick={() => handleMenuToggle('columns')}>Columns</NavButton>
                         {openMenu === 'columns' && (
                            <DropdownMenu>
                                <MenuItem onClick={() => onToggleColumn('assignee')} active={visibleColumns.assignee}>Assignee</MenuItem>
                                <MenuItem onClick={() => onToggleColumn('effort')} active={visibleColumns.effort}>Effort (EH)</MenuItem>
                                <MenuItem onClick={() => onToggleColumn('startDate')} active={visibleColumns.startDate}>Start Date</MenuItem>
                                <MenuItem onClick={() => onToggleColumn('dueDate')} active={visibleColumns.dueDate}>Due Date</MenuItem>
                                <MenuItem onClick={() => onToggleColumn('progress')} active={visibleColumns.progress}>Progress (%)</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                     <div className="relative">
                        <NavButton onClick={() => handleMenuToggle('segments')}>Segments</NavButton>
                        {openMenu === 'segments' && (
                            <DropdownMenu>
                                <MenuItem onClick={() => onGroupBy(null)}>None</MenuItem>
                                <MenuItem onClick={() => onGroupBy('assignee')}>Group by assignee</MenuItem>
                                <MenuItem onClick={() => onGroupBy('status')}>Group by status</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="p-2 rounded hover:bg-gray-200" onClick={onUndo}>
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button className="p-2 rounded hover:bg-gray-200" onClick={onRedo}>
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
             <div className="flex items-center justify-between p-2 border-t border-gray-200 h-14">
                <div className="flex items-center space-x-2">
                    <div className="flex items-center border rounded-md bg-white">
                         <div className="p-2 text-gray-400">
                           <SearchIcon />
                        </div>
                        <input type="text" placeholder="Search tasks..." className="py-1 focus:outline-none" onChange={(e) => onSearchChange(e.target.value)} />
                    </div>
                    <AssigneeFilter assignees={assignees} onAssigneeChange={onAssigneeChange} />
                    <DateFilter date={null} setDate={onStartDateChange} placeholder="Start Date" />
                    <DateFilter date={null} setDate={onDueDateChange} placeholder="Due Date" />
                </div>
                <div className="flex items-center space-x-4">
                     <div className="flex items-center space-x-1">
                        <button onClick={() => onNavigate('prev')} className="p-2 rounded hover:bg-gray-200" aria-label="Previous month"><ChevronLeftIcon /></button>
                        <span className="font-semibold text-gray-700 w-32 text-center">{visibleMonthYear}</span>
                        <button onClick={() => onNavigate('next')} className="p-2 rounded hover:bg-gray-200" aria-label="Next month"><ChevronRightIcon /></button>
                    </div>
                    <button onClick={onGoToToday} className="px-4 py-2 text-sm font-semibold text-red-600 bg-white border border-red-500 rounded-md hover:bg-red-50">Today</button>
                    <div className="relative">
                        <HeaderButton onClick={() => handleMenuToggle('scale')}>Scale: {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}</HeaderButton>
                        {openMenu === 'scale' && (
                            <DropdownMenu>
                                <MenuItem onClick={() => handleScaleChange('day')}>Day</MenuItem>
                                <MenuItem onClick={() => handleScaleChange('week')}>Week</MenuItem>
                                <MenuItem onClick={() => handleScaleChange('month')}>Month</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
             </div>
        </header>
    );
};

const HeaderButton: React.FC<{ children: React.ReactNode; onClick?: () => void; }> = ({ children, onClick }) => (
     <button onClick={onClick} className="flex items-center space-x-1 px-3 py-1.5 text-gray-600 border border-gray-300 bg-white rounded-md hover:bg-gray-100">
        <span>{children}</span>
        <ChevronDownIcon />
    </button>
);