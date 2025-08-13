ALTER TABLE workload_tasks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
ADD COLUMN IF NOT EXISTS completion_date DATE;

CREATE INDEX IF NOT EXISTS idx_workload_tasks_status ON workload_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workload_tasks_completion_date ON workload_tasks(completion_date);
