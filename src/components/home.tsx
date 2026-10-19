import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  ListTodo,
  BarChart3,
  Home,
  Menu,
  X,
  FolderOpen,
  Target,
  Smartphone,
  Layers,
  Grid3X3,
  Table,
  Clock,
  Network,
  ShieldCheck,
  Building2,
  LogOut,
  UserCheck,
  ChevronDown,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeToggleButton } from "@/lib/theme";
import WorkloadCalendar from "./WorkloadCalendar";
import XiaomiCalendar from "./XiaomiCalendar";
import GanttChart from "./GanttChart";
import ProjectGridSheet from "./ProjectGridSheet";
import TimeTrackingSheet from "./TimeTrackingSheet";
import ResourcePlanningView from "./ResourcePlanningView";
import EmployeeList from "./EmployeeList";
import WorkloadSummary from "./WorkloadSummary";
import ReportsView from "./ReportsView";
import UserProfile from "./UserProfile";
import Roadmap from "./Roadmap";
import FloatingTimeTracker from "./FloatingTimeTracker";
import WorkGroupAdmin from "./WorkGroupAdmin";
import { useAuth } from "@/lib/authContext";
import {
  employeeService,
  taskService,
  projectService,
} from "@/lib/supabaseClient";

const HomePage = () => {
  const {
    user,
    activeEmployee,
    activeEmployeeId,
    allEmployees,
    permissions,
    isSuperAdmin,
    switchPersona,
    logout,
    isMockCleared,
    clearMockData,
    restoreMockData,
  } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isClearMockDialogOpen, setIsClearMockDialogOpen] = useState(false);
  const [isProcessingMock, setIsProcessingMock] = useState(false);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeTasks, setActiveTasks] = useState(0);
  const [avgWorkload, setAvgWorkload] = useState(0);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [dataVersion, setDataVersion] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);

  useEffect(() => {
    loadDashboardData();

    // Check for mobile screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Auto-refresh dashboard data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);

    return () => {
      window.removeEventListener("resize", checkMobile);
      clearInterval(interval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [employees, tasks, projects] = await Promise.all([
        employeeService.getAll(),
        taskService.getAll(),
        projectService.getAll(),
      ]);

      setTotalEmployees(employees.length);
      setTotalProjects(projects.length);

      // Count active tasks (tasks that are assigned and within current date range)
      const currentDate = new Date();
      const activeTasksCount = tasks.filter((task) => {
        const startDate = new Date(task.start_date);
        const endDate = new Date(task.end_date);
        return (
          task.assigned_employee_id &&
          startDate <= currentDate &&
          endDate >= currentDate
        );
      }).length;
      setActiveTasks(activeTasksCount);

      // Calculate average workload
      if (employees.length > 0) {
        const totalCapacity = employees.reduce(
          (sum, emp) => sum + emp.weekly_hours,
          0,
        );
        const totalAssignedHours = tasks
          .filter((task) => task.assigned_employee_id)
          .reduce((sum, task) => sum + task.estimated_time, 0);

        const avgWorkloadPercent =
          totalCapacity > 0
            ? Math.round((totalAssignedHours / totalCapacity) * 100)
            : 0;
        setAvgWorkload(avgWorkloadPercent);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden">
      {/* Mobile Top Header */}
      {isMobile && (
        <header className="flex-shrink-0 h-14 bg-card border-b px-4 flex items-center justify-between z-40">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              TW
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Team Workload</h1>
              <p className="text-[10px] text-muted-foreground capitalize leading-tight">
                {activeTab}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <ThemeToggleButton />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setActiveTab("profile")}
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                U
              </div>
            </Button>
          </div>
        </header>
      )}

      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <div
        className={`${
          isMobile
            ? "fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-card/95 backdrop-blur-md px-1 py-1 flex flex-row items-center shadow-lg overflow-x-auto"
            : sidebarCollapsed
              ? "w-16 border-r bg-card p-3 flex flex-col transition-all duration-300"
              : "w-64 border-r bg-card p-4 flex flex-col transition-all duration-300"
        }`}
      >
        {!isMobile && (
          <div className="mb-6">
            {!sidebarCollapsed && (
              <>
                <h1 className="text-2xl font-bold text-primary">
                  Team Workload
                </h1>
                <p className="text-sm text-muted-foreground">
                  Team capacity planning
                </p>
              </>
            )}
            {sidebarCollapsed && (
              <div className="text-center">
                <h1 className="text-lg font-bold text-primary">TW</h1>
              </div>
            )}
          </div>
        )}

        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`mb-4 ${sidebarCollapsed ? "w-8 h-8 p-0 mx-auto" : "w-full items-center justify-start"}`}
          >
            {sidebarCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <>
                <Menu className="mr-2 h-4 w-4" />
                <span className="text-xs text-muted-foreground">Recolher menu</span>
              </>
            )}
          </Button>
        )}

        <nav
          className={`${isMobile ? "flex flex-row justify-between w-full min-w-max px-1 items-center gap-1" : "space-y-1.5 flex-1"}`}
        >
          <Button
            variant={activeTab === "dashboard" ? "default" : "ghost"}
            className={`${
              isMobile
                ? "flex-col p-1 h-14 min-w-[52px] gap-0.5 rounded-lg"
                : sidebarCollapsed
                  ? "w-10 h-10 p-0 mx-auto"
                  : "w-full justify-start"
            }`}
            onClick={() => setActiveTab("dashboard")}
          >
            <Home
              className={`${isMobile ? "h-4 w-4" : sidebarCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"}`}
            />
            {!sidebarCollapsed && !isMobile && "Dashboard"}
            {isMobile && <span className="text-[10px] font-medium leading-tight">Home</span>}
          </Button>

          <Button
            variant={activeTab === "planning" ? "default" : "ghost"}
            className={`${
              isMobile
                ? "flex-col p-1 h-14 min-w-[52px] gap-0.5 rounded-lg"
                : sidebarCollapsed
                  ? "w-10 h-10 p-0 mx-auto"
                  : "w-full justify-start"
            } text-blue-600 dark:text-blue-400 font-semibold`}
            onClick={() => setActiveTab("planning")}
          >
            <BarChart3
              className={`${isMobile ? "h-4 w-4" : sidebarCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"}`}
            />
            {!sidebarCollapsed && !isMobile && "Alocação & Capacidade"}
            {isMobile && <span className="text-[10px] font-medium leading-tight">Alocação</span>}
          </Button>

          <Button
            variant={activeTab === "grid" ? "default" : "ghost"}
            className={`${
              isMobile
                ? "flex-col p-1 h-14 min-w-[52px] gap-0.5 rounded-lg"
                : sidebarCollapsed
                  ? "w-10 h-10 p-0 mx-auto"
                  : "w-full justify-start"
            } text-[#107c41] dark:text-[#28a745] font-semibold`}
            onClick={() => setActiveTab("grid")}
          >
            <Grid3X3
              className={`${isMobile ? "h-4 w-4" : sidebarCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"}`}
            />
            {!sidebarCollapsed && !isMobile && "Grade (Tarefas & Projetos)"}
            {isMobile && <span className="text-[10px] font-medium leading-tight">Grade</span>}
          </Button>

          <Button
            variant={activeTab === "gantt" ? "default" : "ghost"}
            className={`${
              isMobile
                ? "flex-col p-1 h-14 min-w-[52px] gap-0.5 rounded-lg"
                : sidebarCollapsed
                  ? "w-10 h-10 p-0 mx-auto"
                  : "w-full justify-start"
            } text-indigo-600 dark:text-indigo-400 font-semibold`}
            onClick={() => setActiveTab("gantt")}
          >
            <Layers
              className={`${isMobile ? "h-4 w-4" : sidebarCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"}`}
            />
            {!sidebarCollapsed && !isMobile && "Gráfico Gantt"}
            {isMobile && <span className="text-[10px] font-medium leading-tight">Gantt</span>}
          </Button>

          <Button
            variant={activeTab === "timesheet" ? "default" : "ghost"}
            className={`${
              isMobile
                ? "flex-col p-1 h-14 min-w-[52px] gap-0.5 rounded-lg"
                : sidebarCollapsed
                  ? "w-10 h-10 p-0 mx-auto"
                  : "w-full justify-start"
            } text-amber-600 dark:text-amber-400 font-semibold`}
            onClick={() => setActiveTab("timesheet")}
          >
            <Clock
              className={`${isMobile ? "h-4 w-4" : sidebarCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"}`}
            />
            {!sidebarCollapsed && !isMobile && "Apontamento de Horas"}
            {isMobile && <span className="text-[10px] font-medium leading-tight">Horas</span>}
          </Button>

          <Button
            variant={activeTab === "roadmap" ? "default" : "ghost"}
            className={`${
              isMobile
                ? "flex-col p-1 h-14 min-w-[52px] gap-0.5 rounded-lg"
                : sidebarCollapsed
                  ? "w-10 h-10 p-0 mx-auto"
                  : "w-full justify-start"
            }`}
            onClick={() => setActiveTab("roadmap")}
          >
            <Target
              className={`${isMobile ? "h-4 w-4" : sidebarCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"}`}
            />
            {!sidebarCollapsed && !isMobile && "Roadmap"}
            {isMobile && <span className="text-[10px] font-medium leading-tight">Roadmap</span>}
          </Button>

          <Button
            variant={activeTab === "xiaomi-calendar" ? "default" : "ghost"}
            className={`${
              isMobile
                ? "flex-col p-1 h-14 min-w-[52px] gap-0.5 rounded-lg"
                : sidebarCollapsed
                  ? "w-10 h-10 p-0 mx-auto"
                  : "w-full justify-start"
            } text-blue-600 dark:text-blue-400 font-semibold`}
            onClick={() => setActiveTab("xiaomi-calendar")}
          >
            <Smartphone
              className={`${isMobile ? "h-4 w-4" : sidebarCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"}`}
            />
            {!sidebarCollapsed && !isMobile && "Cal. Xiaomi"}
            {isMobile && <span className="text-[10px] font-medium leading-tight">Xiaomi</span>}
          </Button>

          <Button
            variant={activeTab === "reports" ? "default" : "ghost"}
            className={`${
              isMobile
                ? "flex-col p-1 h-14 min-w-[52px] gap-0.5 rounded-lg"
                : sidebarCollapsed
                  ? "w-10 h-10 p-0 mx-auto"
                  : "w-full justify-start"
            }`}
            onClick={() => setActiveTab("reports")}
          >
            <BarChart3
              className={`${isMobile ? "h-4 w-4" : sidebarCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"}`}
            />
            {!sidebarCollapsed && !isMobile && "Relatórios"}
            {isMobile && <span className="text-[10px] font-medium leading-tight">Relatórios</span>}
          </Button>

          <Button
            variant={activeTab === "employees" ? "default" : "ghost"}
            className={`${
              isMobile
                ? "flex-col p-1 h-14 min-w-[52px] gap-0.5 rounded-lg"
                : sidebarCollapsed
                  ? "w-10 h-10 p-0 mx-auto"
                  : "w-full justify-start"
            }`}
            onClick={() => setActiveTab("employees")}
          >
            <Users
              className={`${isMobile ? "h-4 w-4" : sidebarCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"}`}
            />
            {!sidebarCollapsed && !isMobile && "Colaboradores"}
            {isMobile && <span className="text-[10px] font-medium leading-tight">Equipe</span>}
          </Button>

          <Button
            variant={activeTab === "groups" ? "default" : "ghost"}
            className={`${
              isMobile
                ? "flex-col p-1 h-14 min-w-[52px] gap-0.5 rounded-lg"
                : sidebarCollapsed
                  ? "w-10 h-10 p-0 mx-auto"
                  : "w-full justify-start"
            } text-purple-600 dark:text-purple-400 font-semibold`}
            onClick={() => setActiveTab("groups")}
          >
            <Network
              className={`${isMobile ? "h-4 w-4" : sidebarCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"}`}
            />
            {!sidebarCollapsed && !isMobile && "Grupos de Trabalho"}
            {isMobile && <span className="text-[10px] font-medium leading-tight">Grupos</span>}
          </Button>

          <Button
            variant="ghost"
            className={`${
              isMobile
                ? "flex-col p-1 h-14 min-w-[52px] gap-0.5 rounded-lg text-destructive"
                : sidebarCollapsed
                  ? "w-10 h-10 p-0 mx-auto text-destructive"
                  : "w-full justify-start text-destructive hover:bg-destructive/10"
            }`}
            onClick={logout}
            title="Sair do sistema e voltar ao login"
          >
            <LogOut
              className={`${isMobile ? "h-4 w-4" : sidebarCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"}`}
            />
            {!sidebarCollapsed && !isMobile && "Sair da Conta"}
            {isMobile && <span className="text-[10px] font-medium leading-tight">Sair</span>}
          </Button>
        </nav>

        {!isMobile && (
          <div className="pt-3 border-t space-y-2">
            <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between px-1"}`}>
              {!sidebarCollapsed && (
                <span className="text-xs text-muted-foreground font-medium">Aparência</span>
              )}
              <ThemeToggleButton
                variant="outline"
                size="sm"
                className={sidebarCollapsed ? "w-10 h-10 p-0" : "h-8 px-2.5 text-xs"}
                showLabel={false}
              />
            </div>
            <Button
              variant={activeTab === "profile" ? "default" : "ghost"}
              className={`${sidebarCollapsed ? "w-10 h-10 p-0 mx-auto" : "w-full justify-start"} hover:bg-accent`}
              onClick={() => setActiveTab("profile")}
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs shrink-0">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : activeEmployee?.name ? activeEmployee.name.charAt(0).toUpperCase() : "U"}
              </div>
              {!sidebarCollapsed && (
                <div className="ml-2 text-left min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {user?.displayName || activeEmployee?.name || "Lucas Mendes"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {permissions.hierarchyTitle}
                  </p>
                </div>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Top Header Bar with Persona Switcher & Level Status */}
        {!isMobile && (
          <header className="h-12 border-b bg-card px-4 py-2 flex items-center justify-between shrink-0 shadow-xs z-20">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">
                {activeTab === "dashboard" && "Dashboard Geral"}
                {activeTab === "planning" && "Alocação & Capacidade"}
                {activeTab === "grid" && "Grade de Projetos & Tarefas"}
                {activeTab === "gantt" && "Gráfico Gantt com Dependências"}
                {activeTab === "timesheet" && "Apontamento de Horas & Histórico"}
                {activeTab === "groups" && "Administração de Grupos de Trabalho"}
                {activeTab === "roadmap" && "Roadmap Estratégico"}
                {activeTab === "xiaomi-calendar" && "Calendário Xiaomi"}
                {activeTab === "reports" && "Relatórios de Desempenho"}
                {activeTab === "employees" && "Gestão de Colaboradores"}
                {activeTab === "profile" && "Perfil de Usuário"}
              </span>

              {/* Hierarchy level badge */}
              <Badge variant="outline" className="text-[11px] font-medium border-primary/30 text-primary bg-primary/5">
                <Building2 className="w-3 h-3 mr-1" />
                {permissions.hierarchyTitle}
              </Badge>

              {permissions.isAdmin && (
                <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Persona Switcher Dropdown */}
              <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg border text-xs">
                <span className="text-muted-foreground text-[11px] font-medium">
                  Simulando:
                </span>
                <select
                  value={activeEmployeeId}
                  onChange={(e) => switchPersona(e.target.value)}
                  className="bg-transparent font-semibold text-xs text-foreground cursor-pointer outline-none"
                  title="Alterne de colaborador para testar visão hierárquica e permissões"
                >
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-popover text-popover-foreground">
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {!isMockCleared ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClearMockDialogOpen(true)}
                  className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
                  title="Limpar dados mock e iniciar com base vazia"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Mock
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setIsProcessingMock(true);
                    try {
                      await restoreMockData();
                    } finally {
                      setIsProcessingMock(false);
                    }
                  }}
                  disabled={isProcessingMock}
                  className="h-8 text-xs gap-1.5 text-primary hover:bg-primary/10"
                  title="Restaurar dados de exemplo"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Restaurar Mock
                </Button>
              )}

              <Button
                variant={activeTab === "groups" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("groups")}
                className="h-8 text-xs gap-1.5"
              >
                <Network className="w-3.5 h-3.5" />
                Grupos
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Sair do sistema e voltar ao login"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </Button>
            </div>
          </header>
        )}

        <main
          className={`flex-1 overflow-x-hidden ${
            activeTab === "xiaomi-calendar" || activeTab === "gantt" || activeTab === "planning" || activeTab === "grid" || activeTab === "timesheet" || activeTab === "groups"
              ? "h-full overflow-hidden p-0 flex flex-col"
              : `overflow-y-auto p-3 sm:p-5 md:p-6 ${isMobile ? "pb-24" : ""}`
          }`}
        >
          {activeTab === "planning" && (
            <div className="h-full w-full flex flex-col overflow-hidden pb-16 sm:pb-0">
              <ResourcePlanningView />
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h2>
              </div>

              {/* Metric summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-3 sm:p-4 flex items-center">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center mr-2.5 sm:mr-4 flex-shrink-0">
                      <Users className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        Colaboradores
                      </p>
                      <p className="text-lg sm:text-2xl font-bold">
                        {loading ? "..." : totalEmployees}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-3 sm:p-4 flex items-center">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center mr-2.5 sm:mr-4 flex-shrink-0">
                      <ListTodo className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        Tarefas Ativas
                      </p>
                      <p className="text-lg sm:text-2xl font-bold">
                        {loading ? "..." : activeTasks}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-3 sm:p-4 flex items-center">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-purple-100 flex items-center justify-center mr-2.5 sm:mr-4 flex-shrink-0">
                      <FolderOpen className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        Projetos
                      </p>
                      <p className="text-lg sm:text-2xl font-bold">
                        {loading ? "..." : totalProjects}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-3 sm:p-4 flex items-center">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-amber-100 flex items-center justify-center mr-2.5 sm:mr-4 flex-shrink-0">
                      <BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        Carga Média
                      </p>
                      <p className="text-lg sm:text-2xl font-bold">
                        {loading ? "..." : `${avgWorkload}%`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Calendar & Summary Flex Container */}
              <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-0">
                <div className="flex-1 min-w-0">
                  <WorkloadCalendar
                    selectedEmployeeId={selectedEmployeeId}
                    dataVersion={dataVersion}
                    onTaskAssigned={() => setDataVersion((v) => v + 1)}
                  />
                </div>
                <div className="w-full lg:w-80 flex-shrink-0">
                  <WorkloadSummary
                    selectedEmployeeId={selectedEmployeeId}
                    onEmployeeSelect={setSelectedEmployeeId}
                    dataVersion={dataVersion}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "employees" && (
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Gestão de Equipe</h2>
              <EmployeeList />
            </div>
          )}

          {activeTab === "grid" && (
            <div className="h-full w-full flex flex-col overflow-hidden pb-16 sm:pb-0 border rounded-lg shadow-sm">
              <ProjectGridSheet onDataChange={loadDashboardData} />
            </div>
          )}

          {activeTab === "timesheet" && (
            <div className="h-full w-full flex flex-col overflow-hidden pb-16 sm:pb-0 border rounded-lg shadow-sm">
              <TimeTrackingSheet onDataChange={loadDashboardData} />
            </div>
          )}

          {activeTab === "roadmap" && (
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Roadmap Estratégico</h2>
              <Roadmap />
            </div>
          )}

          {activeTab === "gantt" && (
            <div className="h-full w-full flex flex-col overflow-hidden pb-16 sm:pb-0">
              <GanttChart onTaskChange={loadDashboardData} />
            </div>
          )}

          {activeTab === "xiaomi-calendar" && (
            <div className="h-full w-full flex flex-col overflow-hidden pb-16 sm:pb-0">
              <XiaomiCalendar onTaskChange={loadDashboardData} />
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-4">
              <ReportsView />
            </div>
          )}

          {activeTab === "profile" && (
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Perfil de Usuário</h2>
              <UserProfile
                isOpen={true}
                onClose={() => setActiveTab("dashboard")}
              />
            </div>
          )}

          {activeTab === "groups" && (
            <div className="h-full w-full flex flex-col overflow-y-auto">
              <WorkGroupAdmin />
            </div>
          )}

        </main>

        {/* Global Floating Time Tracker (Clockify style) */}
        <FloatingTimeTracker
          onTimeLogged={loadDashboardData}
          onOpenTimesheet={() => setActiveTab("timesheet")}
        />
      </div>

      {/* CLEAR MOCK DATA CONFIRMATION DIALOG */}
      <Dialog open={isClearMockDialogOpen} onOpenChange={setIsClearMockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5 text-destructive" />
              Limpar Dados de Demonstração?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Deseja remover todos os dados pré-carregados (colaboradores mock, tarefas e projetos de exemplo) para iniciar o sistema com uma base 100% limpa?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1.5 border">
            <p className="font-semibold text-foreground">Aviso:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 text-[11px]">
              <li>A base de tarefas, projetos e colaboradores ficará vazia.</li>
              <li>Você poderá cadastrar sua própria equipe e projetos reais.</li>
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
                  setIsClearMockDialogOpen(false);
                  loadDashboardData();
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

export default HomePage;
