import React, { useState } from "react";
import {
  LogIn,
  UserPlus,
  Shield,
  Layers,
  Building2,
  Users2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Lock,
  Mail,
  User,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { useAuth } from "../lib/authContext";
import { HIERARCHY_LEVELS } from "../lib/workGroupService";

interface LoginPageProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  asModal?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onCancel,
  asModal = false,
}) => {
  const {
    user,
    loading,
    loginGoogle,
    loginEmail,
    registerEmail,
    logout,
    switchPersona,
    activeEmployeeId,
    allEmployees,
  } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setErrorMsg(null);
      setIsSubmitting(true);
      await loginGoogle();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao conectar com Google");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Por favor, preencha o e-mail e a senha.");
      return;
    }

    try {
      setErrorMsg(null);
      setIsSubmitting(true);
      if (isRegister) {
        await registerEmail(email, password, name || email.split("@")[0]);
      } else {
        await loginEmail(email, password);
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setErrorMsg("E-mail ou senha incorretos.");
      } else if (err.code === "auth/email-already-in-use") {
        setErrorMsg("Este e-mail já está cadastrado. Faça login.");
      } else if (err.code === "auth/weak-password") {
        setErrorMsg("A senha deve ter no mínimo 6 caracteres.");
      } else {
        setErrorMsg(err.message || "Erro de autenticação.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPersona = (empId: string) => {
    switchPersona(empId);
    if (onSuccess) onSuccess();
  };

  const personas = [
    {
      id: "emp-4",
      name: "Lucas Mendes",
      role: "Diretor de Operações & Tecnologia",
      level: 1,
      levelTitle: "Nível 1 • Diretoria Estratégica",
      badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-300",
      description: "Visão global total de todos os departamentos, coordenações e squads da organização.",
    },
    {
      id: "emp-2",
      name: "Carlos Eduardo",
      role: "Coordenador de Engenharia / Arquiteto",
      level: 2,
      levelTitle: "Nível 2/3 • Departamento & Coordenação",
      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-300",
      description: "Visão da área de Engenharia e de todos os squads técnicos (Frontend e Backend).",
    },
    {
      id: "emp-1",
      name: "Ana Silva",
      role: "Tech Lead Frontend",
      level: 4,
      levelTitle: "Nível 4 • Squad Frontend",
      badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300",
      description: "Liderança de Squad: edita e cria tarefas e projetos para a sua célula de trabalho.",
    },
    {
      id: "emp-3",
      name: "Beatriz Lima",
      role: "Product Designer UI/UX",
      level: 4,
      levelTitle: "Nível 4 • Colaboradora Multidisciplinar",
      badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300",
      description: "Membro de squad com permissão de criação e visualização.",
    },
  ];

  return (
    <div className={`w-full ${asModal ? "" : "min-h-[85vh] flex items-center justify-center p-4 bg-muted/20"}`}>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            Autenticação & Controle de Acesso Baseado em Papéis (RBAC)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Portal de Acesso & Gestão de Equipe
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Faça login com sua conta corporativa Google ou acesse rapidamente as personas para simular a hierarquia entre Diretorias, Departamentos e Squads.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 text-sm bg-destructive/15 text-destructive border border-destructive/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Form & Google Auth */}
          <div className="md:col-span-7">
            <Card className="shadow-md border-border/80 h-full flex flex-col justify-between">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{isRegister ? "Criar Nova Conta" : "Identificação do Usuário"}</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    Firebase Auth
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {isRegister
                    ? "Cadastre suas credenciais para acessar os grupos de trabalho"
                    : "Entre com suas credenciais ou com sua conta Google"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Google Sign In Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="w-full h-11 relative flex items-center justify-center gap-3 border-gray-300 dark:border-gray-700 hover:bg-muted/70 transition-all font-medium text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continuar com o Google</span>
                </Button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-muted"></div>
                  <span className="flex-shrink mx-3 text-xs text-muted-foreground uppercase font-semibold">
                    ou via e-mail e senha
                  </span>
                  <div className="flex-grow border-t border-muted"></div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailAuth} className="space-y-3.5">
                  {isRegister && (
                    <div className="space-y-1">
                      <Label htmlFor="auth-name" className="text-xs">
                        Nome Completo
                      </Label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input
                          id="auth-name"
                          type="text"
                          placeholder="Ex: Carlos Eduardo"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-9 h-10 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="auth-email" className="text-xs">
                      Endereço de E-mail
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        id="auth-email"
                        type="email"
                        required
                        placeholder="nome@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="auth-pass" className="text-xs">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        id="auth-pass"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 h-10 text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 gap-2 text-sm font-semibold mt-2"
                  >
                    {isRegister ? (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Cadastrar e Entrar
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        Entrar no Sistema
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setErrorMsg(null);
                  }}
                  className="hover:underline text-primary font-medium"
                >
                  {isRegister
                    ? "Já possui uma conta? Faça login"
                    : "Não possui conta? Cadastre-se"}
                </button>
                {onCancel && (
                  <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">
                    Continuar como Convidado
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          {/* Right Column: Personas & Hierarchy Preview */}
          <div className="md:col-span-5 flex flex-col space-y-4">
            <Card className="shadow-md border-border/80 flex-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Personas de Teste Rápido
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px]">
                    1 Clique
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Alterne entre os diferentes níveis para testar a visibilidade de subgrupos e permissões de edição/criação:
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2.5">
                {personas.map((p) => {
                  const isSelected = activeEmployeeId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPersona(p.id)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/40"
                          : "hover:bg-muted/60 border-border/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm">{p.name}</span>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{p.role}</p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${p.badgeColor} shrink-0`}
                        >
                          {p.levelTitle}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
                        {p.description}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Quick Hierarchy Rules Explainer */}
            <div className="p-3.5 rounded-lg border bg-accent/40 text-xs space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                Como funciona a Hierarquia Organizacional:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
                <li>
                  <strong className="text-foreground">Visão Descendente:</strong> Quem está no Nível 1 ou 2 visualiza automaticamente todos os subgrupos e membros dos níveis inferiores.
                </li>
                <li>
                  <strong className="text-foreground">Grupos Compartilhados:</strong> Vários squads (ex: Frontend e Backend) podem compartilhar do mesmo departamento superior.
                </li>
                <li>
                  <strong className="text-foreground">Permissões Granulares:</strong> Administradores de grupo podem conceder direitos de criar, editar ou excluir registros.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
