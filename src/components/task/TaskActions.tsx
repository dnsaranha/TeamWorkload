import React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogTrigger,
} from "../ui/dialog";
import { Download, Upload, Plus, Grid3X3, Filter } from "lucide-react";

interface TaskActionsProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onToggleFilters: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleDragDropGrid: () => void;
  onNewProject: () => void;
  onNewTask: () => void;
}

export const TaskActions: React.FC<TaskActionsProps> = ({
  searchTerm,
  onSearchTermChange,
  onToggleFilters,
  onExport,
  onImport,
  onToggleDragDropGrid,
  onNewProject,
  onNewTask,
}) => {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search tasks..."
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        className="w-64"
      />
      <Button
        variant="outline"
        onClick={onToggleFilters}
        className="flex items-center gap-2"
      >
        <Filter size={16} />
        Filters
      </Button>
      <Button
        variant="outline"
        onClick={onExport}
        className="flex items-center gap-2"
      >
        <Download size={16} />
        Export
      </Button>
      <Button
        variant="outline"
        onClick={onToggleDragDropGrid}
        className="flex items-center gap-2"
      >
        <Grid3X3 size={16} />
        Drag & Drop Grid
      </Button>
      <div className="relative">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onImport}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="file-import"
        />
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => document.getElementById("file-import")?.click()}
        >
          <Upload size={16} />
          Import
        </Button>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={onNewProject}
          >
            <Plus size={16} />
            New Project
          </Button>
        </DialogTrigger>
      </Dialog>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            className="flex items-center gap-2"
            data-testid="create-new-task-button"
            onClick={onNewTask}
          >
            <Plus size={16} />
            Create New Task
          </Button>
        </DialogTrigger>
      </Dialog>
    </div>
  );
};