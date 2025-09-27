import React from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { X } from "lucide-react";
import { Project, Employee } from "@/lib/supabaseClient";

interface FilterPanelProps {
  filters: {
    project: string;
    employee: string;
    status: string;
  };
  onFilterChange: (
    filter: keyof FilterPanelProps["filters"],
    value: string,
  ) => void;
  projects: Project[];
  employees: Employee[];
  projectSearchTerm: string;
  onProjectSearchTermChange: (term: string) => void;
  onClearFilters: () => void;
  onHideFilters: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  projects,
  employees,
  projectSearchTerm,
  onProjectSearchTermChange,
  onClearFilters,
  onHideFilters,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          <Button variant="ghost" size="sm" onClick={onHideFilters}>
            <X size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="project-filter">Project</Label>
            <Select
              value={filters.project}
              onValueChange={(value) => onFilterChange("project", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <Input
                  placeholder="Search projects..."
                  value={projectSearchTerm}
                  onChange={(e) => onProjectSearchTermChange(e.target.value)}
                  className="w-full mb-2"
                />
                <SelectItem value="all">All Projects</SelectItem>
                {projects
                  .filter((project) =>
                    project.name
                      .toLowerCase()
                      .includes(projectSearchTerm.toLowerCase()),
                  )
                  .map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="employee-filter">Employee</Label>
            <Select
              value={filters.employee}
              onValueChange={(value) => onFilterChange("employee", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status-filter">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => onFilterChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        <div className="flex flex-wrap gap-2 mt-4">
          {filters.project !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Project: {projects.find((p) => p.id === filters.project)?.name}
              <X
                size={12}
                className="cursor-pointer"
                onClick={() => onFilterChange("project", "all")}
              />
            </Badge>
          )}
          {filters.employee !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Employee:{" "}
              {employees.find((e) => e.id === filters.employee)?.name}
              <X
                size={12}
                className="cursor-pointer"
                onClick={() => onFilterChange("employee", "all")}
              />
            </Badge>
          )}
          {filters.status !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {filters.status}
              <X
                size={12}
                className="cursor-pointer"
                onClick={() => onFilterChange("status", "all")}
              />
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};