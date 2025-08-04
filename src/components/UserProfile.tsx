import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  User,
  Calendar,
  Settings,
  Link,
  Unlink,
  CheckCircle,
  AlertCircle,
  Save,
  Mail,
  Shield,
} from "lucide-react";
import { userProfileService, type UserProfile } from "@/lib/userProfileService";
import { googleCalendarService } from "@/lib/googleCalendarService";

interface UserProfileProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const UserProfileComponent = ({
  isOpen = true,
  onClose = () => {},
}: UserProfileProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userProfile = await userProfileService.getCurrentProfile();
      if (userProfile) {
        setProfile(userProfile);
        setFormData({
          name: userProfile.name,
          email: userProfile.email,
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const updatedProfile = await userProfileService.updateProfile({
        name: formData.name,
        email: formData.email,
      });

      if (updatedProfile) {
        setProfile(updatedProfile);
        alert("Perfil atualizado com sucesso!");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Erro ao salvar perfil. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      setConnectingGoogle(true);

      // Check if we have the required environment variables
      if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        alert(
          "Configuração do Google Calendar não encontrada. Verifique as variáveis de ambiente.",
        );
        return;
      }

      // Generate OAuth URL and redirect
      const authUrl = googleCalendarService.generateAuthUrl();

      // Store the current URL to return to after auth
      localStorage.setItem("google_auth_return_url", window.location.href);

      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error connecting Google Calendar:", error);
      alert("Erro ao conectar com Google Calendar. Tente novamente.");
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    try {
      await googleCalendarService.disconnect();
      await loadProfile(); // Reload profile to update connection status
      alert("Google Calendar desconectado com sucesso!");
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
      alert("Erro ao desconectar Google Calendar. Tente novamente.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-lg font-medium">Carregando perfil...</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!profile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <div className="text-lg font-medium">Erro ao carregar perfil</div>
              <Button onClick={loadProfile} className="mt-4">
                Tentar novamente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Configurações do Perfil
          </DialogTitle>
          <DialogDescription>
            Gerencie suas informações pessoais e integrações
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {profile.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{profile.name}</h3>
                    <p className="text-muted-foreground">{profile.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        Membro desde{" "}
                        {new Date(profile.created_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Google Calendar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Google Calendar</h4>
                      <p className="text-sm text-muted-foreground">
                        {profile.google_calendar_connected
                          ? `Conectado como ${profile.google_calendar_email}`
                          : "Sincronize seus eventos e reuniões"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {profile.google_calendar_connected ? (
                      <>
                        <Badge
                          variant="default"
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Conectado
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Unlink className="h-4 w-4 mr-2" />
                              Desconectar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Desconectar Google Calendar
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja desconectar sua conta do
                                Google Calendar? Você não poderá mais visualizar
                                eventos do Google no calendário de workload.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDisconnectGoogleCalendar}
                              >
                                Desconectar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : (
                      <Button
                        onClick={handleConnectGoogleCalendar}
                        disabled={connectingGoogle}
                        className="flex items-center gap-2"
                      >
                        {connectingGoogle ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            Conectando...
                          </>
                        ) : (
                          <>
                            <Link className="h-4 w-4" />
                            Conectar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {profile.google_calendar_connected && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">
                        Integração Ativa
                      </span>
                    </div>
                    <p className="text-sm text-green-700">
                      Seus eventos do Google Calendar estão sendo sincronizados
                      automaticamente e aparecerão no calendário de workload.
                    </p>
                  </div>
                )}

                {!profile.google_calendar_connected && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">
                        Benefícios da Integração
                      </span>
                    </div>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>
                        • Visualize reuniões e eventos no calendário de workload
                      </li>
                      <li>
                        • Calcule automaticamente a ocupação incluindo reuniões
                      </li>
                      <li>• Evite conflitos de agendamento</li>
                      <li>• Sincronização em tempo real</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Segurança e Privacidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Tokens de Acesso</h4>
                        <p className="text-sm text-muted-foreground">
                          Tokens são armazenados de forma segura usando cookies
                          httpOnly
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Seguro</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Permissões do Google</h4>
                        <p className="text-sm text-muted-foreground">
                          Acesso somente leitura aos seus calendários
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Somente Leitura</Badge>
                  </div>

                  <div className="p-4 bg-gray-50 border rounded-lg">
                    <h4 className="font-medium mb-2">
                      Informações de Segurança
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>
                        • Seus dados são criptografados em trânsito e em repouso
                      </li>
                      <li>• Não armazenamos senhas ou informações sensíveis</li>
                      <li>• Você pode revogar o acesso a qualquer momento</li>
                      <li>• Tokens de acesso expiram automaticamente</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileComponent;
