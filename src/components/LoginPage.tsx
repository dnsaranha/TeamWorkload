import React, { useState } from "react";
import {
  LogIn,
  UserPlus,
  Shield,
  Lock,
  Mail,
  User,
  AlertCircle,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { useAuth } from "../lib/authContext";
import { PWAInstallButton } from "./PWAInstallButton";
import { ThemeToggleButton } from "../lib/theme";

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { loginGoogle, loginEmail, registerEmail } = useAuth();

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
      console.error("Google login error:", err);
      if (err.code === "auth/unauthorized-domain") {
        setErrorMsg(
          "O domínio atual (teamworkload.vercel.app) ainda não está na lista de Domínios Autorizados do Firebase Console. Para habilitar o login Google no Vercel, acesse o Firebase Console > Authentication > Settings > Authorized Domains e adicione 'teamworkload.vercel.app'. Você também pode entrar ou se cadastrar com e-mail corporativo abaixo."
        );
      } else if (err.code === "auth/popup-blocked") {
        setErrorMsg("O popup de login do Google foi bloqueado pelo navegador. Toque novamente para tentar o redirecionamento direto.");
      } else if (err.code === "auth/popup-closed-by-user") {
        setErrorMsg("A janela de login com o Google foi fechada antes de concluir a autenticação.");
      } else {
        setErrorMsg(err.message || "Erro ao autenticar com a conta Google.");
      }
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
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        setErrorMsg("E-mail ou senha incorretos.");
      } else if (err.code === "auth/email-already-in-use") {
        setErrorMsg("Este e-mail já está cadastrado. Alterne para entrar.");
      } else if (err.code === "auth/weak-password") {
        setErrorMsg("A senha deve ter no mínimo 6 caracteres.");
      } else {
        setErrorMsg(err.message || "Erro durante autenticação.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-muted/20 relative">
      {/* Top Utility Bar */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <PWAInstallButton variant="outline" size="sm" className="bg-background/80 shadow-xs text-xs" />
        <ThemeToggleButton />
      </div>

      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-sm mx-auto mb-1">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            Portal Corporativo • Acesso Restrito
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            TeamWorkload
          </h1>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Gestão de Equipe, Planejamento de Carga de Trabalho e Grupos Hierárquicos
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs bg-destructive/15 text-destructive border border-destructive/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Card className="shadow-lg border-border/80">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-lg">
              {isRegister ? "Cadastrar Novo Acesso" : "Entrar no Sistema"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isRegister
                ? "Crie sua conta para acessar seu painel de trabalho"
                : "Acesse com sua conta Google institucional ou via e-mail e senha"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Google Sign In Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full h-11 relative flex items-center justify-center gap-3 border-gray-300 dark:border-gray-700 hover:bg-muted/70 transition-all font-medium text-sm shadow-xs"
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
              <span className="flex-shrink mx-3 text-[11px] text-muted-foreground uppercase font-semibold">
                ou com e-mail corporativo
              </span>
              <div className="flex-grow border-t border-muted"></div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
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
                    placeholder="colaborador@empresa.com"
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
                className="w-full h-10 gap-2 text-sm font-semibold mt-2 shadow-xs"
              >
                {isRegister ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Cadastrar e Entrar
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Entrar no TeamWorkload
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-2 pb-4 border-t flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg(null);
              }}
              className="hover:underline text-primary font-medium"
            >
              {isRegister
                ? "Já possui uma conta cadastrada? Faça login aqui"
                : "Primeiro acesso? Crie sua conta com seu e-mail corporativo"}
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Convites pendentes são vinculados automaticamente ao seu e-mail.</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
