ALTER TABLE workload_tasks ADD COLUMN IF NOT EXISTS dependencies TEXT[];
ALTER TABLE workload_tasks ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_workload_tasks_dependencies ON workload_tasks USING GIN (dependencies);