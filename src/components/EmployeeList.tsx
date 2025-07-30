import React, { useState } from "react";
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
import { PlusCircle, Pencil, Trash2, Search } from "lucide-react";

interface Skill {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  weeklyHours: number;
  skills: Skill[];
}

const EmployeeList = () => {
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "1",
      name: "John Doe",
      role: "Frontend Developer",
      weeklyHours: 40,
      skills: [
        { id: "1", name: "React" },
        { id: "2", name: "TypeScript" },
      ],
    },
    {
      id: "2",
      name: "Jane Smith",
      role: "UX Designer",
      weeklyHours: 35,
      skills: [
        { id: "3", name: "Figma" },
        { id: "4", name: "UI Design" },
      ],
    },
    {
      id: "3",
      name: "Mike Johnson",
      role: "Backend Developer",
      weeklyHours: 40,
      skills: [
        { id: "5", name: "Node.js" },
        { id: "6", name: "Express" },
      ],
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  // Form state for new/edit employee
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    weeklyHours: 40,
    skills: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "weeklyHours" ? parseInt(value) || 0 : value,
    });
  };

  const handleAddEmployee = () => {
    const skillsArray = formData.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter((skill) => skill !== "")
      .map((skill, index) => ({ id: `new-${index}`, name: skill }));

    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      name: formData.name,
      role: formData.role,
      weeklyHours: formData.weeklyHours,
      skills: skillsArray,
    };

    setEmployees([...employees, newEmployee]);
    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEditEmployee = () => {
    if (!currentEmployee) return;

    const skillsArray = formData.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter((skill) => skill !== "")
      .map((skill, index) => ({ id: `edit-${index}`, name: skill }));

    const updatedEmployees = employees.map((emp) => {
      if (emp.id === currentEmployee.id) {
        return {
          ...emp,
          name: formData.name,
          role: formData.role,
          weeklyHours: formData.weeklyHours,
          skills: skillsArray,
        };
      }
      return emp;
    });

    setEmployees(updatedEmployees);
    resetForm();
    setIsEditDialogOpen(false);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(employees.filter((emp) => emp.id !== id));
  };

  const openEditDialog = (employee: Employee) => {
    setCurrentEmployee(employee);
    setFormData({
      name: employee.name,
      role: employee.role,
      weeklyHours: employee.weeklyHours,
      skills: employee.skills.map((skill) => skill.name).join(", "),
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      weeklyHours: 40,
      skills: "",
    });
    setCurrentEmployee(null);
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
                    <Label htmlFor="weeklyHours" className="text-right">
                      Weekly Hours
                    </Label>
                    <Input
                      id="weeklyHours"
                      name="weeklyHours"
                      type="number"
                      value={formData.weeklyHours}
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
                <TableHead>Skills</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.name}
                    </TableCell>
                    <TableCell>{employee.role}</TableCell>
                    <TableCell>{employee.weeklyHours}h</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {employee.skills.map((skill) => (
                          <Badge key={skill.id} variant="secondary">
                            {skill.name}
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
                    colSpan={5}
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
              <Label htmlFor="edit-weeklyHours" className="text-right">
                Weekly Hours
              </Label>
              <Input
                id="edit-weeklyHours"
                name="weeklyHours"
                type="number"
                value={formData.weeklyHours}
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
