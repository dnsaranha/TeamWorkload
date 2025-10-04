export interface GanttTask {
  id: string | number;
  text: string;
  start_date: Date;
  duration: number;
  progress: number;
  parent?: string;
  assignee?: string;
  assignee_name?: string;
  project_id?: string;
  project_name?: string;
  description?: string;
  estimated_time?: number;
  status?: 'pending' | 'in_progress' | 'completed';
  special_marker?: string;
  type?: 'task' | 'project' | 'milestone';
  open?: boolean;
  readonly?: boolean;
}

export interface GanttLink {
  id: string | number;
  source: string;
  target: string;
  type: string;
}

export interface GanttConfig {
  date_format: string;
  xml_date: string;
  duration_unit: string;
  duration_step: number;
  scale_unit: string;
  date_scale: string;
  subscales?: Array<{
    unit: string;
    step: number;
    date: string;
  }>;
  columns?: Array<{
    name: string;
    label: string;
    width?: number;
    align?: string;
    tree?: boolean;
    resize?: boolean;
  }>;
}

export interface GanttData {
  data: GanttTask[];
  links: GanttLink[];
}