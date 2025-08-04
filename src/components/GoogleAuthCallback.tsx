import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { googleCalendarService } from "@/lib/googleCalendarService";

const GoogleAuthCallback = () => {
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing",
  );
  const [message, setMessage] = useState("Processando autenticação...");

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get the authorization code from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");

      if (error) {
        setStatus("error");
        setMessage(`Erro na autenticação: ${error}`);
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("Código de autorização não encontrado.");
        return;
      }

      // Exchange code for tokens
      const success = await googleCalendarService.handleAuthCallback(code);

      if (success) {
        setStatus("success");
        setMessage("Google Calendar conectado com sucesso!");

        // Redirect back to the original page after a short delay
        setTimeout(() => {
          const returnUrl =
            localStorage.getItem("google_auth_return_url") || "/";
          localStorage.removeItem("google_auth_return_url");
          window.location.href = returnUrl;
        }, 2000);
      } else {
        setStatus("error");
        setMessage("Falha ao conectar com Google Calendar. Tente novamente.");
      }
    } catch (error) {
      console.error("Auth callback error:", error);
      setStatus("error");
      setMessage("Erro inesperado durante a autenticação.");
    }
  };

  const handleReturnHome = () => {
    const returnUrl = localStorage.getItem("google_auth_return_url") || "/";
    localStorage.removeItem("google_auth_return_url");
    window.location.href = returnUrl;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === "processing" && (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                Autenticando...
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Sucesso!
              </>
            )}
            {status === "error" && (
              <>
                <AlertCircle className="h-5 w-5 text-red-600" />
                Erro
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>

          {status === "success" && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                Você será redirecionado automaticamente em alguns segundos...
              </p>
            </div>
          )}

          {status === "error" && (
            <Button onClick={handleReturnHome} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao App
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleAuthCallback;
