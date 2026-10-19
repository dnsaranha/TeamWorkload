import React, { useState, useEffect } from "react";
import {
  Mail,
  Send,
  UserPlus,
  Shield,
  Building2,
  Check,
  Copy,
  CheckCircle2,
  AlertCircle,
  Users2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import {
  invitationService,
  CollaboratorInvitation,
} from "../lib/invitationService";
import { workGroupService, WorkGroup, HIERARCHY_LEVELS } from "../lib/workGroupService";
import { useAuth } from "../lib/authContext";

interface InviteCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSent?: (inv: CollaboratorInvitation) => void;
  defaultGroupId?: string;
}

export const InviteCollaboratorModal: React.FC<InviteCollaboratorModalProps> = ({
  isOpen,
  onClose,
  onInviteSent,
  defaultGroupId,
}) => {
  const { user, activeEmployee } = useAuth();
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(40);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    defaultGroupId || "none"
  );
  const [canCreate, setCanCreate] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [canDelete, setCanDelete] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInvite, setSuccessInvite] =
    useState<CollaboratorInvitation | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      workGroupService.getAll().then(setGroups);
      if (defaultGroupId) {
        setSelectedGroupId(defaultGroupId);
      }
      setSuccessInvite(null);
      setErrorMsg(null);
      setCopiedLink(false);
    }
  }, [isOpen, defaultGroupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("O nome do colaborador é obrigatório.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Informe um e-mail válido para o colaborador.");
      return;
    }
    if (!role.trim()) {
      setErrorMsg("O cargo / função é obrigatório.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const targetGroup = groups.find((g) => g.id === selectedGroupId);

      const inv = await invitationService.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role.trim(),
        weekly_hours: Number(weeklyHours) || 40,
        groupId: selectedGroupId === "none" ? null : selectedGroupId,
        groupName: targetGroup ? targetGroup.name : null,
        canCreate: isAdmin || canCreate,
        canEdit: isAdmin || canEdit,
        canDelete: isAdmin || canDelete,
        isAdmin,
        invitedBy:
          user?.displayName ||
          user?.email ||
          activeEmployee?.name ||
          "Administrador TeamWorkload",
      });

      setSuccessInvite(inv);
      if (onInviteSent) onInviteSent(inv);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao registrar convite.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    const inviteUrl = window.location.origin;
    navigator.clipboard.writeText(
      `Olá ${name}! Você foi convidado para a equipe TeamWorkload no cargo de ${role}. Acesse com seu e-mail (${email}): ${inviteUrl}`
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleResetAndClose = () => {
    setName("");
    setEmail("");
    setRole("");
    setWeeklyHours(40);
    setSelectedGroupId("none");
    setSuccessInvite(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleResetAndClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Convidar Novo Colaborador
          </DialogTitle>
          <DialogDescription className="text-xs">
            Envie um convite para o colaborador acessar o TeamWorkload com seu próprio login (Google ou e-mail corporativo). O convite será aceito quando ele acessar o app.
          </DialogDescription>
        </DialogHeader>

        {successInvite ? (
          <div className="py-4 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">
                Convite Criado com Sucesso!
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                O convite para <strong>{successInvite.name}</strong> ({successInvite.email}) está registrado como pendente.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cargo atribuído:</span>
                <span className="font-semibold">{successInvite.role}</span>
              </div>
              {successInvite.groupName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grupo de trabalho:</span>
                  <span className="font-semibold text-primary">{successInvite.groupName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status do convite:</span>
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                  Aguardando Acesso do Colaborador
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="text-xs gap-1.5"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Mensagem Copiada!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Mensagem do Convite
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleResetAndClose}
                className="text-xs bg-primary"
              >
                Concluir
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-1">
            {errorMsg && (
              <div className="p-2.5 text-xs bg-destructive/15 text-destructive border border-destructive/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="inv-name" className="text-xs font-semibold">
                  Nome Completo *
                </Label>
                <Input
                  id="inv-name"
                  placeholder="Ex: Mariana Costa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="inv-email" className="text-xs font-semibold">
                  E-mail Corporativo *
                </Label>
                <Input
                  id="inv-email"
                  type="email"
                  placeholder="mariana@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="inv-role" className="text-xs font-semibold">
                  Cargo / Função *
                </Label>
                <Input
                  id="inv-role"
                  placeholder="Ex: Engenheira de Software"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="inv-hours" className="text-xs font-semibold">
                  Horas Semanais
                </Label>
                <Input
                  id="inv-hours"
                  type="number"
                  min={1}
                  max={60}
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="inv-group" className="text-xs font-semibold">
                  Vincular a um Grupo de Trabalho (Opcional)
                </Label>
                <Select
                  value={selectedGroupId}
                  onValueChange={setSelectedGroupId}
                >
                  <SelectTrigger id="inv-group" className="h-9 text-xs">
                    <SelectValue placeholder="Selecione um grupo inicial..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem grupo inicial (Colaborador Geral) —</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="text-xs">
                        {g.name} ({HIERARCHY_LEVELS[g.level]?.shortTitle || `Nível ${g.level}`} • {g.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Permissions preview for the group */}
            {selectedGroupId !== "none" && (
              <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Permissões no Grupo Selecionado:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canCreate}
                      onChange={(e) => setCanCreate(e.target.checked)}
                      className="rounded text-primary w-3.5 h-3.5"
                    />
                    <span>Pode Criar Registros</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canEdit}
                      onChange={(e) => setCanEdit(e.target.checked)}
                      className="rounded text-primary w-3.5 h-3.5"
                    />
                    <span>Pode Editar Registros</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canDelete}
                      onChange={(e) => setCanDelete(e.target.checked)}
                      className="rounded text-primary w-3.5 h-3.5"
                    />
                    <span>Pode Excluir Registros</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-amber-600 dark:text-amber-400">
                    <input
                      type="checkbox"
                      checked={isAdmin}
                      onChange={(e) => {
                        setIsAdmin(e.target.checked);
                        if (e.target.checked) {
                          setCanCreate(true);
                          setCanEdit(true);
                        }
                      }}
                      className="rounded text-amber-600 w-3.5 h-3.5"
                    />
                    <span>Administrador do Grupo</span>
                  </label>
                </div>
              </div>
            )}

            <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-[11px] text-muted-foreground flex items-start gap-2">
              <Users2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Como funciona o aceite:</strong> O colaborador pode acessar o TeamWorkload com este mesmo e-mail (via Google ou e-mail e senha). Ao entrar, um aviso exibirá o convite para ser aceito em 1 clique.
              </span>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetAndClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="gap-1.5 font-semibold bg-primary"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? "Enviando..." : "Enviar Convite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteCollaboratorModal;
