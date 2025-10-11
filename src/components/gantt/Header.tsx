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

    const handlePlaceholderClick = () => {
        setOpenMenu(null);
    }

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
                                <MenuItem onClick={handlePlaceholderClick}>Export as PNG</MenuItem>
                                <MenuItem onClick={handlePlaceholderClick}>Export as PDF</MenuItem>
                                <MenuItem onClick={handlePlaceholderClick}>Share Link</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                     <div className="relative">
                        <NavButton onClick={() => handleMenuToggle('baselines')}>Baselines</NavButton>
                        {openMenu === 'baselines' && (
                            <DropdownMenu>
                                <MenuItem onClick={handlePlaceholderClick}>Set Baseline</MenuItem>
                                <MenuItem onClick={handlePlaceholderClick}>Show Baselines</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                     <div className="relative">
                        <NavButton onClick={() => handleMenuToggle('options')}>Options</NavButton>
                        {openMenu === 'options' && (
                            <DropdownMenu>
                                <MenuItem onClick={handlePlaceholderClick}>Show Dependencies</MenuItem>
                                <MenuItem onClick={handlePlaceholderClick}>Show Progress Bar</MenuItem>
                                <MenuItem onClick={handlePlaceholderClick}>Highlight Weekends</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                     <div className="relative">
                        <NavButton onClick={() => handleMenuToggle('columns')}>Columns</NavButton>
                         {openMenu === 'columns' && (
                            <DropdownMenu>
                                <MenuItem onClick={handlePlaceholderClick}>Assignee</MenuItem>
                                <MenuItem onClick={handlePlaceholderClick}>Effort (EH)</MenuItem>
                                <MenuItem onClick={handlePlaceholderClick}>Start Date</MenuItem>
                                <MenuItem onClick={handlePlaceholderClick}>Due Date</MenuItem>
                                <MenuItem onClick={handlePlaceholderClick}>Progress (%)</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                     <div className="relative">
                        <NavButton onClick={() => handleMenuToggle('segments')}>Segments</NavButton>
                        {openMenu === 'segments' && (
                            <DropdownMenu>
                                <MenuItem onClick={handlePlaceholderClick}>Filter tasks...</MenuItem>
                                <MenuItem onClick={handlePlaceholderClick}>Group by assignee</MenuItem>
                                <MenuItem onClick={handlePlaceholderClick}>Group by status</MenuItem>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="p-2 rounded hover:bg-gray-200">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8" /></svg>
                    </button>
                    <button className="p-2 rounded hover:bg-gray-200">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                     <button className="p-2 rounded hover:bg-gray-200">
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
                    <HeaderButton>Assignee</HeaderButton>
                    <HeaderButton>Start</HeaderButton>
                    <HeaderButton>Due</HeaderButton>
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