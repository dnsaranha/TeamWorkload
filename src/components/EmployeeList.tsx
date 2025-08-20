import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Download,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { employeeService, type Employee } from "@/lib/supabaseClient";

const EmployeeList = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  // Form state for new/edit employee
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    weekly_hours: 40,
    skills: "",
    trabalha_fim_de_semana: false,
  });

  // Load employees from database
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getAll();
      setEmployees(data);
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === "checkbox"
          ? checked
          : name === "weekly_hours"
            ? parseInt(value) || 0
            : value,
    });
  };

  const handleAddEmployee = async () => {
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        alert("Name is required");
        return;
      }
      if (!formData.role.trim()) {
        alert("Role is required");
        return;
      }
      if (formData.weekly_hours <= 0) {
        alert("Weekly hours must be greater than 0");
        return;
      }

      const skillsArray = formData.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill !== "");

      const newEmployee = await employeeService.create({
        name: formData.name.trim(),
        role: formData.role.trim(),
        weekly_hours: formData.weekly_hours,
        skills: skillsArray,
        trabalha_fim_de_semana: formData.trabalha_fim_de_semana,
      });

      setEmployees([...employees, newEmployee]);
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding employee:", error);
      alert("Failed to add employee. Please try again.");
    }
  };

  const handleEditEmployee = async () => {
    if (!currentEmployee) return;

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        alert("Name is required");
        return;
      }
      if (!formData.role.trim()) {
        alert("Role is required");
        return;
      }
      if (formData.weekly_hours <= 0) {
        alert("Weekly hours must be greater than 0");
        return;
      }

      const skillsArray = formData.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill !== "");

      const updatedEmployee = await employeeService.update(currentEmployee.id, {
        name: formData.name.trim(),
        role: formData.role.trim(),
        weekly_hours: formData.weekly_hours,
        skills: skillsArray,
        trabalha_fim_de_semana: formData.trabalha_fim_de_semana,
      });

      const updatedEmployees = employees.map((emp) =>
        emp.id === currentEmployee.id ? updatedEmployee : emp,
      );

      setEmployees(updatedEmployees);
      resetForm();
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating employee:", error);
      alert("Failed to update employee. Please try again.");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await employeeService.delete(id);
      setEmployees(employees.filter((emp) => emp.id !== id));
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  const openEditDialog = (employee: Employee) => {
    setCurrentEmployee(employee);
    setFormData({
      name: employee.name,
      role: employee.role,
      weekly_hours: employee.weekly_hours,
      skills: Array.isArray(employee.skills)
        ? employee.skills.join(", ")
        : typeof employee.skills === "string"
          ? employee.skills
          : "",
      trabalha_fim_de_semana: employee.trabalha_fim_de_semana || false,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      weekly_hours: 40,
      skills: "",
      trabalha_fim_de_semana: false,
    });
    setCurrentEmployee(null);
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const exportToExcel = () => {
    const exportData = filteredEmployees.map((employee) => ({
      ID: employee.id,
      Name: employee.name,
      Role: employee.role,
      "Weekly Hours": employee.weekly_hours,
      "Weekend Work": employee.trabalha_fim_de_semana ? "Yes" : "No",
      Skills: Array.isArray(employee.skills)
        ? employee.skills.join(", ")
        : "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(
      wb,
      `employees_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let createdCount = 0;
        let updatedCount = 0;
        let errorCount = 0;

        for (const row of jsonData as any[]) {
          try {
            if (!row["Name"]) {
              continue; // Skip rows without a name
            }

            const skillsArray = row["Skills"]
              ? row["Skills"].toString().split(",").map((skill: string) => skill.trim())
              : [];

            const employeeData = {
              name: row["Name"],
              role: row["Role"] || "",
              weekly_hours: Number(row["Weekly Hours"]) || 40,
              trabalha_fim_de_semana: (row["Weekend Work"]?.toString().toLowerCase() === "yes"),
              skills: skillsArray,
            };

            if (row["ID"]) {
              await employeeService.update(row["ID"], employeeData);
              updatedCount++;
            } else {
              await employeeService.create(employeeData);
              createdCount++;
            }
          } catch (error) {
            console.error("Error importing row:", row, error);
            errorCount++;
          }
        }

        alert(
          `Import completed.\nCreated: ${createdCount}\nUpdated: ${updatedCount}\nErrors: ${errorCount}`
        );

        loadEmployees(); // Reload all data to reflect changes

        if (event.target) {
          event.target.value = ''; // Reset file input
        }

      } catch (error) {
        console.error("Error reading file:", error);
        alert("Error reading file. Please make sure it's a valid Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-background p-6 w-full">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Employee Management</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-8 w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="employee-file-import"
              />
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() =>
                  document.getElementById("employee-file-import")?.click()
                }
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-1">
                  <PlusCircle className="h-4 w-4" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new employee.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Role
                    </Label>
                    <Input
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="weekly_hours" className="text-right">
                      Weekly Hours
                    </Label>
                    <Input
                      id="weekly_hours"
                      name="weekly_hours"
                      type="number"
                      value={formData.weekly_hours}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="skills" className="text-right">
                      Skills
                    </Label>
                    <Input
                      id="skills"
                      name="skills"
                      value={formData.skills}
                      onChange={handleInputChange}
                      placeholder="React, TypeScript, Node.js"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label
                      htmlFor="trabalha_fim_de_semana"
                      className="text-right"
                    >
                      Trabalha Fim de Semana
                    </Label>
                    <div className="col-span-3 flex items-center space-x-2">
                      <input
                        id="trabalha_fim_de_semana"
                        name="trabalha_fim_de_semana"
                        type="checkbox"
                        checked={formData.trabalha_fim_de_semana}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <Label
                        htmlFor="trabalha_fim_de_semana"
                        className="text-sm"
                      >
                        Sim, trabalha aos sábados e domingos
                      </Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddEmployee}>Add Employee</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Weekly Hours</TableHead>
                <TableHead>Weekend Work</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-6 text-muted-foreground"
                  >
                    Loading employees...
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.name}
                    </TableCell>
                    <TableCell>{employee.role}</TableCell>
                    <TableCell>{employee.weekly_hours}h</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          employee.trabalha_fim_de_semana
                            ? "default"
                            : "secondary"
                        }
                      >
                        {employee.trabalha_fim_de_semana ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(employee.skills) &&
                          employee.skills.map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        {typeof employee.skills === "string" &&
                          employee.skills.split(",").map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill.trim()}
                            </Badge>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(employee)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Employee
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {employee.name}?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteEmployee(employee.id)
                                }
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No employees found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update the employee's information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Role
              </Label>
              <Input
                id="edit-role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-weekly_hours" className="text-right">
                Weekly Hours
              </Label>
              <Input
                id="edit-weekly_hours"
                name="weekly_hours"
                type="number"
                value={formData.weekly_hours}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-skills" className="text-right">
                Skills
              </Label>
              <Input
                id="edit-skills"
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                placeholder="React, TypeScript, Node.js"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-trabalha_fim_de_semana"
                className="text-right"
              >
                Trabalha Fim de Semana
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <input
                  id="edit-trabalha_fim_de_semana"
                  name="trabalha_fim_de_semana"
                  type="checkbox"
                  checked={formData.trabalha_fim_de_semana}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <Label
                  htmlFor="edit-trabalha_fim_de_semana"
                  className="text-sm"
                >
                  Sim, trabalha aos sábados e domingos
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditEmployee}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeList;
