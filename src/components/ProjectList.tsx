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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Download,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { projectService, type Project, type ProjectInsert } from "@/lib/supabaseClient";

const ProjectList = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    categoria_estrategica: "",
    special_marker: "none",
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectService.getAll();
      setProjects(data);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleAddProject = async () => {
    try {
      if (!formData.name.trim()) {
        alert("Name is required");
        return;
      }

      const newProject = await projectService.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        categoria_estrategica: formData.categoria_estrategica.trim(),
        special_marker:
          formData.special_marker === "none" ? null : formData.special_marker,
      });

      setProjects([...projects, newProject]);
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding project:", error);
      alert("Failed to add project. Please try again.");
    }
  };

  const handleEditProject = async () => {
    if (!currentProject) return;

    try {
      if (!formData.name.trim()) {
        alert("Name is required");
        return;
      }

      const updatedProject = await projectService.update(currentProject.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        categoria_estrategica: formData.categoria_estrategica.trim(),
        special_marker:
          formData.special_marker === "none" ? null : formData.special_marker,
      });

      const updatedProjects = projects.map((proj) =>
        proj.id === currentProject.id ? updatedProject : proj,
      );

      setProjects(updatedProjects);
      resetForm();
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Failed to update project. Please try again.");
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await projectService.delete(id);
      setProjects(projects.filter((proj) => proj.id !== id));
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const openEditDialog = (project: Project) => {
    setCurrentProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      categoria_estrategica: project.categoria_estrategica || "",
      special_marker: project.special_marker || "none",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date().toISOString().split("T")[0],
      categoria_estrategica: "",
      special_marker: "none",
    });
    setCurrentProject(null);
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const exportToExcel = () => {
    const exportData = filteredProjects.map((project) => ({
      "Project ID": project.id,
      Name: project.name,
      Description: project.description || "",
      "Start Date": project.start_date,
      "End Date": project.end_date,
      "Strategic Category": project.categoria_estrategica || "",
      "Special Marker": project.special_marker || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(
      wb,
      `projects_export_${new Date().toISOString().split("T")[0]}.xlsx`,
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
              const projectData: any = {
                name: row["Name"],
                description: row["Description"] || "",
                start_date:
                  row["Start Date"] || new Date().toISOString().split("T")[0],
                end_date:
                  row["End Date"] || new Date().toISOString().split("T")[0],
                categoria_estrategica: row["Strategic Category"] || "",
                special_marker: row["Special Marker"] || null,
              };

              if (row["Project ID"]) {
                projectData.id = row["Project ID"];
              }

              const upsertedProject = await projectService.upsert(projectData);

              setProjects((prev) => {
                const existingProjectIndex = prev.findIndex(p => p.id === upsertedProject.id);
                if (existingProjectIndex > -1) {
                  const newProjects = [...prev];
                  newProjects[existingProjectIndex] = upsertedProject;
                  return newProjects;
                } else {
                  return [...prev, upsertedProject];
                }
              });

            } catch (error) {
              console.error("Error importing project:", error);
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
        <CardHeader className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-bold">Projetos</CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar projetos..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                className="flex items-center gap-1 flex-1 sm:flex-none justify-center"
              >
                <Download className="h-4 w-4" />
                <span>Exportar</span>
              </Button>
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="project-file-import"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 w-full justify-center"
                  onClick={() =>
                    document.getElementById("project-file-import")?.click()
                  }
                >
                  <Upload className="h-4 w-4" />
                  <span>Importar</span>
                </Button>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center gap-1 flex-1 sm:flex-none justify-center">
                    <PlusCircle className="h-4 w-4" />
                    <span>Novo</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md w-[calc(100%-2rem)]">
                  <DialogHeader>
                    <DialogTitle>Novo Projeto</DialogTitle>
                    <DialogDescription>
                      Preencha as informações para cadastrar um novo projeto.
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
                      <Label htmlFor="description" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                        Descrição
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="sm:col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
                      <Label htmlFor="start_date" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                        Início
                      </Label>
                      <Input
                        id="start_date"
                        name="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        className="sm:col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
                      <Label htmlFor="end_date" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                        Término
                      </Label>
                      <Input
                        id="end_date"
                        name="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        className="sm:col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
                      <Label
                        htmlFor="categoria_estrategica"
                        className="text-left sm:text-right text-xs sm:text-sm font-medium"
                      >
                        Categoria
                      </Label>
                      <Input
                        id="categoria_estrategica"
                        name="categoria_estrategica"
                        value={formData.categoria_estrategica}
                        onChange={handleInputChange}
                        placeholder="Ex: Produto, Marketing"
                        className="sm:col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
                      <Label htmlFor="special_marker" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                        Marcador
                      </Label>
                      <Select
                        name="special_marker"
                        onValueChange={(value) =>
                          handleSelectChange("special_marker", value)
                        }
                        value={formData.special_marker}
                      >
                        <SelectTrigger className="sm:col-span-3">
                          <SelectValue placeholder="Selecione um marcador" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="major_release">
                            Major Release
                          </SelectItem>
                          <SelectItem value="major_deployment">
                            Major Deployment
                          </SelectItem>
                          <SelectItem value="major_theme">Major Theme</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <Button onClick={handleAddProject} className="w-full sm:w-auto">Criar Projeto</Button>
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
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data de Início</TableHead>
                  <TableHead>Data de Término</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Marcador</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-6 text-muted-foreground"
                    >
                      Carregando projetos...
                    </TableCell>
                  </TableRow>
                ) : filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {project.description || "-"}
                      </TableCell>
                      <TableCell>{project.start_date || "-"}</TableCell>
                      <TableCell>{project.end_date || "-"}</TableCell>
                      <TableCell>{project.categoria_estrategica || "-"}</TableCell>
                      <TableCell>
                        {project.special_marker && project.special_marker !== "none" ? (
                          <span className="capitalize text-xs bg-muted px-2 py-0.5 rounded">
                            {project.special_marker.replace("_", " ")}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(project)}
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
                                  Excluir Projeto
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir {project.name}?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                                <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteProject(project.id)
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
                      colSpan={7}
                      className="text-center py-6 text-muted-foreground"
                    >
                      Nenhum projeto encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
            <DialogDescription>
              Atualize as informações do projeto.
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
              <Label htmlFor="edit-description" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                Descrição
              </Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="edit-start_date" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                Início
              </Label>
              <Input
                id="edit-start_date"
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="edit-end_date" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                Término
              </Label>
              <Input
                id="edit-end_date"
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label
                htmlFor="edit-categoria_estrategica"
                className="text-left sm:text-right text-xs sm:text-sm font-medium"
              >
                Categoria
              </Label>
              <Input
                id="edit-categoria_estrategica"
                name="categoria_estrategica"
                value={formData.categoria_estrategica}
                onChange={handleInputChange}
                className="sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="edit-special_marker" className="text-left sm:text-right text-xs sm:text-sm font-medium">
                Marcador
              </Label>
              <Select
                name="special_marker"
                onValueChange={(value) =>
                  handleSelectChange("special_marker", value)
                }
                value={formData.special_marker}
              >
                <SelectTrigger className="sm:col-span-3">
                  <SelectValue placeholder="Selecione um marcador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="major_release">
                    Major Release
                  </SelectItem>
                  <SelectItem value="major_deployment">
                    Major Deployment
                  </SelectItem>
                  <SelectItem value="major_theme">Major Theme</SelectItem>
                </SelectContent>
              </Select>
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
            <Button onClick={handleEditProject} className="w-full sm:w-auto">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectList;
