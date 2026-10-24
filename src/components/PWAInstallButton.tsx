import React, { useState } from "react";
import { Download, Smartphone, Share2, PlusSquare, X } from "lucide-react";
import { Button } from "./ui/button";
import { usePWAInstall } from "../hooks/usePWAInstall";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface PWAInstallButtonProps {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = "outline",
  size = "sm",
  className = "",
  showText = true,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running inside standalone PWA window, hide button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // For browsers that haven't fired beforeinstallprompt yet or need guidance
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleInstallClick}
        disabled={isInstalling}
        title="Instalar TeamWorkload no seu dispositivo (PWA)"
        className={`gap-1.5 font-medium transition-all ${className}`}
      >
        <Download className="h-3.5 w-3.5 text-primary animate-bounce" />
        {showText && <span>Instalar App</span>}
      </Button>

      {/* Manual / iOS Installation Modal Guide */}
      <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 mx-auto">
              <Smartphone className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Como Instalar o TeamWorkload
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Acesse o aplicativo diretamente da tela inicial do seu celular ou computador, como um app nativo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs text-foreground mt-2">
            <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
              <p className="font-semibold text-primary flex items-center gap-1.5">
                <Share2 className="w-4 h-4" />
                No iPhone / iPad (Safari):
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                <li>Toque no botão <strong>Compartilhar</strong> (ícone do quadrado com seta para cima na barra do Safari).</li>
                <li>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
                <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
              </ol>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
              <p className="font-semibold text-primary flex items-center gap-1.5">
                <PlusSquare className="w-4 h-4" />
                No Android (Chrome) ou Computador (Chrome / Edge):
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                <li>Clique no menu do navegador (<strong>3 pontos</strong> no canto superior direito).</li>
                <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                <li>Confirme a instalação para criar o atalho de acesso rápido.</li>
              </ol>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIOSGuide(false)}
              className="w-full text-xs font-semibold"
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PWAInstallButton;
