import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Check, 
  X, 
  Users, 
  Building2,
  Clock,
  Mail
} from "lucide-react";
import { 
  workspaceMemberService, 
  userProfileService,
  supabase,
  type WorkspaceMember 
} from "@/lib/supabaseClient";

interface WorkspaceInvitationsProps {
  onInvitationAccepted?: () => void;
}

const WorkspaceInvitations: React.FC<WorkspaceInvitationsProps> = ({ onInvitationAccepted }) => {
  const [invitations, setInvitations] = useState<(WorkspaceMember & { workspace: any })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          *,
          workspace:workspaces(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async (memberId: string, workspaceId: string) => {
    try {
      setLoading(true);
      await workspaceMemberService.acceptInvitation(memberId);
      
      // Switch to the accepted workspace
      await userProfileService.switchWorkspace(workspaceId);
      
      await loadInvitations();
      onInvitationAccepted?.();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const declineInvitation = async (memberId: string) => {
    try {
      setLoading(true);
      await workspaceMemberService.removeMember(memberId);
      await loadInvitations();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Mail className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold">Convites Pendentes</h3>
        <Badge variant="secondary">{invitations.length}</Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {invitations.map((invitation) => (
          <Card key={invitation.id} className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-base">{invitation.workspace.name}</CardTitle>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  {invitation.role === 'admin' ? 'Administrador' :
                   invitation.role === 'member' ? 'Membro' : 'Convidado'}
                </Badge>
              </div>
              <CardDescription className="flex items-center space-x-2">
                <Clock className="h-3 w-3" />
                <span>Convidado em {new Date(invitation.invited_at).toLocaleDateString('pt-BR')}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {invitation.workspace.description && (
                <p className="text-sm text-gray-600 mb-4">{invitation.workspace.description}</p>
              )}
              
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => acceptInvitation(invitation.id, invitation.workspace.id)}
                  disabled={loading}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aceitar Convite
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => declineInvitation(invitation.id)}
                  disabled={loading}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Recusar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WorkspaceInvitations;