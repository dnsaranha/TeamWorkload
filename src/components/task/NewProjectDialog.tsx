import React from "react";
import { Button } from "../ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

interface NewProjectDialogProps {
  newProject: {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    categoria_estrategica: string;
  };
  onNewProjectChange: (
    field: keyof NewProjectDialogProps["newProject"],
    value: string,
  ) => void;
  strategicCategories: string[];
  onSubmit: () => void;
}

export const NewProjectDialog: React.FC<NewProjectDialogProps> = ({
  newProject,
  onNewProjectChange,
  strategicCategories,
  onSubmit,
}) => {
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogDescription>
          Add a new project to organize your tasks.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="project-name" className="text-right">
            Name
          </Label>
          <Input
            id="project-name"
            value={newProject.name}
            onChange={(e) => onNewProjectChange("name", e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="project-description" className="text-right">
            Description
          </Label>
          <Textarea
            id="project-description"
            value={newProject.description}
            onChange={(e) => onNewProjectChange("description", e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="project-start-date" className="text-right">
            Start Date
          </Label>
          <Input
            id="project-start-date"
            type="date"
            value={newProject.start_date}
            onChange={(e) => onNewProjectChange("start_date", e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="project-end-date" className="text-right">
            End Date
          </Label>
          <Input
            id="project-end-date"
            type="date"
            value={newProject.end_date}
            onChange={(e) => onNewProjectChange("end_date", e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="project-categoria" className="text-right">
            Categoria Estratégica
          </Label>
          <div className="col-span-3">
            <Input
              id="project-categoria"
              list="strategic-categories"
              value={newProject.categoria_estrategica}
              onChange={(e) =>
                onNewProjectChange("categoria_estrategica", e.target.value)
              }
              placeholder="Digite ou selecione uma categoria"
              className="w-full"
            />
            <datalist id="strategic-categories">
              {strategicCategories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" onClick={onSubmit}>
          Create Project
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};