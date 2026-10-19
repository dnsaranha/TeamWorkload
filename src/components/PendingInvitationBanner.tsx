import React, { useState, useEffect } from "react";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Building2,
  Shield,
  Briefcase,
  Sparkles,
  Users2,
} from "lucide-react";
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
import {
  invitationService,
  CollaboratorInvitation,
} from "../lib/invitationService";
import { employeeService } from "../lib/supabaseClient";
import { useAuth } from "../lib/authContext";

export const PendingInvitationBanner: React.FC = () => {
  const { user, activeEmployee, refreshUserData, switchPersona } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<CollaboratorInvitation[]>(
    []
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const checkPendingInvites = async () => {
    try {
      const emailToCheck = user?.email || (activeEmployee as any)?.email;
      const urlInviteId = new URLSearchParams(window.location.search).get("invite");

      let matchedInvites: CollaboratorInvitation[] = [];
      if (emailToCheck) {
        const byEmail = await invitationService.getPendingByEmail(emailToCheck);
        matchedInvites.push(...byEmail);
      }

      if (urlInviteId) {
        const all = await invitationService.getAll();
        const byUrl = all.find((i) => i.id === urlInviteId && i.status === "pending");
        if (byUrl && !matchedInvites.some((m) => m.id === byUrl.id)) {
          matchedInvites.push(byUrl);
        }
      }

      const activePending = matchedInvites.filter((i) => !dismissedIds.includes(i.id));
      setPendingInvites(activePending);
    } catch (e) {
      console.warn("Could not check pending invites:", e);
    }
  };

  useEffect(() => {
    checkPendingInvites();
    // Periodically re-check for new invites every 10 seconds
    const interval = setInterval(checkPendingInvites, 10000);
    return () => clearInterval(interval);
  }, [user, activeEmployee, dismissedIds]);

  if (pendingInvites.length === 0) {
    return null;
  }

  const currentInvite = pendingInvites[0];

  const handleAccept = async (inviteId: string) => {
    try {
      setIsProcessing(true);
      const accepted = await invitationService.acceptInvitation(inviteId, user?.uid);
      await refreshUserData();

      // Find and switch to the employee record linked to this invite
      const allEmps = await employeeService.getAll();
      const linked = allEmps.find(
        (e) =>
          (e as any).email?.toLowerCase() === accepted.email.toLowerCase() ||
          e.name.toLowerCase() === accepted.name.toLowerCase()
      );
      if (linked) {
        switchPersona(linked.id);
      }

      if (window.location.search.includes("invite=")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (e) {
      console.error("Error accepting invitation:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      setIsProcessing(true);
      await invitationService.declineInvitation(inviteId);
      if (window.location.search.includes("invite=")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
      setDismissedIds((prev) => [...prev, inviteId]);
    } catch (e) {
      console.error("Error declining invitation:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-1">
            <Mail className="w-6 h-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold">
            Convite para Colaborar no TeamWorkload
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            Você recebeu um convite para fazer parte da equipe de trabalho com seu acesso atual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="p-3.5 bg-muted/50 rounded-xl border space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-muted-foreground">Convidado por:</span>
              <span className="font-semibold text-foreground">
                {currentInvite.invitedBy}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-muted-foreground">Cargo / Função Atribuída:</span>
              <span className="font-semibold text-primary">
                {currentInvite.role}
              </span>
            </div>

            {currentInvite.groupName && (
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-muted-foreground">Grupo de Trabalho:</span>
                <Badge variant="outline" className="font-semibold text-purple-700 bg-purple-50 dark:bg-purple-950 dark:text-purple-300">
                  <Building2 className="w-3 h-3 mr-1" />
                  {currentInvite.groupName}
                </Badge>
              </div>
            )}

            <div className="pt-1">
              <span className="text-[11px] text-muted-foreground block mb-1">
                Direitos e Permissões concedidos:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentInvite.canCreate && (
                  <Badge variant="secondary" className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950">
                    ✓ Criar Registros
                  </Badge>
                )}
                {currentInvite.canEdit && (
                  <Badge variant="secondary" className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950">
                    ✓ Editar Registros
                  </Badge>
                )}
                {currentInvite.canDelete && (
                  <Badge variant="secondary" className="text-[10px] text-red-600 bg-red-50 dark:bg-red-950">
                    ✓ Excluir Registros
                  </Badge>
                )}
                {currentInvite.isAdmin && (
                  <Badge className="text-[10px] bg-purple-600 text-white font-bold">
                    ★ Administrador do Grupo
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Ao aceitar o convite, seu usuário será integrado à equipe e terá acesso aos projetos, tarefas e grupos atribuídos.
          </p>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isProcessing}
            onClick={() => handleDecline(currentInvite.id)}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Recusar Convite
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isProcessing}
            onClick={() => handleAccept(currentInvite.id)}
            className="text-xs font-semibold bg-primary gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isProcessing ? "Ingressando..." : "Aceitar Convite e Entrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PendingInvitationBanner;
