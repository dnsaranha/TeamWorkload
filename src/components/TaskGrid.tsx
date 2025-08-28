import React, { useState, useEffect, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import {
  taskService,
  projectService,
  employeeService,
  type Task,
  type Project,
  type Employee,
} from "@/lib/supabaseClient";

type TaskWithRelations = Task & {
  project: Project | null;
  assigned_employee: Employee | null;
};

const TaskGrid = () => {
  const [rowData, setRowData] = useState<TaskWithRelations[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [columnDefs] = useState<ColDef<TaskWithRelations>[]>([
    { field: "name", headerName: "Task Name", filter: true, editable: true },
    {
      headerName: "Project",
      valueGetter: (params) => params.data?.project?.name,
      valueSetter: (params) => {
        const selectedProject = projects.find(p => p.name === params.newValue);
        if (params.data && selectedProject) {
          params.data.project_id = selectedProject.id;
          params.data.project = selectedProject;
        }
        return true;
      },
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: {
        values: projects.map(p => p.name),
      },
      filter: true,
      editable: true,
    },
    {
      headerName: "Assigned To",
      valueGetter: (params) => params.data?.assigned_employee?.name,
      valueSetter: (params) => {
        const selectedEmployee = employees.find(e => e.name === params.newValue);
        if (params.data && selectedEmployee) {
          params.data.assigned_employee_id = selectedEmployee.id;
          params.data.assigned_employee = selectedEmployee;
        }
        return true;
      },
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: {
        values: employees.map(e => e.name),
      },
      filter: true,
      editable: true,
    },
    { field: "start_date", headerName: "Start Date", filter: true, editable: true, cellEditor: 'agDateCellEditor' },
    { field: "end_date", headerName: "End Date", filter: true, editable: true, cellEditor: 'agDateCellEditor' },
    { field: "estimated_time", headerName: "Est. Hours", filter: true, editable: true, valueParser: 'Number(newValue)' },
    {
      field: "status",
      headerName: "Status",
      filter: true,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['pending', 'in_progress', 'completed'],
      },
    },
  ]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [tasksData, projectsData, employeesData] = await Promise.all([
        taskService.getAll(),
        projectService.getAll(),
        employeeService.getAll(),
      ]);
      setRowData(tasksData as TaskWithRelations[]);
      setProjects(projectsData);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  };

  const onCellValueChanged = useCallback(async (event: any) => {
    try {
      const { data } = event;
      // The valueSetter has already updated the data object with the correct IDs
      await taskService.update(data.id, {
        name: data.name,
        project_id: data.project_id,
        assigned_employee_id: data.assigned_employee_id,
        start_date: data.start_date,
        end_date: data.end_date,
        estimated_time: data.estimated_time,
        status: data.status,
      });
    } catch (error) {
      console.error("Error updating task:", error);
      // Here you might want to revert the change in the grid
    }
  }, []);

  return (
    <div className="ag-theme-alpine" style={{ height: "calc(100vh - 200px)", width: "100%" }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={{
          sortable: true,
          resizable: true,
        }}
        onCellValueChanged={onCellValueChanged}
        readOnlyEdit={true}
        stopEditingWhenCellsLoseFocus={true}
      />
    </div>
  );
};

export default TaskGrid;
