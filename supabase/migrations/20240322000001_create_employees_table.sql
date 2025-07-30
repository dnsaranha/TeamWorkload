CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  weekly_hours INTEGER NOT NULL DEFAULT 40,
  skills JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  estimated_time INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

alter publication supabase_realtime add table employees;
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table tasks;

INSERT INTO employees (name, role, weekly_hours, skills) VALUES
('John Doe', 'Frontend Developer', 40, '["React", "TypeScript"]'),
('Jane Smith', 'UX Designer', 35, '["Figma", "UI Design"]'),
('Mike Johnson', 'Backend Developer', 40, '["Node.js", "Express"]'),
('Sarah Williams', 'Project Manager', 40, '["Agile", "Scrum"]'),
('David Brown', 'QA Engineer', 35, '["Testing", "Automation"]')
ON CONFLICT DO NOTHING;

INSERT INTO projects (name, description, start_date, end_date) VALUES
('Website Redesign', 'Complete redesign of company website', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days'),
('Mobile App', 'New mobile application development', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '60 days'),
('CRM Integration', 'Integration with customer relationship management system', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '45 days'),
('E-commerce Platform', 'Development of new e-commerce platform', CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '90 days')
ON CONFLICT DO NOTHING;

INSERT INTO tasks (name, description, estimated_time, start_date, end_date, project_id, assigned_employee_id)
SELECT 
  'Frontend Development',
  'Develop frontend components for website redesign',
  30,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '5 days',
  p.id,
  e.id
FROM projects p, employees e
WHERE p.name = 'Website Redesign' AND e.name = 'John Doe'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (name, description, estimated_time, start_date, end_date, project_id, assigned_employee_id)
SELECT 
  'UI Design',
  'Create user interface designs for mobile app',
  20,
  CURRENT_DATE + INTERVAL '2 days',
  CURRENT_DATE + INTERVAL '7 days',
  p.id,
  e.id
FROM projects p, employees e
WHERE p.name = 'Mobile App' AND e.name = 'Jane Smith'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (name, description, estimated_time, start_date, end_date, project_id)
SELECT 
  'Database Migration',
  'Migrate existing data to new database structure',
  15,
  CURRENT_DATE + INTERVAL '1 day',
  CURRENT_DATE + INTERVAL '3 days',
  p.id
FROM projects p
WHERE p.name = 'CRM Integration'
ON CONFLICT DO NOTHING;