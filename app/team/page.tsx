"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Badge } from '@/frontend/components/ui/badge';
import { Separator } from '@/frontend/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/frontend/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/frontend/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/frontend/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import { Textarea } from '@/frontend/components/ui/textarea';
import { 
  Users, 
  UserPlus, 
  Settings, 
  Mail, 
  MoreHorizontal,
  Building2,
  Crown,
  Shield,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  RefreshCw,
  Trash2,
  Plus
} from 'lucide-react';
import { ClientOrganization, ClientOrganizationMember, ClientInvitation } from '@/backend/schemas/organization';

type UserRoleType = 'admin' | 'manager' | 'user' | 'viewer' | 'guest';

interface InviteMemberForm {
  email: string;
  role: UserRoleType;
  message: string;
}

export default function TeamPage() {
  const { data: session, status } = useSession();
  const [organizations, setOrganizations] = useState<ClientOrganization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<ClientOrganization | null>(null);
  const [members, setMembers] = useState<ClientOrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<ClientInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Form states
  const [inviteForm, setInviteForm] = useState<InviteMemberForm>({
    email: '',
    role: 'user',
    message: ''
  });
  const [createOrgForm, setCreateOrgForm] = useState({
    name: '',
    slug: '',
    description: ''
  });
  
  // Transition states
  const [isInviting, startInviteTransition] = useTransition();
  const [isCreatingOrg, startCreateOrgTransition] = useTransition();
  const [isUpdatingMember, startUpdateMemberTransition] = useTransition();
  const [isRemovingMember, startRemoveMemberTransition] = useTransition();
  const [isDeletingOrg, startDeleteOrgTransition] = useTransition();
  const [isRevokingInvitation, startRevokeInvitationTransition] = useTransition();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchOrganizations();
    }
  }, [status]);

  useEffect(() => {
    if (selectedOrg) {
      fetchMembers();
      fetchInvitations();
    }
  }, [selectedOrg]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
      if (!response.ok) throw new Error('Failed to fetch organizations');
      
      const orgs = await response.json();
      setOrganizations(orgs);
      
      // Select first organization by default
      if (orgs.length > 0 && !selectedOrg) {
        setSelectedOrg(orgs[0]);
      }
    } catch (err) {
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!selectedOrg) return;
    
    try {
      const response = await fetch(`/api/organizations/${selectedOrg.id}/members`);
      if (!response.ok) throw new Error('Failed to fetch members');
      
      const memberData = await response.json();
      setMembers(memberData);
    } catch (err) {
      setError('Failed to load team members');
    }
  };

  const fetchInvitations = async () => {
    if (!selectedOrg) return;
    
    try {
      const response = await fetch(`/api/organizations/${selectedOrg.id}/invitations`);
      if (!response.ok) throw new Error('Failed to fetch invitations');
      
      const inviteData = await response.json();
      setInvitations(inviteData);
    } catch (err) {
      console.error('Failed to load invitations:', err);
      // Don't show error for invitations as it's not critical
    }
  };

  const handleInviteMember = () => {
    if (!selectedOrg) return;

    startInviteTransition(async () => {
      try {
        const response = await fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: selectedOrg.id,
            email: inviteForm.email,
            role: inviteForm.role,
            message: inviteForm.message || undefined
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send invitation');
        }

        const result = await response.json();
        
        setSuccess(`Invitation sent to ${inviteForm.email}${result.emailSent ? '' : ' (email delivery may be delayed)'}`);
        setInviteModalOpen(false);
        setInviteForm({ email: '', role: 'user', message: '' });
        
        // Refresh invitations
        fetchInvitations();
        
      } catch (err: any) {
        setError(err.message || 'Failed to send invitation');
      }
    });
  };

  const handleCreateOrganization = () => {
    startCreateOrgTransition(async () => {
      try {
        const response = await fetch('/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createOrgForm)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create organization');
        }

        const newOrg = await response.json();
        
        setSuccess(`Organization "${createOrgForm.name}" created successfully!`);
        setCreateOrgModalOpen(false);
        setCreateOrgForm({ name: '', slug: '', description: '' });
        
        // Refresh organizations and select the new one
        await fetchOrganizations();
        setSelectedOrg(newOrg);
        
      } catch (err: any) {
        setError(err.message || 'Failed to create organization');
      }
    });
  };

  const handleUpdateMemberRole = async (userId: string, newRole: UserRoleType) => {
    if (!selectedOrg) return;

    startUpdateMemberTransition(async () => {
      try {
        const response = await fetch(`/api/organizations/${selectedOrg.id}/members`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, role: newRole })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update member role');
        }

        setSuccess('Member role updated successfully');
        fetchMembers(); // Refresh members list
        
      } catch (err: any) {
        setError(err.message || 'Failed to update member role');
      }
    });
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!selectedOrg || !confirm(`Are you sure you want to remove ${userName} from the organization?`)) return;

    startRemoveMemberTransition(async () => {
      try {
        const response = await fetch(`/api/organizations/${selectedOrg.id}/members?userId=${userId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to remove member');
        }

        setSuccess(`${userName} has been removed from the organization`);
        fetchMembers(); // Refresh members list
        
      } catch (err: any) {
        setError(err.message || 'Failed to remove member');
      }
    });
  };

  const handleDeleteOrganization = () => {
    if (!selectedOrg) return;

    startDeleteOrgTransition(async () => {
      try {
        const response = await fetch(`/api/organizations/${selectedOrg.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete organization');
        }

        setSuccess(`Organization "${selectedOrg.name}" has been deleted successfully`);
        
        // Close both modals
        setDeleteConfirmOpen(false);
        setSettingsModalOpen(false);
        
        // Refresh organizations list and clear selection
        await fetchOrganizations();
        setSelectedOrg(null);
        
      } catch (err: any) {
        setError(err.message || 'Failed to delete organization');
      }
    });
  };

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) return;

    startRevokeInvitationTransition(async () => {
      try {
        const response = await fetch(`/api/invitations/revoke?id=${invitationId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to revoke invitation');
        }

        setSuccess(`Invitation for ${email} has been revoked`);
        fetchInvitations(); // Refresh invitations list
        
      } catch (err: any) {
        setError(err.message || 'Failed to revoke invitation');
      }
    });
  };

  const copyInviteLink = (token: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteLink = `${baseUrl}/invite?token=${token}`;
    navigator.clipboard.writeText(inviteLink);
    setSuccess('Invite link copied to clipboard!');
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const getRoleIcon = (role: UserRoleType) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />;
      case 'manager': return <Shield className="h-4 w-4" />;
      case 'user': return <Users className="h-4 w-4" />;
      case 'viewer': return <Eye className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: UserRoleType) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'user': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'viewer': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'guest': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const canManageMembers = selectedOrg?.userPermissions?.includes('manage_members') || false;
  const canInviteUsers = selectedOrg?.userPermissions?.includes('invite_users') || false;
  const canRemoveUsers = selectedOrg?.userPermissions?.includes('remove_users') || false;
  const canManageInvitations = selectedOrg?.userPermissions?.includes('manage_invitations') || false;
  const canManageOrganization = selectedOrg?.userPermissions?.includes('manage_organization') || selectedOrg?.userRole === 'admin' || selectedOrg?.userRole === 'owner' || false;
  const canDeleteOrganization = selectedOrg?.userRole === 'admin' || selectedOrg?.userRole === 'owner' || false;

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Caricamento gestione team...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Autenticazione Richiesta</AlertTitle>
          <AlertDescription>Effettuare il login per accedere alla gestione del team.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestione Team</h1>
          <p className="text-muted-foreground mt-2">
            Gestisci i membri dell'organizzazione, i ruoli e gli inviti. A breve completamente operativo!
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={createOrgModalOpen} onOpenChange={setCreateOrgModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nuova Organizzazione
              </Button>
            </DialogTrigger>
          </Dialog>
          
          {selectedOrg && canInviteUsers && (
            <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invita Membro
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Errore</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/30">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-700 dark:text-green-300">Successo</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Organization Selector */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organizzazioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedOrg?.id === org.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => setSelectedOrg(org)}
                  >
                    <div className="font-medium">{org.name}</div>
                    <div className="text-sm opacity-80">
                      {org.memberCount} membri • {org.userRole}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {selectedOrg ? (
            <>
              {/* Organization Overview */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedOrg.name}
                        <Badge className={getRoleColor(selectedOrg.userRole!)}>
                          {getRoleIcon(selectedOrg.userRole!)}
                          <span className="ml-1">{selectedOrg.userRole}</span>
                        </Badge>
                      </CardTitle>
                      {selectedOrg.description && (
                        <CardDescription className="mt-2">
                          {selectedOrg.description}
                        </CardDescription>
                      )}
                    </div>
                    {canManageOrganization && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSettingsModalOpen(true)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Impostazioni
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{selectedOrg.memberCount}</div>
                      <div className="text-sm text-muted-foreground">Membri</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{invitations.filter(inv => inv.status === 'pending').length}</div>
                      <div className="text-sm text-muted-foreground">Inviti in Attesa</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{selectedOrg.plan}</div>
                      <div className="text-sm text-muted-foreground">Piano</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Members Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Membri del Team</CardTitle>
                  <CardDescription>
                    Gestisci ruoli e permessi per i membri del tuo team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Membro</TableHead>
                        <TableHead>Ruolo</TableHead>
                        <TableHead>Iscritto</TableHead>
                        <TableHead>Ultimo Accesso</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                {member.user?.avatar ? (
                                  <img 
                                    src={member.user.avatar} 
                                    alt={member.user.name || member.user.email}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-medium">
                                    {(member.user?.name || member.user?.email || '?')[0].toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {member.user?.name || 'Utente Senza Nome'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {member.user?.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleColor(member.role)}>
                              {getRoleIcon(member.role)}
                              <span className="ml-1">{member.role}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {member.lastActiveAt ? new Date(member.lastActiveAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            {(canManageMembers || canRemoveUsers) && member.userId !== session?.user?.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {canManageMembers && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.userId, 'admin')}>
                                        Rendi Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.userId, 'manager')}>
                                        Rendi Manager
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.userId, 'user')}>
                                        Rendi Utente
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.userId, 'viewer')}>
                                        Rendi Osservatore
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  {canRemoveUsers && (
                                    <DropdownMenuItem 
                                      onClick={() => handleRemoveMember(member.userId, member.user?.name || member.user?.email || 'Unknown')}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Rimuovi Membro
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Invitations</CardTitle>
                    <CardDescription>
                      Invitations that haven't been accepted yet
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Invited By</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell className="font-medium">{invitation.email}</TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(invitation.role)}>
                                {invitation.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{invitation.invitedByUser?.name || invitation.invitedByUser?.email}</TableCell>
                            <TableCell>
                              <Badge variant={invitation.status === 'pending' ? 'default' : 'secondary'}>
                                {invitation.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(invitation.expiresAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                {invitation.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyInviteLink(invitation.token)}
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Copy Link
                                    </Button>
                                    {canManageInvitations && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRevokeInvitation(invitation.id, invitation.email)}
                                        disabled={isRevokingInvitation}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Revoke
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Organization Selected</h3>
                <p className="text-muted-foreground mb-4">
                  {organizations.length === 0 
                    ? 'Create your first organization to get started'
                    : 'Select an organization from the sidebar to manage your team'
                  }
                </p>
                {organizations.length === 0 && (
                  <Button onClick={() => setCreateOrgModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Organization
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Organization Modal */}
      <Dialog open={createOrgModalOpen} onOpenChange={setCreateOrgModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Create a new organization to manage your team and projects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={createOrgForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setCreateOrgForm(prev => ({
                    ...prev,
                    name,
                    slug: generateSlug(name)
                  }));
                }}
                placeholder="Acme Corporation"
              />
            </div>
            <div>
              <Label htmlFor="org-slug">URL Slug</Label>
              <Input
                id="org-slug"
                value={createOrgForm.slug}
                onChange={(e) => setCreateOrgForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="acme-corp"
              />
            </div>
            <div>
              <Label htmlFor="org-description">Description (Optional)</Label>
              <Textarea
                id="org-description"
                value={createOrgForm.description}
                onChange={(e) => setCreateOrgForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your organization..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOrgModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateOrganization}
              disabled={isCreatingOrg || !createOrgForm.name || !createOrgForm.slug}
            >
              {isCreatingOrg ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join {selectedOrg?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="colleague@example.com"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value: UserRoleType) => setInviteForm(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Team Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="invite-message">Personal Message (Optional)</Label>
              <Textarea
                id="invite-message"
                value={inviteForm.message}
                onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Welcome to our team! We're excited to have you..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleInviteMember}
              disabled={isInviting || !inviteForm.email}
            >
              {isInviting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Organization Settings Modal */}
      <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organization Settings</DialogTitle>
            <DialogDescription>
              Manage settings for {selectedOrg?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Organization Information</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Name:</strong> {selectedOrg?.name}</div>
                <div><strong>Slug:</strong> {selectedOrg?.slug}</div>
                <div><strong>Members:</strong> {selectedOrg?.memberCount}</div>
                <div><strong>Your Role:</strong> {selectedOrg?.userRole}</div>
              </div>
            </div>
            
            {canDeleteOrganization && (
              <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/10">
                <h3 className="font-semibold mb-2 text-red-800 dark:text-red-200">Danger Zone</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                  Once you delete an organization, there is no going back. Please be certain.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Organization
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Organization Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedOrg?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This will permanently delete the organization and all associated data including:
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>All team members will lose access</li>
                  <li>All pending invitations will be cancelled</li>
                  <li>All FAQs and content will be removed</li>
                  <li>All files and data will be permanently deleted</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Type the organization name to confirm:</p>
              <p className="text-sm text-muted-foreground mb-2">{selectedOrg?.name}</p>
              <Input
                placeholder="Enter organization name"
                onChange={(e) => {
                  // Simple confirmation by typing org name
                  const confirmButton = document.getElementById('delete-confirm-btn') as HTMLButtonElement;
                  if (confirmButton) {
                    confirmButton.disabled = e.target.value !== selectedOrg?.name;
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              id="delete-confirm-btn"
              variant="destructive"
              onClick={handleDeleteOrganization}
              disabled={isDeletingOrg || true} // Initially disabled
            >
              {isDeletingOrg ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Organization
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
