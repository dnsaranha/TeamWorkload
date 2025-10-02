import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, 
  Users, 
  Plus, 
  Settings, 
  UserPlus, 
  Crown, 
  Shield, 
  User, 
  Eye,
  Trash2,
  Check,
  X,
  LogOut,
  Mail
} from "lucide-react";
import { 
  workspaceService, 
  workspaceMemberService, 
  userProfileService,
  supabase,
  type Workspace, 
  type WorkspaceMember, 
  type UserProfile 
} from "@/lib/supabaseClient";

interface WorkspaceManagerProps {
  onWorkspaceChange?: () => void;
}

const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({ onWorkspaceChange }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationCount, setInvitationCount] = useState(0);
  
  // Dialog states
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
  
  // Form states
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "guest">("member");

  useEffect(() => {
    loadData();
    loadInvitationCount();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workspacesData, profileData] = await Promise.all([
        workspaceService.getAll(),
        userProfileService.getCurrentUser(),
      ]);
      
      setWorkspaces(workspacesData);
      setUserProfile(profileData);
      
      if (profileData?.current_workspace_id) {
        const current = workspacesData.find(w => w.id === profileData.current_workspace_id);
        if (current) {
          setCurrentWorkspace(current);
          await loadMembers(current.id);
        }
      } else if (workspacesData.length > 0) {
        // Set first workspace as current if none selected
        await switchWorkspace(workspacesData[0].id);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadInvitationCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setInvitationCount(data?.length || 0);
    } catch (error: any) {
      console.error('Error loading invitation count:', error);
    }
  };

  const loadMembers = async (workspaceId: string) => {
    try {
      const membersData = await workspaceMemberService.getMembers(workspaceId);
      setMembers(membersData);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    try {
      await userProfileService.switchWorkspace(workspaceId);
      const workspace = workspaces.find(w => w.id === workspaceId);
      setCurrentWorkspace(workspace || null);
      await loadMembers(workspaceId);
      onWorkspaceChange?.();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const createWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    
    try {
      setLoading(true);
      const workspace = await workspaceService.create({
        name: newWorkspaceName,
        description: newWorkspaceDescription,
      });
      
      await loadData();
      await switchWorkspace(workspace.id);
      
      setIsCreateWorkspaceOpen(false);
      setNewWorkspaceName("");
      setNewWorkspaceDescription("");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !currentWorkspace) return;
    
    try {
      setLoading(true);
      await workspaceMemberService.inviteMember(currentWorkspace.id, inviteEmail, inviteRole);
      await loadMembers(currentWorkspace.id);
      
      setIsInviteMemberOpen(false);
      setInviteEmail("");
      setInviteRole("member");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, role: "admin" | "member" | "guest") => {
    try {
      await workspaceMemberService.updateMemberRole(memberId, role);
      await loadMembers(currentWorkspace!.id);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await workspaceMemberService.removeMember(memberId);
      await loadMembers(currentWorkspace!.id);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'guest': return <Eye className="h-4 w-4 text-gray-500" />;
      default: return <User className="h-4 w-4 text-green-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'guest': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Notification for pending invitations */}
      {invitationCount > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Mail className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Você tem {invitationCount} convite{invitationCount > 1 ? 's' : ''} pendente{invitationCount > 1 ? 's' : ''} para workspace{invitationCount > 1 ? 's' : ''}. 
            Verifique acima para aceitar ou recusar.
          </AlertDescription>
        </Alert>
      )}

      {/* Workspace Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Building2 className="h-5 w-5 text-gray-600" />
          <Select
            value={currentWorkspace?.id || ""}
            onValueChange={switchWorkspace}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecione um workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Workspace</DialogTitle>
                <DialogDescription>
                  Crie um novo workspace para organizar sua equipe e projetos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="workspace-name">Nome do Workspace</Label>
                  <Input
                    id="workspace-name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="Nome do workspace"
                  />
                </div>
                <div>
                  <Label htmlFor="workspace-description">Descrição (opcional)</Label>
                  <Input
                    id="workspace-description"
                    value={newWorkspaceDescription}
                    onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                    placeholder="Descrição do workspace"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createWorkspace} disabled={loading || !newWorkspaceName.trim()}>
                  Criar Workspace
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {currentWorkspace && (
            <Dialog open={isWorkspaceSettingsOpen} onOpenChange={setIsWorkspaceSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Configurações do Workspace</DialogTitle>
                  <DialogDescription>
                    Gerencie membros e configurações do workspace "{currentWorkspace.name}".
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="members" className="w-full">
                  <TabsList>
                    <TabsTrigger value="members">Membros</TabsTrigger>
                    <TabsTrigger value="settings">Configurações</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="members" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Membros do Workspace</h3>
                      <Dialog open={isInviteMemberOpen} onOpenChange={setIsInviteMemberOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Convidar Membro
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Convidar Membro</DialogTitle>
                            <DialogDescription>
                              Convide um novo membro para o workspace.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="invite-email">Email</Label>
                              <Input
                                id="invite-email"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="email@exemplo.com"
                              />
                            </div>
                            <div>
                              <Label htmlFor="invite-role">Função</Label>
                              <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                  <SelectItem value="member">Membro</SelectItem>
                                  <SelectItem value="guest">Convidado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={inviteMember} disabled={loading || !inviteEmail.trim()}>
                              Enviar Convite
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getRoleIcon(member.role)}
                                <div>
                                  <p className="font-medium">{(member as any).users?.full_name || (member as any).users?.email}</p>
                                  <p className="text-sm text-gray-500">{(member as any).users?.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(member.role)}>
                                {member.role === 'owner' ? 'Proprietário' :
                                 member.role === 'admin' ? 'Administrador' :
                                 member.role === 'guest' ? 'Convidado' : 'Membro'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                                {member.status === 'active' ? 'Ativo' : 
                                 member.status === 'pending' ? 'Pendente' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {member.role !== 'owner' && (
                                <div className="flex items-center space-x-2">
                                  <Select
                                    value={member.role}
                                    onValueChange={(value: any) => updateMemberRole(member.id, value)}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="member">Membro</SelectItem>
                                      <SelectItem value="guest">Convidado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeMember(member.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  
                  <TabsContent value="settings" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Informações do Workspace</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Nome</Label>
                          <Input value={currentWorkspace.name} readOnly />
                        </div>
                        <div>
                          <Label>Descrição</Label>
                          <Input value={currentWorkspace.description || ""} readOnly />
                        </div>
                        <div>
                          <Label>Criado em</Label>
                          <Input value={new Date(currentWorkspace.created_at).toLocaleDateString('pt-BR')} readOnly />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          )}

          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      {/* Current Workspace Info */}
      {currentWorkspace && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{currentWorkspace.name}</h3>
                {currentWorkspace.description && (
                  <p className="text-sm text-gray-600">{currentWorkspace.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{members.length} membros</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default WorkspaceManager;