"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Switch } from '@/frontend/components/ui/switch';
import { Label } from '@/frontend/components/ui/label';
import { Badge } from '@/frontend/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/frontend/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/frontend/components/ui/select';
import { 
  Settings, 
  Save, 
  RotateCcw,
  Eye,
  EyeOff,
  Bell,
  Layout,
  Palette
} from 'lucide-react';
import { UserPreferences } from '@/frontend/hooks/useDashboard';

interface DashboardSettingsProps {
  preferences: UserPreferences | null;
  onUpdatePreferences: (preferences: UserPreferences) => void;
}

export default function DashboardSettings({ 
  preferences, 
  onUpdatePreferences 
}: DashboardSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempPreferences, setTempPreferences] = useState<UserPreferences | null>(
    preferences
  );

  const handleSave = () => {
    if (tempPreferences) {
      onUpdatePreferences(tempPreferences);
      setIsOpen(false);
    }
  };

  const handleReset = () => {
    setTempPreferences(preferences);
  };

  const updateDashboardLayout = (key: string, value: boolean) => {
    if (!tempPreferences) return;
    
    setTempPreferences({
      ...tempPreferences,
      dashboardLayout: {
        ...tempPreferences.dashboardLayout,
        [key]: value
      }
    });
  };

  const updateNotificationSettings = (key: string, value: boolean) => {
    if (!tempPreferences) return;
    
    setTempPreferences({
      ...tempPreferences,
      notifications: {
        ...tempPreferences.notifications,
        [key]: value
      }
    });
  };

  const updateThemeSettings = (key: string, value: string | boolean) => {
    if (!tempPreferences) return;
    
    setTempPreferences({
      ...tempPreferences,
      theme: {
        ...tempPreferences.theme,
        [key]: value
      }
    });
  };

  if (!tempPreferences) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Personalizza Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Impostazioni Dashboard
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Layout Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layout className="h-4 w-4" />
                Layout Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Mostra Statistiche</Label>
                  <p className="text-sm text-muted-foreground">
                    Visualizza le cards con le statistiche principali
                  </p>
                </div>
                <Switch
                  checked={tempPreferences.dashboardLayout.showStatistics}
                  onCheckedChange={(value) => updateDashboardLayout('showStatistics', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Mostra Notifiche</Label>
                  <p className="text-sm text-muted-foreground">
                    Visualizza il pannello delle notifiche
                  </p>
                </div>
                <Switch
                  checked={tempPreferences.dashboardLayout.showNotifications}
                  onCheckedChange={(value) => updateDashboardLayout('showNotifications', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Mostra Attività Recenti</Label>
                  <p className="text-sm text-muted-foreground">
                    Visualizza la timeline delle attività recenti
                  </p>
                </div>
                <Switch
                  checked={tempPreferences.dashboardLayout.showRecentActivities}
                  onCheckedChange={(value) => updateDashboardLayout('showRecentActivities', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Mostra Azioni Rapide</Label>
                  <p className="text-sm text-muted-foreground">
                    Visualizza i bottoni per le azioni rapide
                  </p>
                </div>
                <Switch
                  checked={tempPreferences.dashboardLayout.showQuickActions}
                  onCheckedChange={(value) => updateDashboardLayout('showQuickActions', value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Impostazioni Notifiche */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-4 w-4" />
                Notifiche
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Notifiche Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Ricevi notifiche via email
                  </p>
                </div>
                <Switch
                  checked={tempPreferences.notifications.emailNotifications}
                  onCheckedChange={(value) => updateNotificationSettings('emailNotifications', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Alert Performance</Label>
                  <p className="text-sm text-muted-foreground">
                    Ricevi alert sui miglioramenti di performance
                  </p>
                </div>
                <Switch
                  checked={tempPreferences.notifications.performanceAlerts}
                  onCheckedChange={(value) => updateNotificationSettings('performanceAlerts', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Aggiornamenti Team</Label>
                  <p className="text-sm text-muted-foreground">
                    Ricevi notifiche sui cambiamenti del team
                  </p>
                </div>
                <Switch
                  checked={tempPreferences.notifications.teamUpdates}
                  onCheckedChange={(value) => updateNotificationSettings('teamUpdates', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Aggiornamenti Sistema</Label>
                  <p className="text-sm text-muted-foreground">
                    Ricevi notifiche sugli aggiornamenti del sistema
                  </p>
                </div>
                <Switch
                  checked={tempPreferences.notifications.systemUpdates}
                  onCheckedChange={(value) => updateNotificationSettings('systemUpdates', value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Impostazioni Tema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-4 w-4" />
                Tema e Aspetto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Tema Preferito</Label>
                  <p className="text-sm text-muted-foreground">
                    Scegli il tema dell'interfaccia
                  </p>
                </div>
                <Select
                  value={tempPreferences.theme.preferredTheme}
                  onValueChange={(value) => updateThemeSettings('preferredTheme', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Chiaro</SelectItem>
                    <SelectItem value="dark">Scuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Modalità Compatta</Label>
                  <p className="text-sm text-muted-foreground">
                    Riduci gli spazi per una vista più compatta
                  </p>
                </div>
                <Switch
                  checked={tempPreferences.theme.compactMode}
                  onCheckedChange={(value) => updateThemeSettings('compactMode', value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Azioni */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Ripristina
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Salva Modifiche
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
