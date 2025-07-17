"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Badge } from '@/frontend/components/ui/badge';
import { Button } from '@/frontend/components/ui/button';
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
  BookOpen
} from 'lucide-react';
import Link from 'next/link';

interface WelcomeDashboardProps {
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

export default function WelcomeDashboard({ user }: WelcomeDashboardProps) {
  const firstName = user?.name?.split(' ')[0] || 'Utente';

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
      </div>

      {/* Cards statistiche principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stato AI</CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Online</div>
            <p className="text-xs text-muted-foreground">Pronta ad assistere</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversazioni</CardTitle>
            <MessageCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">24</div>
            <p className="text-xs text-muted-foreground">Questa settimana</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base Conoscenza</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">85%</div>
            <p className="text-xs text-muted-foreground">Completezza addestramento</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documenti</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">12</div>
            <p className="text-xs text-muted-foreground">Caricati e processati</p>
          </CardContent>
        </Card>
      </div>

      {/* Sezione notifiche e attività recenti */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifiche */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Notifiche</CardTitle>
              </div>
              <Badge variant="secondary">3 nuove</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Miglioramento delle performance</p>
                <p className="text-xs text-muted-foreground">La tua AI ha risposto il 15% più velocemente questa settimana</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <Users className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Nuovo membro del team</p>
                <p className="text-xs text-muted-foreground">Sara si è unita alla tua organizzazione</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <BookOpen className="h-4 w-4 text-purple-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Addestramento completato</p>
                <p className="text-xs text-muted-foreground">5 nuove FAQ elaborate e integrate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attività recenti */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>Attività Recenti</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Conversazione con cliente</p>
                <p className="text-xs text-muted-foreground">2 ore fa</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Documento caricato</p>
                <p className="text-xs text-muted-foreground">5 ore fa</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">FAQ aggiornate</p>
                <p className="text-xs text-muted-foreground">1 giorno fa</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Analisi performance</p>
                <p className="text-xs text-muted-foreground">2 giorni fa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Azioni rapide */}
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
    </div>
  );
}
