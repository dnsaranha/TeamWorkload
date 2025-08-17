-- Add 'trabalha_fim_de_semana' to 'employees' table
ALTER TABLE public.employees
ADD COLUMN trabalha_fim_de_semana BOOLEAN DEFAULT FALSE;

-- Add 'categoria_estrategica' and 'special_marker' to 'workload_projects' table
ALTER TABLE public.workload_projects
ADD COLUMN categoria_estrategica TEXT,
ADD COLUMN special_marker TEXT;

-- Add new columns to 'workload_tasks' table
ALTER TABLE public.workload_tasks
ADD COLUMN repeats_weekly BOOLEAN DEFAULT FALSE,
ADD COLUMN repeat_days TEXT[],
ADD COLUMN hours_per_day NUMERIC,
ADD COLUMN special_marker TEXT;
