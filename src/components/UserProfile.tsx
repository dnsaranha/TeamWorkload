import React, { useState, useEffect } from "react";
import { X, User, Mail, Calendar, Settings, LogIn, LogOut, ShieldCheck, CheckCircle2 } from "lucide-react";
import {
  userProfileService,
  UserProfile as UserProfileType,
} from "../lib/userProfileService";
import { auth } from "../lib/firebase";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface UserProfileProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({
  isOpen = true,
  onClose = () => {},
}) => {
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
  });
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);

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
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      {isGoogleAuth ? "Conectado via Google" : "Modo Local / Convidado"}
                      {isGoogleAuth && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
                        </Badge>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isGoogleAuth ? "Sincronizado com Firebase Cloud Firestore" : "Entre com sua conta Google para sincronizar"}
                    </p>
                  </div>
                </div>

                {isGoogleAuth ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="text-xs h-7 text-rose-500 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950"
                  >
                    <LogOut className="h-3 w-3 mr-1" /> Sair
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleGoogleLogin}
                    className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <LogIn className="h-3 w-3 mr-1" /> Entrar com Google
                  </Button>
                )}
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
    </div>
  );
};

export default UserProfile;
