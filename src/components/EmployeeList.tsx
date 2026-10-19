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
  Mail,
  Send,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  UserCheck,
  Building2,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { employeeService, type Employee } from "@/lib/supabaseClient";
import {
  invitationService,
  type CollaboratorInvitation,
} from "@/lib/invitationService";
import InviteCollaboratorModal from "./InviteCollaboratorModal";

const daysOfWeek = [
  { id: "sunday", label: "Sun" },
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
];

const EmployeeList = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invitations, setInvitations] = useState<CollaboratorInvitation[]>([]);
  const [viewMode, setViewMode] = useState<"employees" | "invitations">("employees");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  // Form state for new/edit employee
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    weekly_hours: 40,
    skills: "",
    dias_de_trabalho: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  });

  // Load employees & invitations from database
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const [data, invs] = await Promise.all([
        employeeService.getAll(),
        invitationService.getAll(),
      ]);
      setEmployees(data);
      setInvitations(invs);
    } catch (error) {
      console.error("Error loading employees and invitations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "weekly_hours" ? parseInt(value) || 0 : value,
    });
  };

  const handleDayChange = (day: string, checked: boolean) => {
    const currentDays = formData.dias_de_trabalho;
    let newDays;
    if (checked) {
      newDays = [...currentDays, day];
    } else {
      newDays = currentDays.filter((d) => d !== day);
    }
    setFormData({ ...formData, dias_de_trabalho: newDays });
  };

  const handleAddEmployee = async () => {
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        alert("O nome é obrigatório");
        return;
      }
      if (!formData.role.trim()) {
        alert("O cargo / função é obrigatório");
        return;
      }
      if (formData.weekly_hours <= 0) {
        alert("As horas semanais devem ser maiores que 0");
        return;
      }

      const skillsArray = formData.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill !== "");

      const newEmployee = await employeeService.create({
        name: formData.name.trim(),
        role: formData.role.trim(),
        email: formData.email.trim() || null,
        weekly_hours: formData.weekly_hours,
        skills: skillsArray,
        dias_de_trabalho: formData.dias_de_trabalho,
      });

      const employeeWithDefaults = {
        ...newEmployee,
        dias_de_trabalho: newEmployee.dias_de_trabalho || [],
      };

      setEmployees([...employees, employeeWithDefaults]);
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding employee:", error);
      alert("Falha ao cadastrar colaborador. Tente novamente.");
    }
  };

  const handleEditEmployee = async () => {
    if (!currentEmployee) return;

    try {
      if (!formData.name.trim()) {
        alert("O nome é obrigatório");
        return;
      }
      if (!formData.role.trim()) {
        alert("O cargo / função é obrigatório");
        return;
      }
      if (formData.weekly_hours <= 0) {
        alert("As horas semanais devem ser maiores que 0");
        return;
      }

      const skillsArray = formData.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill !== "");

      const updatedEmployeeData = await employeeService.update(
        currentEmployee.id,
        {
          name: formData.name.trim(),
          role: formData.role.trim(),
          email: formData.email.trim() || null,
          weekly_hours: formData.weekly_hours,
          skills: skillsArray,
          dias_de_trabalho: formData.dias_de_trabalho,
        },
      );

      const updatedEmployees = employees.map((emp) =>
        emp.id === currentEmployee.id ? updatedEmployeeData : emp,
      );

      setEmployees(updatedEmployees);
      resetForm();
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating employee:", error);
      alert("Falha ao atualizar colaborador.");
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

  const copyInviteLink = (inv: CollaboratorInvitation) => {
    const inviteUrl = `${window.location.origin}?invite=${inv.id}`;
    navigator.clipboard.writeText(
      `Olá ${inv.name}! Você foi convidado para a equipe TeamWorkload no cargo de ${inv.role}. Acesse com seu login: ${inviteUrl}`
    );
    setCopiedInviteId(inv.id);
    setTimeout(() => setCopiedInviteId(null), 3000);
  };

  const handleDeleteInvitation = async (id: string) => {
    try {
      await invitationService.deleteInvitation(id);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error("Error deleting invitation:", e);
    }
  };

  const openEditDialog = (employee: Employee) => {
    setCurrentEmployee(employee);
    setFormData({
      name: employee.name,
      email: (employee as any).email || "",
      role: employee.role,
      weekly_hours: employee.weekly_hours,
      skills: Array.isArray(employee.skills) ? employee.skills.join(", ") : "",
      dias_de_trabalho: employee.dias_de_trabalho || [],
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      role: "",
      weekly_hours: 40,
      skills: "",
      dias_de_trabalho: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    });
    setCurrentEmployee(null);
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((employee as any).email && (employee as any).email.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const filteredInvitations = invitations.filter(
    (inv) =>
      inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.groupName && inv.groupName.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const exportToExcel = () => {
    const exportData = filteredEmployees.map((employee) => ({
      "Employee ID": employee.id,
      Name: employee.name,
      Role: employee.role,
      "Weekly Hours": employee.weekly_hours,
      "Working Days": (employee.dias_de_trabalho || []).join(", "),
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

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        jsonData.forEach(async (row: any) => {
          if (row["Name"]) {
            try {
              const skillsArray = row["Skills"]
                ? row["Skills"]
                    .toString()
                    .split(",")
                    .map((skill: string) => skill.trim())
                : [];

              const workingDays = row["Working Days"]
                ? row["Working Days"]
                    .toString()
                    .split(",")
                    .map((day: string) => day.trim().toLowerCase())
                : [];

              const employeeData: any = {
                name: row["Name"],
                role: row["Role"] || "",
                weekly_hours: Number(row["Weekly Hours"]) || 40,
                dias_de_trabalho: workingDays,
                skills: skillsArray,
              };

              if (row["Employee ID"]) {
                employeeData.id = row["Employee ID"];
              }

              const upsertedEmployee = await employeeService.upsert(employeeData);

              setEmployees((prev) => {
                const existingEmployeeIndex = prev.findIndex(e => e.id === upsertedEmployee.id);
                if (existingEmployeeIndex > -1) {
                  const newEmployees = [...prev];
                  newEmployees[existingEmployeeIndex] = upsertedEmployee;
                  return newEmployees;
                } else {
                  return [...prev, upsertedEmployee];
                }
              });

            } catch (error) {
              console.error("Error importing employee:", error);
            }
          }
        });

        alert("Import completed!");
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Error reading file. Please make sure it's a valid Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-background w-full">
      <Card className="w-full shadow-sm">
        <CardHeader className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="text-lg sm:text-xl font-bold">Colaboradores</CardTitle>
            <div className="flex items-center bg-muted/60 p-1 rounded-lg border text-xs w-fit">
              <button
                type="button"
                onClick={() => setViewMode("employees")}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  viewMode === "employees"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Ativos ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("invitations")}
                className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === "invitations"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Convites</span>
                {invitations.filter((i) => i.status === "pending").length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {invitations.filter((i) => i.status === "pending").length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador..."
                className="pl-8 w-full h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Button
              size="sm"
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 h-9 text-xs shadow-xs"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Convidar por E-mail</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                className="flex items-center gap-1 h-9 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Exportar</span>
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
                  className="flex items-center gap-1 h-9 text-xs"
                  onClick={() =>
                    document.getElementById("employee-file-import")?.click()
                  }
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Importar</span>
                </Button>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary" className="flex items-center gap-1 h-9 text-xs">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Cadastro Direto</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md w-[calc(100%-2rem)]">
                  <DialogHeader>
                    <DialogTitle>Novo Colaborador (Cadastro Direto)</DialogTitle>
                    <DialogDescription>
                      Cadastre diretamente no sistema ou prefira enviar um convite para acesso próprio.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
                      <Label htmlFor="name" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                        Nome
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="sm:col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
                      <Label htmlFor="role" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                        Cargo / Função
                      </Label>
                      <Input
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="sm:col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
                      <Label htmlFor="weekly_hours" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                        Horas/Semana
                      </Label>
                      <Input
                        id="weekly_hours"
                        name="weekly_hours"
                        type="number"
                        value={formData.weekly_hours}
                        onChange={handleInputChange}
                        className="sm:col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
                      <Label htmlFor="skills" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                        Habilidades
                      </Label>
                      <Input
                        id="skills"
                        name="skills"
                        value={formData.skills}
                        onChange={handleInputChange}
                        placeholder="React, TypeScript, Gestão"
                        className="sm:col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-1 sm:gap-4">
                      <Label htmlFor="dias_de_trabalho" className="text-left sm:text-right text-xs sm:text-sm font-medium sm:pt-1">
                        Dias de Trabalho
                      </Label>
                      <div className="sm:col-span-3 flex flex-wrap gap-x-4 gap-y-2 pt-1">
                        {daysOfWeek.map((day) => (
                          <div key={day.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`add-${day.id}`}
                              value={day.id}
                              checked={formData.dias_de_trabalho.includes(
                                day.id,
                              )}
                              onChange={(e) =>
                                handleDayChange(day.id, e.target.checked)
                              }
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <Label htmlFor={`add-${day.id}`} className="text-xs sm:text-sm cursor-pointer">{day.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleAddEmployee} className="w-full sm:w-auto">Adicionar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table className="min-w-[620px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Horas Semanais</TableHead>
                  <TableHead>Dias de Trabalho</TableHead>
                  <TableHead>Habilidades</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-6 text-muted-foreground"
                    >
                      Carregando colaboradores...
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
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(employee.dias_de_trabalho || []).map((day) => (
                            <Badge key={day} variant="outline" className="text-[11px] px-1.5 py-0">
                              {
                                daysOfWeek.find((d) => d.id === day)?.label || day
                              }
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {Array.isArray(employee.skills) &&
                            employee.skills.map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-[11px] px-1.5 py-0">
                                {skill}
                              </Badge>
                            ))}
                          {typeof employee.skills === "string" &&
                            employee.skills.split(",").map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-[11px] px-1.5 py-0">
                                {skill.trim()}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(employee)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Excluir Colaborador
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir {employee.name}?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                                <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteEmployee(employee.id)
                                  }
                                  className="bg-destructive text-destructive-foreground w-full sm:w-auto"
                                >
                                  Excluir
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
                      Nenhum colaborador encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
            <DialogDescription>
              Atualize os dados e carga semanal do colaborador.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="edit-name" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                Nome
              </Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="edit-role" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                Cargo / Função
              </Label>
              <Input
                id="edit-role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="edit-weekly_hours" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                Horas/Semana
              </Label>
              <Input
                id="edit-weekly_hours"
                name="weekly_hours"
                type="number"
                value={formData.weekly_hours}
                onChange={handleInputChange}
                className="sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="edit-skills" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                Habilidades
              </Label>
              <Input
                id="edit-skills"
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                placeholder="React, TypeScript, Gestão"
                className="sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-1 sm:gap-4">
              <Label htmlFor="edit-dias_de_trabalho" className="text-left sm:text-right text-xs sm:text-sm font-medium sm:pt-1">
                Dias de Trabalho
              </Label>
              <div className="sm:col-span-3 flex flex-wrap gap-x-4 gap-y-2 pt-1">
                {daysOfWeek.map((day) => (
                  <div key={day.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`edit-${day.id}`}
                      value={day.id}
                      checked={formData.dias_de_trabalho.includes(day.id)}
                      onChange={(e) =>
                        handleDayChange(day.id, e.target.checked)
                      }
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor={`edit-${day.id}`} className="text-xs sm:text-sm cursor-pointer">{day.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button onClick={handleEditEmployee} className="w-full sm:w-auto">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeList;
