'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Input } from '@/frontend/components/ui/input';
import { Button } from '@/frontend/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/frontend/components/ui/radio-group';
import { Checkbox } from '@/frontend/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { saveSettings } from './actions';
import { PersonalityTester } from './personality-tester';
import { TemplateGallery } from './template-gallery';
import { WhatsAppIntegration } from './whatsapp-integration';

const traitOptions = [
  { value: 'avventuroso', label: '🦁 Avventuroso' },
  { value: 'fiducioso', label: '💪 Fiducioso' },
  { value: 'convincente', label: '🤝 Convincente' },  
  { value: 'energetico', label: '⚡ Energetico' },
  { value: 'amichevole', label: '🙂 Amichevole' },
  { value: 'divertente', label: '🤣 Divertente' },
  { value: 'ironico', label: '😜 Ironico' },
  { value: 'professionista', label: '💼 Professionista' },
] as const;

type Trait = typeof traitOptions[number]['value'];

interface Props {
  initialSettings: any | null;
}

export default function SettingsClient({ initialSettings }: Props) {
  const { data: session } = useSession();
  const [name, setName] = useState(initialSettings?.name || 'Kommander.ai');
  const [color, setColor] = useState(initialSettings?.color || '#6366f1');
  const [personality, setPersonality] = useState(initialSettings?.personality || 'neutral');
  const [traits, setTraits] = useState<Trait[]>(initialSettings?.traits || []);
  const [saving, setSaving] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [activeSection, setActiveSection] = useState('customization');

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
    await saveSettings({ name, color, personality, traits });
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

  const sidebarSections = [
    {
      id: 'customization',
      title: 'Customization',
      icon: '🎨',
      description: 'Personalizza il tuo chatbot'
    },
    {
      id: 'im-integration',
      title: 'IM Integration',
      icon: '💬',
      description: 'Integra con messaggistica',
      subsections: [
        {
          id: 'whatsapp',
          title: 'WhatsApp',
          icon: '📱'
        }
      ]
    }
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            ⚙️ Settings
          </h2>
          
          <nav className="space-y-2">
            {sidebarSections.map((section) => (
              <div key={section.id}>
                <button
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l-4 border-blue-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-lg">{section.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{section.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {section.description}
                    </div>
                  </div>
                </button>
                
                {/* Subsections */}
                {section.subsections && activeSection === section.id && (
                  <div className="ml-6 mt-2 space-y-1">
                    {section.subsections.map((subsection) => (
                      <button
                        key={subsection.id}
                        onClick={() => setActiveSection(subsection.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all duration-200 ${
                          activeSection === subsection.id
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span>{subsection.icon}</span>
                        <span className="text-sm font-medium">{subsection.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-8 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {activeSection === 'customization' && 'Customization'}
              {activeSection === 'im-integration' && 'IM Integration'}
              {activeSection === 'whatsapp' && 'WhatsApp Integration'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {activeSection === 'customization' && 'Personalizza il tuo chatbot con nome, colori e personalità'}
              {activeSection === 'im-integration' && 'Connetti il tuo chatbot a piattaforme di messaggistica'}
              {activeSection === 'whatsapp' && 'Configura l\'integrazione WhatsApp per rispondere ai messaggi'}
            </p>
          </div>
          
          {/* Customization Section */}
          {activeSection === 'customization' && (
            <>
              <div className="mb-6">
                <div className="flex gap-3 mb-6">
                  <Button
                    type="button"
                    onClick={() => setShowTemplateGallery(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <span className="mr-2">✨</span>
                    Browse Templates
                  </Button>
                </div>
              </div>

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

                  {/* Personality Card */}
                  <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <CardHeader className="space-y-2 pb-4">
                      <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900 dark:text-white">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        Personality Type
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Choose how your chatbot communicates</p>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup value={personality} onValueChange={setPersonality} className="grid gap-3">
                        {[
                          { value: 'neutral', label: '👋 Neutro', desc: 'Balanced and professional' },
                          { value: 'casual', label: '🤙 Casual', desc: 'Friendly and relaxed' },
                          { value: 'formal', label: '🤝 Formale', desc: 'Professional and structured' }
                        ].map((option) => (
                          <label key={option.value} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer transition-all duration-200 group">
                            <RadioGroupItem value={option.value} className="text-gray-600" />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{option.desc}</div>
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    </CardContent>
                  </Card>
                </div>

                {/* Character Traits Card */}
                <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                  <CardHeader className="space-y-2 pb-6">
                    <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900 dark:text-white">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                      Character Traits
                      <span className="ml-auto text-sm font-normal text-gray-500 dark:text-gray-400">
                        {traits.length}/3 selected
                      </span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Select up to 3 traits that define your chatbot's personality
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {traitOptions.map((trait) => {
                        const isSelected = traits.includes(trait.value);
                        const isDisabled = !isSelected && traits.length >= 3;
                        
                        return (
                          <label 
                            key={trait.value} 
                            className={`
                              relative flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer
                              ${isSelected 
                                ? 'border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-900/20 ring-2 ring-gray-500/20' 
                                : isDisabled
                                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 cursor-not-allowed'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/20'
                              }
                            `}
                          >
                            <Checkbox 
                              checked={isSelected} 
                              onCheckedChange={() => !isDisabled && toggleTrait(trait.value)}
                              disabled={isDisabled}
                              className="text-gray-600"
                            />
                            <span className={`text-sm font-medium select-none ${
                              isSelected 
                                ? 'text-gray-700 dark:text-gray-300'
                                : isDisabled
                                  ? 'text-gray-400 dark:text-gray-500'
                                  : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {trait.label}
                            </span>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-500 rounded-full flex items-center justify-center">
                                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </label>
                        );
                      })}
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
          
          {/* IM Integration Section */}
          {activeSection === 'im-integration' && (
            <div className="space-y-8">
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Available Platforms</h2>
                <div className="grid gap-4">
                  <button
                    onClick={() => setActiveSection('whatsapp')}
                    className="flex items-center gap-4 p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-lg font-medium text-gray-900 dark:text-white">WhatsApp</div>
                      <div className="text-gray-500 dark:text-gray-400">Integra il tuo chatbot con WhatsApp per messaggi diretti</div>
                    </div>
                    <div className="text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                  
                  {/* Future integrations */}
                  <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl opacity-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">T</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-medium text-gray-900 dark:text-white">Telegram</div>
                        <div className="text-gray-500 dark:text-gray-400">Coming soon - Telegram bot integration</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* WhatsApp Integration Section */}
          {activeSection === 'whatsapp' && (
            <div className="space-y-8">
              <WhatsAppIntegration />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
