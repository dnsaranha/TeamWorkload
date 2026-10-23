import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Calendar,
  Settings,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Database,
  Sparkles,
  Lock,
  AlertTriangle,
} from "lucide-react";
import {
  userProfileService,
  UserProfile as UserProfileType,
} from "../lib/userProfileService";
import { auth } from "../lib/firebase";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useAuth } from "../lib/authContext";

interface UserProfileProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({
  isOpen = true,
  onClose = () => {},
}) => {
  const {
    logout,
    user: authUser,
    permissions,
    isSuperAdmin,
    isMockCleared,
    clearMockData,
    restoreMockData,
    refreshUserData,
    purgeAllUserData,
    deleteUserAccount,
  } = useAuth();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isClearMockModalOpen, setIsClearMockModalOpen] = useState(false);
  const [isProcessingMock, setIsProcessingMock] = useState(false);

  // Danger Zone States: Clear Personal Data & Account Deletion
  const [isPurgeUserDataModalOpen, setIsPurgeUserDataModalOpen] = useState(false);
  const [isProcessingPurge, setIsProcessingPurge] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isProcessingDeleteAccount, setIsProcessingDeleteAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
  });
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);

  const canManageSystemData = Boolean(
    isSuperAdmin || permissions?.isAdmin || permissions?.isSuperAdmin || Boolean(authUser)
  );

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userProfile = await userProfileService.getCurrentUser();
      setProfile(userProfile);
      setIsGoogleAuth(Boolean(auth.currentUser));
      if (userProfile) {
        setFormData({
          full_name: userProfile.full_name,
          email: userProfile.email,
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const userProfile = await userProfileService.loginWithGoogle();
      if (userProfile) {
        setProfile(userProfile);
        setIsGoogleAuth(true);
        setFormData({
          full_name: userProfile.full_name,
          email: userProfile.email,
        });
      }
    } catch (error) {
      console.error("Google login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await userProfileService.logout();
      setIsGoogleAuth(false);
      loadProfile();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!profile) return;

      const updatedProfile = await userProfileService.updateProfile({
        full_name: formData.full_name,
        email: formData.email,
      });

      if (updatedProfile) {
        setProfile(updatedProfile);
        setEditing(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        email: profile.email,
      });
    }
    setEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Perfil do Usuário</h2>
              <p className="text-xs text-muted-foreground">Autenticação Firebase & Google</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-xs text-muted-foreground">Carregando dados da conta...</p>
            </div>
          ) : profile ? (
            <div className="space-y-5">
              {/* Google Auth Status Banner */}
              <div className="p-3 rounded-xl border flex items-center justify-between bg-muted/40 border-border">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-xs border flex items-center justify-center text-xs font-bold text-blue-600">
                    G
                  </div>
                  <div>
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      {isGoogleAuth ? "Conectado via Google" : "Modo Local / Convidado"}
                      {isGoogleAuth && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {isGoogleAuth ? "Sincronizado com Firebase Cloud Firestore" : "Entre com sua conta Google para sincronizar"}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await logout();
                    onClose();
                  }}
                  className="text-xs h-7 text-rose-500 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950 gap-1"
                >
                  <LogOut className="h-3 w-3" /> Sair da Conta
                </Button>
              </div>

              {/* Avatar */}
              <div className="flex flex-col items-center justify-center pt-1">
                <div className="w-20 h-20 rounded-full border-2 border-primary/20 p-1 flex items-center justify-center relative shadow-sm">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                      {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                  {isGoogleAuth && (
                    <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-background shadow-xs">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-bold mt-2">{profile.full_name}</h3>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
              </div>

              {/* Profile Details */}
              <div className="space-y-3.5 pt-2 border-t border-border">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Nome Completo
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 text-xs font-medium bg-muted/40 p-2 rounded-lg border border-border">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{profile.full_name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Email Google / Firebase
                  </label>
                  {editing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 text-xs font-medium bg-muted/40 p-2 rounded-lg border border-border">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{profile.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Membro Desde
                  </label>
                  <div className="flex items-center space-x-2 text-xs font-medium bg-muted/40 p-2 rounded-lg border border-border">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>

                {/* Seção Administrativa: Gestão da Base & Dados Mock */}
                <div className="pt-3 border-t border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Database className="w-3.5 h-3.5 text-primary" />
                      <span>Base de Dados & Dados Mock</span>
                    </div>
                    {canManageSystemData ? (
                      <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        {isSuperAdmin ? "Super Admin" : "Administrador"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                        <Lock className="w-3 h-3 mr-1" />
                        Restrito a Admins
                      </Badge>
                    )}
                  </div>

                  {canManageSystemData ? (
                    <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-2 text-xs">
                      <div>
                        <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          {isMockCleared ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Base de Dados Limpa
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              Dados de Demonstração (Mock) Ativos
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {isMockCleared
                            ? "A base está 100% limpa (sem tarefas, projetos ou colaboradores de exemplo)."
                            : "O sistema contém dados de teste para demonstração de gráficos e alocações."}
                        </p>
                      </div>

                      <div className="pt-1 flex items-center gap-2">
                        {!isMockCleared ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsClearMockModalOpen(true)}
                            className="text-xs h-8 gap-1.5 font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Limpar Todos os Dados Mock
                          </Button>
                        ) : (
                          <Button
                            type="button"
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
                            className="text-xs h-8 gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            {isProcessingMock ? "Restaurando..." : "Restaurar Dados Mock"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-muted/20 rounded-lg border text-xs text-muted-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                      <span>
                        Apenas usuários com privilégio de Administrador ou Super Administrador podem limpar os dados mock.
                      </span>
                    </div>
                  )}
                </div>

                {/* Zona de Perigo: Privacidade, Limpeza de Dados Pessoais e Exclusão de Conta */}
                <div className="pt-3 border-t border-destructive/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                      <span>Privacidade & Gestão de Conta</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 bg-destructive/5">
                      Zona de Perigo
                    </Badge>
                  </div>

                  <div className="p-3 bg-destructive/5 rounded-xl border border-destructive/20 space-y-3 text-xs">
                    {/* Item 1: Limpar Todos os Meus Dados */}
                    <div className="space-y-1">
                      <div className="font-semibold text-xs text-foreground flex items-center justify-between">
                        <span>Limpar Meus Dados Próprios</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Exclui permanentemente todas as suas tarefas, projetos, colaboradores, apontamentos de horas e grupos de trabalho criados no Firestore, zerando seu workspace.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPurgeUserDataModalOpen(true)}
                        className="text-xs h-7 mt-1 text-destructive border-destructive/40 hover:bg-destructive/10 gap-1.5 font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                        Limpar Todos os Meus Dados
                      </Button>
                    </div>

                    <div className="border-t border-destructive/15 pt-2 space-y-1">
                      <div className="font-semibold text-xs text-foreground">
                        Excluir Conta Permanentemente
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Remove sua conta de autenticação (Firebase Auth / Google), seu perfil de usuário e todos os registros associados. Ação irreversível.
                      </p>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeleteAccountError(null);
                          setIsDeleteAccountModalOpen(true);
                        }}
                        className="text-xs h-7 mt-1 gap-1.5 font-semibold bg-red-600 hover:bg-red-700 text-white"
                      >
                        <LogOut className="w-3 h-3" />
                        Excluir Minha Conta
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                {editing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      className="text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSave}
                      className="text-xs"
                    >
                      Salvar Alterações
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                    className="text-xs gap-1.5"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Editar Dados</span>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Nenhum perfil encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Clearing Mock Data */}
      <Dialog open={isClearMockModalOpen} onOpenChange={setIsClearMockModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5 text-destructive" />
              Limpar Todos os Dados de Demonstração?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Esta ação removerá todos os colaboradores, projetos, tarefas, apontamentos de horas e grupos de demonstração.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1.5 border">
            <p className="font-semibold text-foreground">O que acontecerá:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 text-[11px]">
              <li>Todas as tarefas e projetos de exemplo serão removidos.</li>
              <li>A base ficará pronta para cadastro dos seus colaboradores e projetos reais.</li>
              <li>Você poderá restaurar os dados de exemplo quando desejar nesta mesma tela.</li>
            </ul>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsClearMockModalOpen(false)}
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
                  setIsClearMockModalOpen(false);
                } finally {
                  setIsProcessingMock(false);
                }
              }}
              className="gap-1.5 font-semibold"
            >
              {isProcessingMock ? "Limpando..." : "Confirmar e Limpar Mock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Clearing All Personal Data */}
      <Dialog open={isPurgeUserDataModalOpen} onOpenChange={setIsPurgeUserDataModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5 text-destructive" />
              Limpar Todos os Meus Dados?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Esta ação excluirá permanentemente todos os registros próprios criados por você (tarefas, projetos, colaboradores, apontamentos de horas e grupos de trabalho no banco de dados Firestore).
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1.5 border">
            <p className="font-semibold text-foreground">Consequências desta ação:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 text-[11px]">
              <li>Todas as tarefas, projetos e apontamentos de tempo serão apagados.</li>
              <li>Todos os grupos de trabalho e alocações criados serão removidos.</li>
              <li>Seu perfil e login permanecerão ativos, mas com workspace totalmente limpo.</li>
              <li>Esta ação é definitiva e não pode ser desfeita.</li>
            </ul>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessingPurge}
              onClick={() => setIsPurgeUserDataModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isProcessingPurge}
              onClick={async () => {
                setIsProcessingPurge(true);
                try {
                  if (typeof purgeAllUserData === "function") {
                    await purgeAllUserData();
                  } else {
                    await userProfileService.purgeAllUserData();
                    await refreshUserData();
                  }
                  setIsPurgeUserDataModalOpen(false);
                } catch (err: any) {
                  console.error("Purge data error:", err);
                } finally {
                  setIsProcessingPurge(false);
                }
              }}
              className="gap-1.5 font-semibold"
            >
              {isProcessingPurge ? "Limpando Dados..." : "Sim, Limpar Meus Dados"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Permanent Account Deletion */}
      <Dialog open={isDeleteAccountModalOpen} onOpenChange={setIsDeleteAccountModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Excluir Minha Conta Permanentemente?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Atenção: Você está prestes a excluir definitivamente sua conta de acesso, seus dados pessoais e seu perfil.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-destructive/10 rounded-lg text-xs space-y-2 border border-destructive/20 text-destructive-foreground">
            <p className="font-bold text-destructive flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Esta operação é permanente e irreversível!
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 text-[11px]">
              <li>Sua conta no Firebase Authentication será excluída.</li>
              <li>Seu perfil em <code>profiles/{profile?.id || "uid"}</code> será removido.</li>
              <li>Todos os seus projetos, tarefas, alocações e grupos serão excluídos.</li>
              <li>Você será desconectado e sua sessão será encerrada.</li>
            </ul>
          </div>

          {deleteAccountError && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              {deleteAccountError}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessingDeleteAccount}
              onClick={() => {
                setIsDeleteAccountModalOpen(false);
                setDeleteAccountError(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isProcessingDeleteAccount}
              onClick={async () => {
                setIsProcessingDeleteAccount(true);
                setDeleteAccountError(null);
                try {
                  if (typeof deleteUserAccount === "function") {
                    await deleteUserAccount();
                  } else {
                    await userProfileService.deleteAccount();
                    await logout();
                  }
                  setIsDeleteAccountModalOpen(false);
                  onClose();
                } catch (err: any) {
                  console.error("Account deletion error:", err);
                  if (err.message === "REQUIRES_RECENT_LOGIN") {
                    setDeleteAccountError(
                      "Por segurança da sua conta Google/Firebase, o provedor exige que você faça login novamente antes de prosseguir com a exclusão. Saia e entre novamente para concluir."
                    );
                  } else {
                    setDeleteAccountError(
                      err.message || "Erro ao excluir conta. Tente novamente."
                    );
                  }
                } finally {
                  setIsProcessingDeleteAccount(false);
                }
              }}
              className="gap-1.5 font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              {isProcessingDeleteAccount ? "Excluindo Conta..." : "Sim, Excluir Minha Conta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserProfile;
