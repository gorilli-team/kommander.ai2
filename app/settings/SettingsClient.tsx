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
  const { currentContext, currentOrganization } = useOrganization();
  const contextId = currentOrganization?.id || session?.user.id;

  const [name, setName] = useState(initialSettings?.name || 'Kommander.ai');
  const [color, setColor] = useState(initialSettings?.color || '#6366f1');
  const [personality, setPersonality] = useState(initialSettings?.personality || 'neutral');
  const [traits, setTraits] = useState<Trait[]>(initialSettings?.traits || []);
  const [saving, setSaving] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [activeSection, setActiveSection] = useState('customization');
  const [isLoading, setIsLoading] = useState(false);

  // Load settings when context changes
  useEffect(() => {
    const loadContextSettings = async () => {
      if (!contextId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/settings/${contextId}`);
        if (response.ok) {
          const data = await response.json();
          setName(data?.name || 'Kommander.ai');
          setColor(data?.color || '#6366f1');
          setPersonality(data?.personality || 'neutral');
          setTraits(data?.traits || []);
        }
      } catch (error) {
        console.error('Error loading context settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
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
    await saveSettings({ name, color, personality, traits }, contextId);
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

                </div>


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
