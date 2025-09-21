-- Add an 'exceptions' column to the 'workload_tasks' table.
-- This column will store an array of objects, where each object represents
-- an exception to a recurring task's schedule.
-- For example: [{ "date": "2025-10-10", "assigned_employee_id": "uuid", "is_removed": true }]
ALTER TABLE public.workload_tasks
ADD COLUMN exceptions jsonb;
