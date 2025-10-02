-- Add workspace_id to workload tables and create proper relationships
ALTER TABLE workload_projects ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE workload_tasks ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add foreign key relationships for workload_tasks
ALTER TABLE workload_tasks 
DROP CONSTRAINT IF EXISTS workload_tasks_project_id_fkey;

ALTER TABLE workload_tasks 
ADD CONSTRAINT workload_tasks_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES workload_projects(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workload_projects_workspace_id ON workload_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workload_tasks_workspace_id ON workload_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workload_tasks_assigned_employee_id ON workload_tasks(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_workload_tasks_project_id ON workload_tasks(project_id);