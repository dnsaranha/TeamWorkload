import React from 'react';
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"

interface DateFilterProps {
    date: Date | null;
    setDate: (date: Date | null) => void;
    placeholder: string;
}

export const DateFilter: React.FC<DateFilterProps> = ({ date, setDate, placeholder }) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date || undefined}
                    onSelect={(d) => setDate(d || null)}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
};