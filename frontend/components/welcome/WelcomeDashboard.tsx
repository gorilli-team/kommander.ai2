"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Badge } from '@/frontend/components/ui/badge';
import { Button } from '@/frontend/components/ui/button';
import { Skeleton } from '@/frontend/components/ui/skeleton';
import { 
  Home, 
  Brain, 
  MessageCircle, 
  FileText, 
  Settings, 
  BarChart3,
  Bell,
  Zap,
  Users,
  TrendingUp,
  Calendar,
  BookOpen,
  RefreshCw,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useDashboard } from '@/frontend/hooks/useDashboard';
import DashboardSettings from './DashboardSettings';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface WelcomeDashboardProps {
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

export default function WelcomeDashboard({ user }: WelcomeDashboardProps) {
  const firstName = user?.name?.split(' ')[0] || 'Utente';
  const {
    stats,
    notifications,
    preferences,
    loading,
    error,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updatePreferences,
    refreshData
  } = useDashboard();

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-center">
        <div className="space-y-4">
          <p className="text-red-500">Errore nel caricamento della dashboard</p>
          <Button onClick={refreshData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Riprova
          </Button>
        </div>
      </div>
    );
  }

  const getAIStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600';
      case 'offline': return 'text-red-600';
      case 'maintenance': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getAIStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'maintenance': return 'Manutenzione';
      default: return 'Sconosciuto';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header di benvenuto */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Home className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Ciao, {firstName}!
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Benvenuto nella tua dashboard di Kommander. Ecco un riepilogo delle tue attività e notifiche.
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <Button onClick={refreshData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Aggiorna
          </Button>
          <DashboardSettings 
            preferences={preferences}
            onUpdatePreferences={updatePreferences}
          />
        </div>
      </div>

      {/* Cards statistiche principali */}
      {preferences?.dashboardLayout.showStatistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stato AI</CardTitle>
              <Zap className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getAIStatusColor(stats?.aiStatus || 'online')}`}>
                {getAIStatusText(stats?.aiStatus || 'online')}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.aiStatus === 'online' ? 'Pronta ad assistere' : 'Non disponibile'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversazioni</CardTitle>
              <MessageCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.conversationsThisWeek || 0}
              </div>
              <p className="text-xs text-muted-foreground">Questa settimana</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Base Conoscenza</CardTitle>
              <Brain className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats?.knowledgeBaseCompleteness || 0}%
              </div>
              <p className="text-xs text-muted-foreground">Completezza addestramento</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documenti</CardTitle>
              <FileText className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats?.documentsCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">Caricati e processati</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sezione notifiche e attività recenti */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifiche */}
        {preferences?.dashboardLayout.showNotifications && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <CardTitle>Notifiche</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {unreadNotificationsCount > 0 && (
                    <Badge variant="secondary">{unreadNotificationsCount} nuove</Badge>
                  )}
                  {notifications.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={markAllNotificationsAsRead}
                      className="h-6 px-2 text-xs"
                    >
                      Segna tutte come lette
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessuna notifica
                </p>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-opacity ${
                      notification.read ? 'opacity-60' : ''
                    } bg-${notification.color}-50 dark:bg-${notification.color}-950`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { 
                          addSuffix: true, 
                          locale: it 
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Attività recenti */}
        {preferences?.dashboardLayout.showRecentActivities && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Attività Recenti</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!stats?.recentActivities || stats.recentActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessuna attività recente
                </p>
              ) : (
                stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className={`h-2 w-2 bg-${activity.color}-500 rounded-full`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.createdAt), { 
                          addSuffix: true, 
                          locale: it 
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Azioni rapide */}
      {preferences?.dashboardLayout.showQuickActions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <span>Azioni Rapide</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/training">
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2 w-full hover:border-primary">
                  <Brain className="h-6 w-6" />
                  <span>Addestramento</span>
                </Button>
              </Link>
              <Link href="/conversations">
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2 w-full hover:border-primary">
                  <MessageCircle className="h-6 w-6" />
                  <span>Conversazioni</span>
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2 w-full hover:border-primary">
                  <BarChart3 className="h-6 w-6" />
                  <span>Analytics</span>
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2 w-full hover:border-primary">
                  <Settings className="h-6 w-6" />
                  <span>Impostazioni</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
