import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { EditableOccurrence, Employee, TaskWithRelations, TaskInstance } from '@/types/tasks';

interface ExceptionListProps {
  occurrences: EditableOccurrence[];
  onOccurrenceChange: (date: string, field: string, value: any) => void;
  employees: Employee[];
  parentTask: TaskWithRelations | TaskInstance;
}

const ExceptionList = ({ occurrences, onOccurrenceChange, employees, parentTask }: ExceptionListProps) => {
  return (
    <div className="col-span-4 mt-4 pt-4 border-t">
      <h4 className="text-md font-semibold mb-2">Gerenciar Ocorrências Futuras</h4>
      <p className="text-sm text-muted-foreground mb-4">
        Ajuste ou remova ocorrências individuais. As alterações aqui serão salvas como exceções à regra de repetição.
      </p>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {occurrences.length > 0 ? (
          occurrences.map((occ) => (
            <div
              key={occ.date}
              className={`p-3 rounded-md transition-colors ${
                occ.is_removed ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
              } border`}
            >
              <div className="flex justify-between items-center mb-2">
                <Label className="font-semibold">
                  {format(new Date(occ.date + "T00:00:00"), "EEE, dd/MM/yyyy")}
                </Label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOccurrenceChange(occ.date, 'is_removed', !occ.is_removed)}
                  className="h-7 w-7"
                >
                  <Trash2 className={`h-4 w-4 ${occ.is_removed ? 'text-red-500' : ''}`} />
                </Button>
              </div>
              {!occ.is_removed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <Label className="text-xs">Horas</Label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder={occ.original.estimated_time?.toString() || '0'}
                      value={occ.override.estimated_time ?? ''}
                      onChange={(e) => onOccurrenceChange(occ.date, 'estimated_time', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Responsável</Label>
                    <Select
                      value={occ.override.assigned_employee_id ?? occ.original.assigned_employee_id ?? 'none'}
                      onValueChange={(value) => onOccurrenceChange(occ.date, 'assigned_employee_id', value === 'none' ? undefined : value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Padrão ({employees.find(e => e.id === parentTask.assigned_employee_id)?.name || 'Não atribuído'})
                        </SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-center text-gray-500 py-4">
            Nenhuma ocorrência futura encontrada para esta tarefa no período selecionado.
          </p>
        )}
      </div>
    </div>
  );
};

export default ExceptionList;
