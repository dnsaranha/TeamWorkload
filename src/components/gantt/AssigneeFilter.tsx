import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AssigneeFilterProps {
    assignees: string[];
    onAssigneeChange: (assignee: string | null) => void;
}

export const AssigneeFilter: React.FC<AssigneeFilterProps> = ({ assignees, onAssigneeChange }) => {
    return (
        <Select onValueChange={(value) => onAssigneeChange(value === 'all' ? null : value)}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {assignees.map(assignee => (
                    <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};