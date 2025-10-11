import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, SearchIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface HeaderProps {
    onGoToToday: () => void;
    onNavigate: (direction: 'prev' | 'next') => void;
    visibleMonthYear: string;
}

const MenuItem: React.FC<{ onClick?: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
    <li onClick={onClick} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer whitespace-nowrap">
        {children}
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

export const Header: React.FC<HeaderProps> = ({ onGoToToday, onNavigate, visibleMonthYear }) => {
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [scale, setScale] = useState<string>('Days');
    const headerRef = useRef<HTMLElement>(null);

    const handleMenuToggle = (menuName: string) => {
        setOpenMenu(prev => (prev === menuName ? null : menuName));
    };

    const handleScaleChange = (newScale: string) => {
        setScale(newScale);
        setOpenMenu(null);
    };

    const handleExportPNG = () => {
        alert('Export as PNG - Feature coming soon!');
        setOpenMenu(null);
    };

    const handleExportPDF = () => {
        alert('Export as PDF - Feature coming soon!');
        setOpenMenu(null);
    };

    const handleShareLink = () => {
        alert('Share Link - Feature coming soon!');
        setOpenMenu(null);
    };

    const handleSetBaseline = () => {
        alert('Set Baseline - Feature coming soon!');
        setOpenMenu(null);
    };

    const handleShowBaselines = () => {
        alert('Show Baselines - Feature coming soon!');
        setOpenMenu(null);
    };

    const handleToggleDependencies = () => {
        alert('Toggle Dependencies - Feature coming soon!');
        setOpenMenu(null);
    };

    const handleToggleProgressBar = () => {
        alert('Toggle Progress Bar - Feature coming soon!');
        setOpenMenu(null);
    };

    const handleHighlightWeekends = () => {
        alert('Highlight Weekends - Feature coming soon!');
        setOpenMenu(null);
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
        <header ref={headerRef} className="flex-shrink-0 bg-gray-50/95 border-b border-gray-200">
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
                                <MenuItem onClick={handleShowBaselines}>Show Baselines</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                     <div className="relative">
                        <NavButton onClick={() => handleMenuToggle('options')}>Options</NavButton>
                        {openMenu === 'options' && (
                            <DropdownMenu>
                                <MenuItem onClick={handleToggleDependencies}>Show Dependencies</MenuItem>
                                <MenuItem onClick={handleToggleProgressBar}>Show Progress Bar</MenuItem>
                                <MenuItem onClick={handleHighlightWeekends}>Highlight Weekends</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                     <div className="relative">
                        <NavButton onClick={() => handleMenuToggle('columns')}>Columns</NavButton>
                         {openMenu === 'columns' && (
                            <DropdownMenu>
                                <MenuItem onClick={() => handleColumnToggle('Assignee')}>Assignee</MenuItem>
                                <MenuItem onClick={() => handleColumnToggle('Effort (EH)')}>Effort (EH)</MenuItem>
                                <MenuItem onClick={() => handleColumnToggle('Start Date')}>Start Date</MenuItem>
                                <MenuItem onClick={() => handleColumnToggle('Due Date')}>Due Date</MenuItem>
                                <MenuItem onClick={() => handleColumnToggle('Progress (%)')}>Progress (%)</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                     <div className="relative">
                        <NavButton onClick={() => handleMenuToggle('segments')}>Segments</NavButton>
                        {openMenu === 'segments' && (
                            <DropdownMenu>
                                <MenuItem onClick={() => handleSegmentFilter('Filter tasks...')}>Filter tasks...</MenuItem>
                                <MenuItem onClick={() => handleSegmentFilter('Group by assignee')}>Group by assignee</MenuItem>
                                <MenuItem onClick={() => handleSegmentFilter('Group by status')}>Group by status</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="p-2 rounded hover:bg-gray-200" onClick={() => alert('Zoom in - Feature coming soon!')}>
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8" /></svg>
                    </button>
                    <button className="p-2 rounded hover:bg-gray-200" onClick={() => alert('Undo - Feature coming soon!')}>
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                     <button className="p-2 rounded hover:bg-gray-200" onClick={() => alert('Redo - Feature coming soon!')}>
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
                        <input type="text" placeholder="Search tasks..." className="py-1 focus:outline-none" />
                    </div>
                    <HeaderButton onClick={() => alert('Filter by Assignee - Feature coming soon!')}>Assignee</HeaderButton>
                    <HeaderButton onClick={() => alert('Filter by Start Date - Feature coming soon!')}>Start</HeaderButton>
                    <HeaderButton onClick={() => alert('Filter by Due Date - Feature coming soon!')}>Due</HeaderButton>
                </div>
                <div className="flex items-center space-x-4">
                     <div className="flex items-center space-x-1">
                        <button onClick={() => onNavigate('prev')} className="p-2 rounded hover:bg-gray-200" aria-label="Previous month"><ChevronLeftIcon /></button>
                        <span className="font-semibold text-gray-700 w-32 text-center">{visibleMonthYear}</span>
                        <button onClick={() => onNavigate('next')} className="p-2 rounded hover:bg-gray-200" aria-label="Next month"><ChevronRightIcon /></button>
                    </div>
                    <button onClick={onGoToToday} className="px-4 py-2 text-sm font-semibold text-red-600 bg-white border border-red-500 rounded-md hover:bg-red-50">Today</button>
                    <div className="relative">
                        <HeaderButton onClick={() => handleMenuToggle('scale')}>Scale: {scale}</HeaderButton>
                        {openMenu === 'scale' && (
                            <DropdownMenu>
                                <MenuItem onClick={() => handleScaleChange('Days')}>Days</MenuItem>
                                <MenuItem onClick={() => handleScaleChange('Weeks')}>Weeks</MenuItem>
                                <MenuItem onClick={() => handleScaleChange('Months')}>Months</MenuItem>
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