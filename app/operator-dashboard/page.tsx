'use client';

import { useEffect, useState } from 'react';
import { useOrganization } from '@/frontend/contexts/OrganizationContext';
import ConversationsClient from '@/frontend/components/conversations/ConversationsClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Input } from '@/frontend/components/ui/input';
import { Button } from '@/frontend/components/ui/button';
import { useSession } from 'next-auth/react';
import { MessageSquare, Bot, User, FileText, HelpCircle, RefreshCw } from 'lucide-react';

export default function OperatorDashboardPage() {
  const { currentContext, currentOrganization } = useOrganization();
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState<string>(() => (session?.user?.name as string) || '');
  const [savingName, setSavingName] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operator/summary', {
        headers: {
          'x-context-type': currentContext,
          ...(currentContext === 'organization' && currentOrganization?.id
            ? { 'x-organization-id': currentOrganization.id }
            : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentContext, currentOrganization?.id]);

  return (
    <div className="container mx-auto py-6 space-y-8 max-w-7xl">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Operator Dashboard</h1>
        <p className="text-muted-foreground">Conversazioni e metriche di base. Accesso KB in sola lettura nelle prossime iterazioni.</p>
      </div>

      {/* Operator profile quick settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profilo Operatore</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="block text-sm text-muted-foreground mb-1">Nome visualizzato</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Es. Mario Rossi" />
          </div>
          <Button
            disabled={savingName || !displayName.trim()}
            onClick={async () => {
              setSavingName(true);
              try {
                const res = await fetch('/api/me/profile', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: displayName.trim() })
                });
                if (!res.ok) throw new Error('Salvataggio non riuscito');
              } catch (e) {
                console.error(e);
              } finally {
                setSavingName(false);
              }
            }}
          >
            {savingName ? 'Salvataggio...' : 'Salva'}
          </Button>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversazioni totali</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totals?.totalConversations ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gestite da AI</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totals?.botHandled ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gestite da Operatori</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totals?.agentHandled ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge base counters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documenti (KB)</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.knowledge?.documentsCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FAQ</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.knowledge?.faqCount ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <button
          onClick={fetchSummary}
          className="inline-flex items-center gap-2 border rounded px-3 py-2 text-sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Aggiorna metriche
        </button>
      </div>

      {/* Conversations (client fetch uses /api/conversations with context headers) */}
      <ConversationsClient conversations={[]} />
    </div>
  );
}
