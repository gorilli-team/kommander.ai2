'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Input } from '@/frontend/components/ui/input';
import { Button } from '@/frontend/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/frontend/components/ui/radio-group';
import { Checkbox } from '@/frontend/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Badge } from '@/frontend/components/ui/badge';
import { Settings, Zap, Palette, MessageSquare, Smartphone, Cog, Bot, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { saveSettings } from './actions';
import { PersonalityTester } from './personality-tester';
import { TemplateGallery } from './template-gallery';
import { WhatsAppIntegration } from './whatsapp-integration';
import { cn } from '@/frontend/lib/utils';
import { useOrganization } from '@/frontend/contexts/OrganizationContext';

const traitOptions = [
  { value: 'adventurous', label: '🦁 Adventurous' },
  { value: 'confident', label: '💪 Confident' },
  { value: 'convincing', label: '🤝 Convincing' },  
  { value: 'energetic', label: '⚡ Energetic' },
  { value: 'friendly', label: '🙂 Friendly' },
  { value: 'fun', label: '🤣 Fun' },
  { value: 'ironic', label: '😜 Ironic' },
  { value: 'professional', label: '💼 Professional' },
] as const;

type Trait = typeof traitOptions[number]['value'];

interface Props {
  initialSettings: any | null;
}

export default function SettingsClient({ initialSettings }: Props) {
  const { data: session } = useSession();
  const { currentContext, currentOrganization, getCurrentContextId } = useOrganization();
  const contextId = getCurrentContextId() || session?.user.id;
  
  console.log('[SettingsClient] Current context:', currentContext);
  console.log('[SettingsClient] Current organization:', currentOrganization);
  console.log('[SettingsClient] Context ID:', contextId);
  console.log('[SettingsClient] Session user ID:', session?.user.id);

  const [name, setName] = useState(initialSettings?.name || 'Kommander.ai');
  const [color, setColor] = useState(initialSettings?.color || '#6366f1');
  const [personality, setPersonality] = useState(initialSettings?.personality || 'neutral');
  const [traits, setTraits] = useState<Trait[]>(initialSettings?.traits || []);
  const [notificationEmail, setNotificationEmail] = useState(initialSettings?.notificationEmail || '');
  const [saving, setSaving] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [activeSection, setActiveSection] = useState('customization');
  const [isLoading, setIsLoading] = useState(false);

  // Load settings when context changes
  useEffect(() => {
    const loadContextSettings = async () => {
      console.log('[SettingsClient] Loading settings for contextId:', contextId);
      if (!contextId) {
        console.log('[SettingsClient] No contextId, skipping settings load');
        return;
      }
      
      setIsLoading(true);
      try {
        const url = `/api/settings/${contextId}?fresh=1`;
        console.log('[SettingsClient] Fetching from API:', url);
        const response = await fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
        console.log('[SettingsClient] API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[SettingsClient] Settings data received (fresh):', data);
          
          setName(data?.name || 'Kommander.ai');
          setColor(data?.color || '#6366f1');
          setPersonality(data?.personality || 'neutral');
          setTraits(data?.traits || []);
          setNotificationEmail(data?.notificationEmail || '');
          
          console.log('[SettingsClient] Settings applied:', {
            name: data?.name || 'Kommander.ai',
            color: data?.color || '#6366f1',
            personality: data?.personality || 'neutral',
            traits: data?.traits || [],
            notificationEmail: data?.notificationEmail || ''
          });
        } else {
          console.log('[SettingsClient] API response not ok:', response.status);
        }
      } catch (error) {
        console.error('[SettingsClient] Error loading context settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    console.log('[SettingsClient] useEffect triggered with contextId:', contextId, 'currentContext:', currentContext);
    loadContextSettings();
  }, [contextId, currentContext]);

  const toggleTrait = (t: Trait) => {
    setTraits(prev => {
      if (prev.includes(t)) {
        return prev.filter(x => x !== t);
      }
      if (prev.length >= 3) return prev;
      return [...prev, t];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await saveSettings({ name, color, personality, traits, notificationEmail }, contextId);
    setSaving(false);
  };

  const handleApplyTemplate = (templateSettings: any) => {
    if (templateSettings.personality?.name) {
      setName(templateSettings.personality.name);
    }
    if (templateSettings.appearance?.primaryColor) {
      setColor(templateSettings.appearance.primaryColor);
    }
    if (templateSettings.behavior?.formality) {
      const formalityMap = {
        casual: 'casual',
        professional: 'neutral', 
        formal: 'formal'
      };
      setPersonality(formalityMap[templateSettings.behavior.formality] || 'neutral');
    }
    if (templateSettings.personality?.traits) {
      const availableTraits = traitOptions.map(t => t.value);
      const filteredTraits = templateSettings.personality.traits
        .filter((trait: string) => availableTraits.includes(trait as Trait))
        .slice(0, 3);
      setTraits(filteredTraits);
    }
    setShowTemplateGallery(false);
  };

  const navigationSections = [
    {
      id: 'customization',
      title: 'Personalizzazione',
      icon: Palette,
      description: 'Personalizza il tuo chatbot',
      badge: 'Attivo'
    },
    {
      id: 'automations',
      title: 'Automazioni',
      icon: Bot,
      description: 'Automatizza le interazioni',
      badge: 'Presto'
    }
  ];

  return (
    <div className="container mx-auto py-6 space-y-8 max-w-7xl">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Cog className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Impostazioni
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Personalizza e configura il tuo assistente AI. Gestisci impostazioni, aspetto e automazioni per ottimizzare l'esperienza utente.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          {navigationSections.map((section) => {
            const IconComponent = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                  activeSection === section.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <IconComponent className="h-4 w-4" />
                <span>{section.title}</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {section.badge}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>
          
          {/* Customization Section */}
          {activeSection === 'customization' && (
            <>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Basic Settings Card */}
                  <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <CardHeader className="space-y-2 pb-4">
                      <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900 dark:text-white">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        Basic Information
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Configure your chatbot's name and visual appearance</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Name Input */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="text-gray-500">🤖</span>
                          Chatbot Name
                        </label>
                        <Input 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          className="h-12 px-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                          placeholder="Enter your chatbot's name"
                        />
                      </div>

                      {/* Color Picker */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="text-gray-500">🎨</span>
                          Theme Color
                        </label>
                        <div className="flex items-center gap-4">
                          <Input 
                            type="color" 
                            value={color} 
                            onChange={(e) => setColor(e.target.value)} 
                            className="w-16 h-12 p-1 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-900 cursor-pointer hover:scale-105 transition-transform duration-200" 
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{color.toUpperCase()}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Click to change color</div>
                          </div>
                          <div 
                            className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                            style={{ backgroundColor: color }}
                          ></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Personality & Traits Card */}
                  <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <CardHeader className="space-y-2 pb-4">
                      <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900 dark:text-white">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                        Carattere e Personalità
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Definisci il carattere e i tratti della personalità del tuo chatbot</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Personality */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="text-gray-500">🎭</span>
                          Carattere Generale
                        </label>
                        <RadioGroup value={personality} onValueChange={setPersonality} className="grid grid-cols-1 gap-3">
                          <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                            <RadioGroupItem value="casual" id="casual" />
                            <label htmlFor="casual" className="text-sm font-medium cursor-pointer flex-1">😊 Casual - Amichevole e informale</label>
                          </div>
                          <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                            <RadioGroupItem value="neutral" id="neutral" />
                            <label htmlFor="neutral" className="text-sm font-medium cursor-pointer flex-1">🤖 Neutrale - Equilibrato e professionale</label>
                          </div>
                          <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                            <RadioGroupItem value="formal" id="formal" />
                            <label htmlFor="formal" className="text-sm font-medium cursor-pointer flex-1">🎩 Formale - Cortese e riservato</label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Personality Traits */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="text-gray-500">✨</span>
                          Tratti della Personalità (max 3)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {traitOptions.map((trait) => (
                            <div key={trait.value} className="flex items-center space-x-3">
                              <Checkbox
                                id={trait.value}
                                checked={traits.includes(trait.value)}
                                onCheckedChange={() => toggleTrait(trait.value)}
                                disabled={!traits.includes(trait.value) && traits.length >= 3}
                                className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                              />
                              <label 
                                htmlFor={trait.value} 
                                className={cn(
                                  "text-sm font-medium cursor-pointer transition-opacity",
                                  !traits.includes(trait.value) && traits.length >= 3 ? "opacity-50" : "opacity-100"
                                )}
                              >
                                {trait.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {traits.length}/3 tratti selezionati
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                </div>

                {/* Email Notifications Card */}
                <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                  <CardHeader className="space-y-2 pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900 dark:text-white">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      Notifiche Email
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ricevi notifiche via email quando viene avviata una nuova conversazione</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Email Notification Input */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <span className="text-gray-500">📧</span>
                        Email di Notifica
                      </label>
                      <Input 
                        type="email"
                        value={notificationEmail} 
                        onChange={(e) => setNotificationEmail(e.target.value)} 
                        className="h-12 px-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="inserisci@tuaemail.com"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        💡 Inserisci l'email dove vuoi ricevere notifiche quando un utente inizia una nuova conversazione sul chatbot widget
                      </div>
                    </div>
                    
                    {/* Info Box */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-3">
                        <div className="text-blue-500 mt-0.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          <p className="font-medium mb-1">Come funziona:</p>
                          <ul className="space-y-1 text-xs">
                            <li>• Riceverai un'email ogni volta che un utente avvia una nuova conversazione</li>
                            <li>• L'email includerà il primo messaggio dell'utente e i dettagli della conversazione</li>
                            <li>• Potrai cliccare sul link nell'email per visualizzare la conversazione completa</li>
                            <li>• Lascia vuoto questo campo per disabilitare le notifiche</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Changes will be applied immediately after saving
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="px-6 py-3 h-auto border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                      onClick={() => {
                        setName('Kommander.ai');
                        setColor('#6366f1');
                        setPersonality('neutral');
                        setTraits([]);
                      }}
                    >
                      Reset to Default
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={saving}
                      className="px-8 py-3 h-auto bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <div className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </div>
                      ) : (
                        'Save Settings'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
              
              {/* Template Gallery Modal */}
              {showTemplateGallery && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Template Gallery</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTemplateGallery(false)}
                        className="rounded-lg"
                      >
                        ✕
                      </Button>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                      <TemplateGallery 
                        onApplyTemplate={handleApplyTemplate}
                        currentSettings={{ name, color, personality, traits }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
      {/* Automations Section */}
      {activeSection === 'automations' && (
        <div className="space-y-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-lg mx-auto border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 hover:border-primary/40 transition-all duration-300 group">
              <CardContent className="p-12 text-center">
                <div className="mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <div className="relative">
                    <Bot className="mx-auto h-16 w-16 text-primary mb-4 group-hover:scale-110 transition-transform duration-300" />
                    <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-secondary animate-pulse" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Automazioni 🤖
                </h2>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  Le automazioni intelligenti arriveranno presto! Potrai automatizzare risposte, 
                  programmare messaggi e creare flussi di lavoro personalizzati.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Prossimamente disponibile</span>
                </div>
                <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/20">
                  <h3 className="font-semibold mb-2 text-sm">Funzionalità previste:</h3>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Risposte automatiche intelligenti</li>
                    <li>• Programmazione messaggi</li>
                    <li>• Flussi di lavoro personalizzati</li>
                    <li>• Integrazioni con servizi esterni</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
