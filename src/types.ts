export type TaskStatus = 'A Fazer' | 'Em Progresso' | 'Concluído';

export interface Task {
  id: string;
  name: string;
  startDate: string; // Formato: "AAAA-MM-DD"
  endDate: string;   // Formato: "AAAA-MM-DD"
  progress: number;  // Um número de 0 a 100
  dependencies: string[]; // Um array de IDs de outras tarefas
  status: TaskStatus;     // 'A Fazer', 'Em Progresso', 'Concluído'
  responsible: string;
}
