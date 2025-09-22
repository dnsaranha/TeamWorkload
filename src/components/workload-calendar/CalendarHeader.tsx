import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDate } from "./utils";

interface CalendarHeaderProps {
  view: "weekly" | "monthly";
  setView: (view: "weekly" | "monthly") => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  navigateDate: (direction: "prev" | "next") => void;
  currentDate: Date;
  dates: Date[];
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  view,
  setView,
  searchTerm,
  setSearchTerm,
  navigateDate,
  currentDate,
  dates,
}) => {
  return (
    <div className="p-6 border-b border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Workload Calendar
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setView("weekly")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                view === "weekly"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setView("monthly")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                view === "monthly"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10"
            />
          </div>
          <button
            onClick={() => navigateDate("prev")}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-medium text-gray-900">
            {view === "weekly"
              ? `Week of ${formatDate(dates[0])}`
              : currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
          </span>
          <button
            onClick={() => navigateDate("next")}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-gray-600">Under-utilized (&lt;50%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span className="text-gray-600">Optimal (50-100%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
          <span className="text-gray-600">Overloaded (&gt;100%)</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
