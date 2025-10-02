-- Add missing foreign key relationships

-- Add foreign key from tasks to employees
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_assigned_employee_id_fkey;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_assigned_employee_id_fkey 
FOREIGN KEY (assigned_employee_id) REFERENCES employees(id) ON DELETE SET NULL;

-- Add foreign key from tasks to projects
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employee_id ON tasks(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- Ensure all tables have workspace_id foreign keys
ALTER TABLE employees 
DROP CONSTRAINT IF EXISTS employees_workspace_id_fkey;

ALTER TABLE employees 
ADD CONSTRAINT employees_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_workspace_id_fkey;

ALTER TABLE projects 
ADD CONSTRAINT projects_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_workspace_id_fkey;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;