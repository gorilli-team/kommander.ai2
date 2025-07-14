"use client";

import React, { useState, useEffect, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { Separator } from '@/frontend/components/ui/separator';
import { Badge } from '@/frontend/components/ui/badge';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Mail, 
  Calendar,
  Building2,
  UserPlus,
  Clock,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { ClientInvitation } from '@/backend/schemas/organization';

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [invitation, setInvitation] = useState<ClientInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAccepting, startAcceptTransition] = useTransition();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link. No token provided.');
      setLoading(false);
      return;
    }

    // Store token in sessionStorage for persistence during auth flow
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingInviteToken', token);
    }
    
    fetchInvitation();
  }, [token]);

  // Check for stored token after authentication
  useEffect(() => {
    if (status === 'authenticated' && typeof window !== 'undefined') {
      const storedToken = sessionStorage.getItem('pendingInviteToken');
      if (storedToken && storedToken === token && invitation) {
        // User just authenticated with pending invitation - auto-accept
        setTimeout(() => {
          handleAcceptInvitation();
        }, 1000);
      }
    }
  }, [status, token, invitation]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/${token}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load invitation');
        return;
      }

      const invitationData = await response.json();
      setInvitation(invitationData);
    } catch (err) {
      setError('Failed to load invitation. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = () => {
    if (!token) return;

    startAcceptTransition(async () => {
      try {
        const response = await fetch('/api/invitations', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to accept invitation');
          return;
        }

        setSuccess('Invitation accepted successfully! Welcome to the team.');
        
        // Clear stored token
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('pendingInviteToken');
        }
        
        // Redirect to success page with organization info
        setTimeout(() => {
          const orgName = invitation?.organization?.name || 'Unknown Organization';
          const roleDisplay = roleDisplayNames[invitation?.role as keyof typeof roleDisplayNames] || invitation?.role;
          router.push(`/invite/success?orgName=${encodeURIComponent(orgName)}&role=${encodeURIComponent(roleDisplay)}`);
        }, 2000);
        
      } catch (err) {
        setError('Failed to accept invitation. Please try again.');
      }
    });
  };

  const handleDeclineInvitation = () => {
    // For now, just navigate away
    router.push('/');
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-6">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p>Loading invitation...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !invitation) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-2" />
          <CardTitle className="text-2xl font-bold text-foreground mb-1">
            Invalid Invitation
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            This invitation link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Link href="/">
            <Button className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (status === 'loading') {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-6">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p>Checking authentication...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <UserPlus className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle className="text-2xl font-bold text-foreground mb-1">
            Login Required
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            You need to be logged in to accept this invitation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>Organization Invitation</AlertTitle>
              <AlertDescription>
                You've been invited to join <strong>{invitation?.organization?.name}</strong>. 
                Please log in to accept this invitation.
              </AlertDescription>
            </Alert>
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/invite?token=${token}`)}&inviteToken=${token}`}>
              <Button className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Login to Accept Invitation
              </Button>
            </Link>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Link href={`/login?signup=true&callbackUrl=${encodeURIComponent(`/invite?token=${token}`)}&inviteToken=${token}`}>
              <Button variant="outline" className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Create Account & Accept
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!invitation) {
    return null;
  }

  const roleDisplayNames = {
    admin: 'Administrator',
    manager: 'Manager',
    user: 'Team Member',
    viewer: 'Viewer',
    guest: 'Guest'
  };

  const roleDisplay = roleDisplayNames[invitation.role as keyof typeof roleDisplayNames] || invitation.role;
  const roleColor = {
    admin: 'bg-red-100 text-red-800',
    manager: 'bg-blue-100 text-blue-800',
    user: 'bg-green-100 text-green-800',
    viewer: 'bg-yellow-100 text-yellow-800',
    guest: 'bg-gray-100 text-gray-800'
  };

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader className="text-center">
        <Building2 className="h-12 w-12 text-primary mx-auto mb-2" />
        <CardTitle className="text-2xl font-bold text-foreground mb-1">
          Organization Invitation
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          You've been invited to join an organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert variant="default" className="mb-4 border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-700">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-700 dark:text-green-300">Success</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
          </Alert>
        )}

        {/* Organization Details */}
        <div className="space-y-4">
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
            {invitation.organization?.logo && (
              <img 
                src={invitation.organization.logo} 
                alt={invitation.organization.name}
                className="w-16 h-16 mx-auto mb-3 rounded-lg object-cover"
              />
            )}
            <h3 className="text-xl font-bold text-foreground mb-2">
              {invitation.organization?.name}
            </h3>
            <Badge className={`${roleColor[invitation.role as keyof typeof roleColor]} border-0`}>
              {roleDisplay}
            </Badge>
          </div>

          <Separator />

          {/* Invitation Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Invited by</p>
                <p className="text-sm text-muted-foreground">
                  {invitation.invitedByUser?.name || invitation.invitedByUser?.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Expires</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Role</p>
                <p className="text-sm text-muted-foreground">
                  {roleDisplay}
                </p>
              </div>
            </div>
          </div>

          {invitation.message && (
            <>
              <Separator />
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Personal Message</p>
                <p className="text-sm text-muted-foreground italic">
                  "{invitation.message}"
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleAcceptInvitation}
              disabled={isAccepting || !!success}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isAccepting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleDeclineInvitation}
              variant="outline"
              disabled={isAccepting || !!success}
              className="w-full"
            >
              Decline
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              By accepting, you'll become a member of {invitation.organization?.name} with {roleDisplay.toLowerCase()} privileges.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6">
            <div className="text-center">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p>Loading...</p>
            </div>
          </CardContent>
        </Card>
      }>
        <InviteContent />
      </Suspense>
    </div>
  );
}
