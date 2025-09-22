import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import EditTaskForm from './EditTaskForm';
import ExceptionEditor from './ExceptionEditor';
import ExceptionList from './ExceptionList';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import type { TaskWithRelations, Employee, Project, EditableOccurrence, TaskInstance } from '@/types/tasks';
import { Exception } from '@/lib/supabaseClient';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskWithRelations | TaskInstance | null;
  setTask: (task: any) => void;
  handleUpdate: () => void;
  employees: Employee[];
  projects: Project[];
  source: 'list' | 'calendar';
  editingOccurrences?: EditableOccurrence[];
  onOccurrenceChange?: (date: string, field: string, value: any) => void;
  onUpdateException?: (exceptionData: Partial<Exception>) => Promise<void>;
  isSaving?: boolean;
}

const EditTaskModal = ({
  isOpen,
  onClose,
  task,
  setTask,
  handleUpdate,
  employees,
  projects,
  source,
  editingOccurrences,
  onOccurrenceChange,
  onUpdateException,
  isSaving = false,
}: EditTaskModalProps) => {
  if (!task) return null;

  const isRecurring = task.repeats_weekly ?? false;
  const instanceDate = (task as TaskInstance)?.instanceDate;

  const renderContent = () => {
    if (source === 'calendar' && isRecurring) {
      return (
        <>
          {instanceDate && onUpdateException && (
            <ExceptionEditor
              task={task as TaskInstance}
              instanceDate={instanceDate}
              employees={employees}
              onUpdateException={onUpdateException}
              isSaving={isSaving}
            />
          )}
          <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger>Edit Entire Task Series</AccordionTrigger>
              <AccordionContent>
                <EditTaskForm
                  task={task as TaskWithRelations}
                  setTask={setTask}
                  employees={employees}
                  projects={projects}
                  isRecurring={isRecurring}
                  source={source}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      );
    }

    return (
      <>
        <EditTaskForm
          task={task as TaskWithRelations}
          setTask={setTask}
          employees={employees}
          projects={projects}
          isRecurring={isRecurring}
          source={source}
        />
        {isRecurring && editingOccurrences && onOccurrenceChange && (
          <ExceptionList
            occurrences={editingOccurrences}
            onOccurrenceChange={onOccurrenceChange}
            employees={employees}
            parentTask={task as TaskWithRelations}
          />
        )}
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            {source === 'calendar' && isRecurring
              ? "Edit this specific occurrence or update the entire series below."
              : "Update task details and time estimates."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="p-4 space-y-4">
            {renderContent()}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" onClick={handleUpdate} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Update Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskModal;
