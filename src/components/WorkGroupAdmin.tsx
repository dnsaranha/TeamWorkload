import React, { useState, useEffect, useMemo } from "react";
import {
  Users2,
  Network,
  Plus,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Building2,
  Layers,
  FolderTree,
  Search,
  Filter,
  Check,
  X,
  AlertTriangle,
  Info,
  UserPlus,
  Eye,
  FileEdit,
  UserCheck,
  Sparkles,
  HelpCircle,
  Share2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  workGroupService,
  WorkGroup,
  GroupMemberPermission,
  HierarchyLevel,
  HIERARCHY_LEVELS,
} from "../lib/workGroupService";
import { Employee, employeeService } from "../lib/supabaseClient";
import { useAuth } from "../lib/authContext";

const COLOR_PRESETS = [
  { name: "Roxo", value: "#8b5cf6" },
  { name: "Azul", value: "#2563eb" },
  { name: "Ciano", value: "#0284c7" },
  { name: "Esmeralda", value: "#059669" },
  { name: "Âmbar", value: "#d97706" },
  { name: "Laranja", value: "#ea580c" },
  { name: "Rosa", value: "#e11d48" },
  { name: "Grafite", value: "#475569" },
];

export const WorkGroupAdmin: React.FC = () => {
  const {
    activeEmployee,
    activeEmployeeId,
    isSuperAdmin,
    refreshUserData,
    isMockCleared,
    clearMockData,
    restoreMockData,
  } = useAuth();

  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("tree");

  // Mock Data Modal State
  const [isClearMockDialogOpen, setIsClearMockDialogOpen] = useState<boolean>(false);
  const [isProcessingMock, setIsProcessingMock] = useState<boolean>(false);

  // Group Create/Edit Modal State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingGroup, setEditingGroup] = useState<WorkGroup | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Group Delete Modal State (replaces window.confirm)
  const [deleteTargetGroup, setDeleteTargetGroup] = useState<WorkGroup | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    code: string;
    description: string;
    level: HierarchyLevel;
    parentId: string | null;
    color: string;
    members: GroupMemberPermission[];
  }>({
    name: "",
    code: "",
    description: "",
    level: 3,
    parentId: null,
    color: "#2563eb",
    members: [],
  });

  // Simulator State
  const [selectedSimEmployeeId, setSelectedSimEmployeeId] = useState<string>("emp-4");

  // Member selection in modal
  const [newMemberEmployeeId, setNewMemberEmployeeId] = useState<string>("");
  const [newMemberRole, setNewMemberRole] = useState<string>("Membro");
  const [newMemberCanCreate, setNewMemberCanCreate] = useState<boolean>(true);
  const [newMemberCanEdit, setNewMemberCanEdit] = useState<boolean>(true);
  const [newMemberCanDelete, setNewMemberCanDelete] = useState<boolean>(false);
  const [newMemberIsAdmin, setNewMemberIsAdmin] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [gList, eList] = await Promise.all([
        workGroupService.getAll(),
        employeeService.getAll(),
      ]);
      setGroups(gList);
      setEmployees(eList);
    } catch (err) {
      console.error("Error loading group admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const matchesSearch =
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLevel =
        levelFilter === "all" || String(g.level) === levelFilter;

      return matchesSearch && matchesLevel;
    });
  }, [groups, searchQuery, levelFilter]);

  // Open Create Modal
  const handleOpenCreate = (prefillParentId?: string, prefillLevel?: HierarchyLevel) => {
    setEditingGroup(null);
    setFormError(null);
    setMemberError(null);
    let defaultLevel: HierarchyLevel = prefillLevel || 3;
    let defaultParentId: string | null = prefillParentId || null;

    if (prefillParentId) {
      const parent = groups.find((g) => g.id === prefillParentId);
      if (parent) {
        defaultLevel = Math.min(4, (parent.level + 1)) as HierarchyLevel;
      }
    }

    // Auto-include the active user as group leader/admin
    const initialMembers: GroupMemberPermission[] = [];
    if (activeEmployee) {
      initialMembers.push({
        employeeId: activeEmployee.id,
        employeeName: activeEmployee.name,
        email: activeEmployee.email || undefined,
        roleInGroup: "Líder / Criador",
        isAdmin: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canView: true,
        joinedAt: new Date().toISOString(),
      });
    }

    setFormData({
      name: "",
      code: "",
      description: "",
      level: defaultLevel,
      parentId: defaultParentId,
      color: COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)].value,
      members: initialMembers,
    });
    setIsDialogOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (group: WorkGroup) => {
    setEditingGroup(group);
    setFormError(null);
    setMemberError(null);
    setFormData({
      id: group.id,
      name: group.name,
      code: group.code,
      description: group.description,
      level: group.level,
      parentId: group.parentId,
      color: group.color || "#2563eb",
      members: [...group.members],
    });
    setIsDialogOpen(true);
  };

  // Handle Save
  const handleSaveGroup = async () => {
    if (!formData.name.trim()) {
      setFormError("Por favor, preencha o nome do grupo de trabalho.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const now = new Date().toISOString();
      const id = formData.id || `group-${Date.now()}`;
      const levelConfig = HIERARCHY_LEVELS[formData.level];

      const groupToSave: WorkGroup = {
        id,
        name: formData.name.trim(),
        code: formData.code.trim() || formData.name.substring(0, 4).toUpperCase(),
        description: formData.description.trim(),
        level: formData.level,
        levelName: levelConfig?.shortTitle || "Grupo",
        parentId: formData.parentId || null,
        color: formData.color,
        members: formData.members,
        created_at: editingGroup?.created_at || now,
        updated_at: now,
      };

      await workGroupService.save(groupToSave);
      await loadData();
      await refreshUserData();
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error("Error saving work group:", err);
      setFormError(err.message || "Erro ao salvar grupo.");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Delete Confirmation Dialog
  const handleDeleteGroup = (group: WorkGroup) => {
    setDeleteTargetGroup(group);
    setIsDeleteDialogOpen(true);
  };

  // Confirm Delete
  const handleConfirmDeleteGroup = async () => {
    if (!deleteTargetGroup) return;
    setIsDeleting(true);
    try {
      await workGroupService.delete(deleteTargetGroup.id);
      await loadData();
      await refreshUserData();
      setIsDeleteDialogOpen(false);
      setDeleteTargetGroup(null);
    } catch (err: any) {
      console.error("Error deleting group:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Member management in modal
  const handleAddMemberToForm = () => {
    setMemberError(null);
    if (!newMemberEmployeeId) return;

    const emp = employees.find((e) => e.id === newMemberEmployeeId);
    if (!emp) return;

    // Check if already in list
    if (formData.members.some((m) => m.employeeId === newMemberEmployeeId)) {
      setMemberError("Este colaborador já faz parte deste grupo.");
      return;
    }

    const newMember: GroupMemberPermission = {
      employeeId: emp.id,
      employeeName: emp.name,
      email: emp.email || undefined,
      roleInGroup: newMemberRole || "Membro",
      isAdmin: newMemberIsAdmin,
      canCreate: newMemberCanCreate,
      canEdit: newMemberCanEdit,
      canDelete: newMemberCanDelete,
      canView: true,
      joinedAt: new Date().toISOString(),
    };

    setFormData((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
    }));

    setNewMemberEmployeeId("");
    setNewMemberRole("Membro");
    setNewMemberIsAdmin(false);
  };

  const handleRemoveMemberFromForm = (employeeId: string) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.employeeId !== employeeId),
    }));
  };

  const handleUpdateMemberPermissionInForm = (
    employeeId: string,
    field: keyof GroupMemberPermission,
    value: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.map((m) => {
        if (m.employeeId === employeeId) {
          const updated = { ...m, [field]: value };
          // If becoming admin, auto-enable edit/create
          if (field === "isAdmin" && value) {
            updated.canCreate = true;
            updated.canEdit = true;
            updated.canView = true;
          }
          return updated;
        }
        return m;
      }),
    }));
  };

  // Candidate parent groups: any group with lower level number (e.g. level 1 or 2 when creating level 3)
  const candidateParentGroups = useMemo(() => {
    return groups.filter((g) => {
      if (editingGroup && g.id === editingGroup.id) return false;
      return g.level < formData.level;
    });
  }, [groups, formData.level, editingGroup]);

  // Simulator Data
  const simEmployee = employees.find((e) => e.id === selectedSimEmployeeId) || employees[0];
  const simVisibleGroupIds = useMemo(() => {
    if (!simEmployee) return [];
    return workGroupService.getVisibleGroupIdsForEmployee(
      simEmployee.id,
      groups,
      false
    );
  }, [simEmployee, groups]);

  // Render tree node recursive component
  const renderTreeNode = (group: WorkGroup, depth = 0) => {
    const children = groups.filter((g) => g.parentId === group.id);
    const levelConfig = HIERARCHY_LEVELS[group.level];

    return (
      <div key={group.id} className="relative flex flex-col items-start w-full">
        <div
          className={`w-full p-4 rounded-xl border transition-all shadow-sm ${
            depth === 0
              ? "bg-card border-border/80"
              : depth === 1
                ? "bg-muted/30 border-blue-200 dark:border-blue-900/40"
                : "bg-muted/10 border-border/60"
          } hover:shadow-md`}
          style={{ borderLeftWidth: 5, borderLeftColor: group.color || "#2563eb" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base text-foreground">
                  {group.name}
                </span>
                <Badge variant="outline" className="text-xs font-mono font-semibold">
                  {group.code}
                </Badge>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${levelConfig.bgClass} ${levelConfig.colorClass} ${levelConfig.borderClass}`}
                >
                  {levelConfig.badgeLabel}
                </span>
                {group.parentId && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Share2 className="w-3 h-3" />
                    Vinculado a: <strong>{group.parentName || "Grupo Superior"}</strong>
                  </span>
                )}
              </div>
              {group.description && (
                <p className="text-xs text-muted-foreground max-w-2xl">
                  {group.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              {group.level < 4 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenCreate(group.id)}
                  className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                  title="Criar subgrupo subordinado a este grupo"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Subgrupo
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleOpenEdit(group)}
                className="h-8 px-2 text-xs"
                title="Editar configurações e membros"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteGroup(group)}
                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                title="Excluir grupo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Members Bar */}
          <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <Users2 className="w-3.5 h-3.5" />
                {group.members.length} Colaborador(es):
              </span>
              {group.members.map((m) => (
                <div
                  key={m.employeeId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border text-xs"
                >
                  <span className="font-medium">{m.employeeName}</span>
                  {m.isAdmin ? (
                    <Badge variant="default" className="text-[10px] h-4 px-1 bg-amber-600">
                      Admin
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      ({m.roleInGroup})
                    </span>
                  )}
                  {/* Permission icons */}
                  <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-1">
                    {m.canCreate && <span title="Pode Criar">➕</span>}
                    {m.canEdit && <span title="Pode Editar">✏️</span>}
                    {m.canDelete && <span title="Pode Excluir">🗑️</span>}
                  </div>
                </div>
              ))}
              {group.members.length === 0 && (
                <span className="text-muted-foreground italic text-xs">
                  Nenhum colaborador vinculado ainda.
                </span>
              )}
            </div>

            <Button
              variant="link"
              size="sm"
              onClick={() => handleOpenEdit(group)}
              className="text-xs h-6 p-0 text-primary"
            >
              Gerenciar Colaboradores & Permissões →
            </Button>
          </div>
        </div>

        {/* Child Subgroups */}
        {children.length > 0 && (
          <div className="pl-6 sm:pl-10 mt-3 space-y-3 w-full border-l-2 border-dashed border-primary/20 relative">
            <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary/30" />
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
              <span>Subgrupos Vinculados ({children.length})</span>
              {children.length > 1 && (
                <Badge variant="outline" className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950">
                  Compartilham este grupo superior
                </Badge>
              )}
            </div>
            {children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-1">
            <Building2 className="w-3.5 h-3.5" />
            Governança Organizacional & Hierarquia Corporativa
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Administração de Grupos de Trabalho
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Estruture os grupos de trabalho por níveis (Nível 1, Nível 2, Nível 3, Nível 4). Colaboradores em níveis superiores possuem visão de todos no mesmo nível e dos grupos subordinados em níveis inferiores.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isMockCleared ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearMockDialogOpen(true)}
              className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Dados Mock (Iniciar Limpo)
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsProcessingMock(true);
                try {
                  await restoreMockData();
                  const fresh = await workGroupService.getAll();
                  setGroups(fresh);
                } finally {
                  setIsProcessingMock(false);
                }
              }}
              disabled={isProcessingMock}
              className="gap-1.5 text-xs text-primary hover:bg-primary/10"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Restaurar Dados Mock
            </Button>
          )}

          <Button
            onClick={() => handleOpenCreate()}
            className="gap-2 shadow-sm font-semibold text-sm bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            + Novo Grupo de Trabalho
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total de Grupos</p>
              <p className="text-2xl font-bold mt-0.5">{groups.length}</p>
              <p className="text-[11px] text-muted-foreground">Em 4 níveis de hierarquia</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
              <FolderTree className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Níveis Ativos</p>
              <p className="text-2xl font-bold mt-0.5">
                {new Set(groups.map((g) => g.level)).size} / 4
              </p>
              <p className="text-[11px] text-muted-foreground">Nível 1 ao Nível 4</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Colaboradores Alocados</p>
              <p className="text-2xl font-bold mt-0.5">
                {
                  new Set(
                    groups.flatMap((g) => g.members.map((m) => m.employeeId))
                  ).size
                }
              </p>
              <p className="text-[11px] text-muted-foreground">Com papéis e permissões</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Users2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Grupos com Superior</p>
              <p className="text-2xl font-bold mt-0.5">
                {groups.filter((g) => g.parentId !== null).length}
              </p>
              <p className="text-[11px] text-muted-foreground">Subordinados / Compartilhados</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <Network className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="tree" className="text-xs sm:text-sm gap-1.5">
              <Network className="w-3.5 h-3.5" />
              Árvore Hierárquica
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs sm:text-sm gap-1.5">
              <FolderTree className="w-3.5 h-3.5" />
              Lista de Grupos
            </TabsTrigger>
            <TabsTrigger value="simulator" className="text-xs sm:text-sm gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Simulador de Visão
            </TabsTrigger>
          </TabsList>

          {/* Filters for Tree and List */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar grupo ou sigla..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Níveis</SelectItem>
                <SelectItem value="1">Nível 1</SelectItem>
                <SelectItem value="2">Nível 2</SelectItem>
                <SelectItem value="3">Nível 3</SelectItem>
                <SelectItem value="4">Nível 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* TAB 1: INTERACTIVE HIERARCHY TREE */}
        <TabsContent value="tree" className="space-y-4 pt-1">
          <div className="p-3 bg-muted/40 rounded-lg border text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                Legenda de Níveis:
              </span>
              {Object.values(HIERARCHY_LEVELS).map((lvl) => (
                <span
                  key={lvl.level}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${lvl.bgClass} ${lvl.colorClass} ${lvl.borderClass}`}
                >
                  {lvl.badgeLabel}
                </span>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground hidden md:inline">
              Dois ou mais grupos podem apontar para o mesmo superior (grupos compartilhados)
            </span>
          </div>

          <div className="space-y-4">
            {/* Render root level groups (parentId === null) first */}
            {groups.filter((g) => g.parentId === null).length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-xl bg-card">
                <p className="text-muted-foreground text-sm">
                  Nenhum grupo raiz encontrado.
                </p>
                <Button
                  onClick={() => handleOpenCreate(undefined, 1)}
                  className="mt-3 text-xs"
                >
                  Criar Primeiro Grupo Raiz (Nível 1)
                </Button>
              </div>
            ) : (
              groups
                .filter((g) => g.parentId === null)
                .map((rootGroup) => renderTreeNode(rootGroup, 0))
            )}
          </div>
        </TabsContent>

        {/* TAB 2: DETAILED LIST VIEW */}
        <TabsContent value="list" className="space-y-4 pt-1">
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-3 pl-4">Grupo de Trabalho</th>
                    <th className="p-3">Sigla</th>
                    <th className="p-3">Nível Hierárquico</th>
                    <th className="p-3">Grupo Superior (Pai)</th>
                    <th className="p-3">Membros</th>
                    <th className="p-3 text-right pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">
                        Nenhum grupo encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((g) => {
                      const lvl = HIERARCHY_LEVELS[g.level];
                      return (
                        <tr key={g.id} className="hover:bg-muted/40 transition-colors">
                          <td className="p-3 pl-4 font-semibold text-foreground flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: g.color || "#2563eb" }}
                            />
                            <div>
                              <div>{g.name}</div>
                              {g.description && (
                                <div className="text-xs text-muted-foreground font-normal line-clamp-1">
                                  {g.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-xs">{g.code}</td>
                          <td className="p-3">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${lvl.bgClass} ${lvl.colorClass} ${lvl.borderClass}`}
                            >
                              {lvl.badgeLabel}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {g.parentName || "— (Raiz)"}
                          </td>
                          <td className="p-3 text-xs">
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {g.members.length} membro(s)
                              </Badge>
                              {g.members.some((m) => m.isAdmin) && (
                                <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded border border-amber-200">
                                  Admin
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(g)}
                                className="h-8 px-2 text-xs"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteGroup(g)}
                                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: SIMULADOR DE VISÃO POR COLABORADOR */}
        <TabsContent value="simulator" className="space-y-4 pt-1">
          <Card className="shadow-sm border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Simulador de Visão & Permissões Hierárquicas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Selecione um colaborador para inspecionar exatamente quais grupos, subgrupos e registros ele tem acesso para visualizar ou editar.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sim-select" className="text-xs shrink-0 font-medium">
                    Simular como:
                  </Label>
                  <Select
                    value={selectedSimEmployeeId}
                    onValueChange={setSelectedSimEmployeeId}
                  >
                    <SelectTrigger id="sim-select" className="w-56 h-9 text-xs">
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id} className="text-xs">
                          {emp.name} — {emp.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Summary Card for Selected Employee */}
              {simEmployee && (
                <div className="p-4 rounded-xl bg-accent/40 border space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                        {simEmployee.name}
                        <Badge variant="outline" className="text-xs">
                          {simEmployee.role}
                        </Badge>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Grupos diretos:{" "}
                        {groups
                          .filter((g) =>
                            g.members.some((m) => m.employeeId === simEmployee.id)
                          )
                          .map((g) => g.name)
                          .join(", ") || "Nenhum vínculo direto"}
                      </p>
                    </div>

                    <div className="text-right">
                      <Badge className="bg-primary text-primary-foreground text-xs font-semibold">
                        {simVisibleGroupIds.length} grupo(s) visíveis no total
                      </Badge>
                    </div>
                  </div>

                  <div className="p-3 bg-background rounded-lg border text-xs text-muted-foreground">
                    <strong className="text-foreground">Regra do Sistema:</strong>{" "}
                    Ao estar em um nível hierárquico superior (ex: Nível 1 ou Nível 2), o colaborador obtém automaticamente a visão e supervisão de todos os subgrupos inferiores subordinados na mesma ramificação da árvore.
                  </div>
                </div>
              )}

              {/* Groups visibility matrix */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Detalhamento de Grupos e Direitos de Acesso Efetivos:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groups.map((group) => {
                    const isVisible = simVisibleGroupIds.includes(group.id);
                    const effective = workGroupService.getEffectiveUserPermissions(
                      selectedSimEmployeeId,
                      group.id,
                      groups,
                      false
                    );
                    const lvl = HIERARCHY_LEVELS[group.level];

                    return (
                      <div
                        key={group.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isVisible
                            ? "bg-card border-border shadow-sm"
                            : "bg-muted/20 border-dashed border-border/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-foreground">
                                {group.name}
                              </span>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {group.code}
                              </Badge>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${lvl.bgClass} ${lvl.colorClass} ${lvl.borderClass}`}
                              >
                                {lvl.shortTitle}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {effective.reason}
                            </p>
                          </div>

                          {isVisible ? (
                            <Badge className="bg-green-600 text-[10px] shrink-0">
                              Visível
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              Oculto
                            </Badge>
                          )}
                        </div>

                        {/* Effective Rights */}
                        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center gap-2 flex-wrap text-xs">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                              effective.canView
                                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300"
                                : "bg-muted text-muted-foreground border-transparent"
                            }`}
                          >
                            {effective.canView ? "✓ Pode Visualizar" : "✕ Sem visão"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                              effective.canCreate
                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-muted text-muted-foreground border-transparent"
                            }`}
                          >
                            {effective.canCreate ? "✓ Pode Criar" : "✕ Não cria"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                              effective.canEdit
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-muted text-muted-foreground border-transparent"
                            }`}
                          >
                            {effective.canEdit ? "✓ Pode Editar" : "✕ Não edita"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                              effective.canDelete
                                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300"
                                : "bg-muted text-muted-foreground border-transparent"
                            }`}
                          >
                            {effective.canDelete ? "✓ Pode Excluir" : "✕ Não exclui"}
                          </span>
                          {effective.isAdmin && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-950 dark:text-purple-300">
                              ★ Administrador
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE / EDIT GROUP DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingGroup ? "Editar Grupo de Trabalho" : "Criar Novo Grupo de Trabalho"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure nome, nível hierárquico, grupo superior e os colaboradores com suas permissões específicas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="grp-name" className="text-xs font-semibold">
                  Nome do Grupo de Trabalho *
                </Label>
                <Input
                  id="grp-name"
                  placeholder="Ex: Squad Frontend & UX"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="grp-code" className="text-xs font-semibold">
                  Código / Sigla
                </Label>
                <Input
                  id="grp-code"
                  placeholder="Ex: SQD-FRONT"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="h-9 text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="grp-level" className="text-xs font-semibold">
                  Nível Hierárquico *
                </Label>
                <Select
                  value={String(formData.level)}
                  onValueChange={(val) => {
                    const newLvl = Number(val) as HierarchyLevel;
                    setFormData({
                      ...formData,
                      level: newLvl,
                      // If level 1, parent is always null
                      parentId: newLvl === 1 ? null : formData.parentId,
                    });
                  }}
                >
                  <SelectTrigger id="grp-level" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Nível 1</SelectItem>
                    <SelectItem value="2">Nível 2</SelectItem>
                    <SelectItem value="3">Nível 3</SelectItem>
                    <SelectItem value="4">Nível 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Superior Group / Parent (Allowed to be shared!) */}
              {formData.level > 1 && (
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="grp-parent" className="text-xs font-semibold flex items-center justify-between">
                    <span>Grupo de Nível Superior (Pai)</span>
                    <span className="text-[10px] text-primary font-normal">
                      💡 Dois ou mais grupos podem compartilhar deste mesmo grupo superior
                    </span>
                  </Label>
                  <Select
                    value={formData.parentId || "none"}
                    onValueChange={(val) =>
                      setFormData({
                        ...formData,
                        parentId: val === "none" ? null : val,
                      })
                    }
                  >
                    <SelectTrigger id="grp-parent" className="h-9 text-xs">
                      <SelectValue placeholder="Selecione o grupo superior" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nenhum (Grupo Raiz Independente) —</SelectItem>
                      {candidateParentGroups.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.name} ({HIERARCHY_LEVELS[p.level].shortTitle} • {p.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Color Preset */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold">Cor de Identificação</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                        formData.color === c.value
                          ? "ring-2 ring-primary ring-offset-2 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {formData.color === c.value && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="grp-desc" className="text-xs font-semibold">
                  Descrição e Objetivos do Grupo
                </Label>
                <Input
                  id="grp-desc"
                  placeholder="Ex: Responsável pela arquitetura de interface e entregas do design system."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* COLLABORATORS & PERMISSIONS SECTION */}
            <div className="pt-3 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Users2 className="w-4 h-4 text-primary" />
                    Colaboradores & Permissões Granulares
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Defina quem pode editar, criar, excluir registros ou administrar este grupo.
                  </p>
                </div>
              </div>

              {/* Add Member Bar */}
              <div className="p-3 bg-muted/40 rounded-lg border space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-6 space-y-1">
                    <Label className="text-[11px]">Selecionar Colaborador</Label>
                    <Select
                      value={newMemberEmployeeId}
                      onValueChange={setNewMemberEmployeeId}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Escolha um colaborador..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id} className="text-xs">
                            {emp.name} ({emp.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-4 space-y-1">
                    <Label className="text-[11px]">Função no Grupo</Label>
                    <Input
                      placeholder="Ex: Tech Lead, Desenvolvedor..."
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddMemberToForm}
                      disabled={!newMemberEmployeeId}
                      className="w-full h-8 text-xs gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Incluir
                    </Button>
                  </div>
                </div>

                {/* Quick permissions for the member to be added */}
                <div className="flex items-center gap-4 text-xs pt-1 flex-wrap">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMemberCanCreate}
                      onChange={(e) => setNewMemberCanCreate(e.target.checked)}
                      className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                    />
                    <span>Pode Criar Registros</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMemberCanEdit}
                      onChange={(e) => setNewMemberCanEdit(e.target.checked)}
                      className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                    />
                    <span>Pode Editar Registros</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMemberCanDelete}
                      onChange={(e) => setNewMemberCanDelete(e.target.checked)}
                      className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                    />
                    <span>Pode Excluir Registros</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-amber-600 dark:text-amber-400">
                    <input
                      type="checkbox"
                      checked={newMemberIsAdmin}
                      onChange={(e) => {
                        setNewMemberIsAdmin(e.target.checked);
                        if (e.target.checked) {
                          setNewMemberCanCreate(true);
                          setNewMemberCanEdit(true);
                        }
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                    />
                    <span>Tornar Administrador</span>
                  </label>
                </div>
              </div>

              {/* Members Table */}
              <div className="rounded-lg border bg-background overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 border-b font-semibold text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 pl-3 text-left">Colaborador</th>
                      <th className="p-2.5 text-center">Criar</th>
                      <th className="p-2.5 text-center">Editar</th>
                      <th className="p-2.5 text-center">Excluir</th>
                      <th className="p-2.5 text-center">Administrador</th>
                      <th className="p-2.5 pr-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {formData.members.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground italic">
                          Nenhum colaborador incluído neste grupo ainda. Adicione acima.
                        </td>
                      </tr>
                    ) : (
                      formData.members.map((m) => (
                        <tr key={m.employeeId} className="hover:bg-muted/30">
                          <td className="p-2.5 pl-3">
                            <div className="font-semibold text-foreground">
                              {m.employeeName}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {m.roleInGroup || "Membro"}
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={m.canCreate}
                              onChange={(e) =>
                                handleUpdateMemberPermissionInForm(
                                  m.employeeId,
                                  "canCreate",
                                  e.target.checked
                                )
                              }
                              className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={m.canEdit}
                              onChange={(e) =>
                                handleUpdateMemberPermissionInForm(
                                  m.employeeId,
                                  "canEdit",
                                  e.target.checked
                                )
                              }
                              className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={m.canDelete}
                              onChange={(e) =>
                                handleUpdateMemberPermissionInForm(
                                  m.employeeId,
                                  "canDelete",
                                  e.target.checked
                                )
                              }
                              className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={m.isAdmin}
                              onChange={(e) =>
                                handleUpdateMemberPermissionInForm(
                                  m.employeeId,
                                  "isAdmin",
                                  e.target.checked
                                )
                              }
                              className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                            />
                          </td>
                          <td className="p-2.5 pr-3 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveMemberFromForm(m.employeeId)}
                              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => setIsDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={handleSaveGroup}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {isSaving ? "Salvando..." : "Salvar Grupo de Trabalho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE GROUP CONFIRMATION DIALOG (replaces window.confirm) */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5 text-destructive" />
              Excluir Grupo de Trabalho?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {deleteTargetGroup ? (
                <>
                  Você está prestes a excluir o grupo <strong>"{deleteTargetGroup.name}"</strong> ({deleteTargetGroup.code}).
                </>
              ) : (
                "Confirme a exclusão do grupo selecionado."
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteTargetGroup && (
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-2 border">
              {groups.filter((g) => g.parentId === deleteTargetGroup.id).length > 0 && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">
                  ⚠️ Atenção: Este grupo possui {groups.filter((g) => g.parentId === deleteTargetGroup.id).length} subgrupo(s) subordinado(s). Se você excluí-lo, esses subgrupos serão desvinculados e se tornarão grupos raiz.
                </div>
              )}
              <p className="text-muted-foreground text-[11px]">
                Esta exclusão será sincronizada imediatamente no Firebase Firestore e no cache local da sua organização.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteTargetGroup(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleConfirmDeleteGroup}
              className="gap-1.5 font-semibold"
            >
              {isDeleting ? "Excluindo..." : "Confirmar e Excluir Grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLEAR MOCK DATA CONFIRMATION DIALOG */}
      <Dialog open={isClearMockDialogOpen} onOpenChange={setIsClearMockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5 text-destructive" />
              Limpar Todos os Dados de Demonstração?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Esta ação removerá todos os dados pré-carregados de exemplo (colaboradores mock, grupos mock, projetos e tarefas de teste) para que você possa iniciar a plataforma 100% limpa com os dados reais da sua organização.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-2 border">
            <p className="font-semibold text-foreground">O que acontecerá:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 text-[11px]">
              <li>Os grupos e squads de exemplo serão removidos.</li>
              <li>A base de colaboradores, projetos e tarefas ficará limpa.</li>
              <li>Você poderá criar seus próprios grupos e hierarquias do zero.</li>
              <li>Você poderá restaurar os dados de demonstração a qualquer momento.</li>
            </ul>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsClearMockDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isProcessingMock}
              onClick={async () => {
                setIsProcessingMock(true);
                try {
                  await clearMockData();
                  setGroups([]);
                  setIsClearMockDialogOpen(false);
                } finally {
                  setIsProcessingMock(false);
                }
              }}
              className="gap-1.5 font-semibold"
            >
              {isProcessingMock ? "Limpando..." : "Sim, Limpar Dados Mock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkGroupAdmin;
