'use client';

import { useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Badge } from '@/frontend/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/frontend/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/frontend/components/ui/radio-group';
import { Label } from '@/frontend/components/ui/label';
import { Separator } from '@/frontend/components/ui/separator';
import { CheckCircle, ArrowRight, Sparkles, Zap, Users, Briefcase } from 'lucide-react';
import { 
  PERSONALITY_TEMPLATES, 
  PERSONALITY_CATEGORIES, 
  QUICK_SETUP_QUESTIONS,
  type PersonalityTemplate,
  getTemplatesByCategory,
  convertTemplateToSettings,
  recommendTemplate
} from '@/backend/lib/personalityTemplates';
import { saveSettings } from './actions';

interface TemplateGalleryProps {
  onApplyTemplate: (settings: any) => void;
  currentSettings?: any;
}

export function TemplateGallery({ onApplyTemplate, currentSettings }: TemplateGalleryProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PersonalityTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState('business');
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState<Record<string, string>>({});

  const handleApplyTemplate = (template: PersonalityTemplate) => {
    const settings = convertTemplateToSettings(template);
    onApplyTemplate(settings);
    // Map traits to backend expected Italian values before saving
    const traitMap: Record<string, string> = {
      adventurous: 'avventuroso',
      confident: 'fiducioso',
      convincing: 'convincente',
      energetic: 'energetico',
      friendly: 'amichevole',
      fun: 'divertente',
      ironic: 'ironico',
      professional: 'professionista',
    };
    const mapped = {
      ...settings,
      traits: Array.isArray(settings.traits) ? settings.traits.map((t: string) => traitMap[t] || t).slice(0, 3) : [],
    } as any;
    saveSettings(mapped as any);
  };

  const handleWizardAnswer = (questionId: string, answer: string) => {
    setWizardAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleWizardNext = () => {
    if (wizardStep < QUICK_SETUP_QUESTIONS.length - 1) {
      setWizardStep(wizardStep + 1);
    } else {
      // Final step - recommend template
      const recommended = recommendTemplate(wizardAnswers);
      setSelectedTemplate(recommended);
      setShowWizard(false);
      setWizardStep(0);
      setWizardAnswers({});
    }
  };

  const handleWizardBack = () => {
    if (wizardStep > 0) {
      setWizardStep(wizardStep - 1);
    }
  };

  const currentQuestion = QUICK_SETUP_QUESTIONS[wizardStep];
  const isWizardStepComplete = wizardAnswers[currentQuestion?.id];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Template Gallery</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Choose from professionally crafted personality templates or let our wizard recommend the perfect one for your business.
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex justify-center gap-4">
          <Dialog open={showWizard} onOpenChange={setShowWizard}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Zap className="w-4 h-4 mr-2" />
                Quick Setup Wizard
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Quick Setup Wizard</DialogTitle>
                <DialogDescription>
                  Answer a few questions and we'll recommend the perfect personality template for your chatbot.
                </DialogDescription>
              </DialogHeader>
              
              {currentQuestion && (
                <div className="space-y-6">
                  {/* Progress indicator */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Step {wizardStep + 1} of {QUICK_SETUP_QUESTIONS.length}</span>
                    <span>{Math.round(((wizardStep + 1) / QUICK_SETUP_QUESTIONS.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((wizardStep + 1) / QUICK_SETUP_QUESTIONS.length) * 100}%` }}
                    />
                  </div>
                  
                  {/* Question */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{currentQuestion.question}</h3>
                    <RadioGroup 
                      value={wizardAnswers[currentQuestion.id] || ''} 
                      onValueChange={(value) => handleWizardAnswer(currentQuestion.id, value)}
                    >
                      {currentQuestion.options.map((option) => (
                        <div key={option.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                          <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor={option.value} className="flex items-center cursor-pointer">
                              {'icon' in option && <span className="mr-2">{option.icon}</span>}
                              <span className="font-medium">{option.label}</span>
                            </Label>
                            {'description' in option && (
                              <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  
                  {/* Navigation */}
                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={handleWizardBack}
                      disabled={wizardStep === 0}
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleWizardNext}
                      disabled={!isWizardStepComplete}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {wizardStep === QUICK_SETUP_QUESTIONS.length - 1 ? 'Get Recommendation' : 'Next'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          <Button variant="outline">
            <Users className="w-4 h-4 mr-2" />
            Browse All Templates
          </Button>
        </div>
      </div>

      {/* Template Categories */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-6">
          {PERSONALITY_CATEGORIES.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="text-xs">
              <span className="mr-1">{category.icon}</span>
              <span className="hidden sm:inline">{category.name.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {PERSONALITY_CATEGORIES.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            <div className="text-center py-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {category.icon} {category.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">{category.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getTemplatesByCategory(category.id).map((template) => (
                <Card 
                  key={template.id} 
                  className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer"
                >
                  <div onClick={() => setSelectedTemplate(template)} role="button" tabIndex={0} className="outline-none">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                          style={{ backgroundColor: template.color + '20', color: template.color }}
                        >
                          {template.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            {template.personality}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="mt-2">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Use Case:</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{template.useCase}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Traits:</h4>
                      <div className="flex flex-wrap gap-1">
                        {template.traits.map((trait) => (
                          <Badge key={trait} variant="outline" className="text-xs">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full group-hover:bg-blue-600 group-hover:text-white transition-colors"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyTemplate(template);
                      }}
                    >
                      Apply Template
                    </Button>
                  </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <div className="flex items-center space-x-3">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: selectedTemplate.color + '20', color: selectedTemplate.color }}
                >
                  {selectedTemplate.icon}
                </div>
                <div>
                  <DialogTitle className="text-xl">{selectedTemplate.name}</DialogTitle>
                  <DialogDescription>{selectedTemplate.description}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Template Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Personality:</h4>
                  <Badge style={{ backgroundColor: selectedTemplate.color, color: 'white' }}>
                    {selectedTemplate.personality}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Category:</h4>
                  <Badge variant="outline">{selectedTemplate.category}</Badge>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Traits:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.traits.map((trait) => (
                    <Badge key={trait} variant="secondary">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Sample Conversations */}
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Sample Conversation:</h4>
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">Greeting:</p>
                    <p className="text-sm">{selectedTemplate.prompts.greeting}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">Help Response:</p>
                    <p className="text-sm">{selectedTemplate.prompts.helpMessage}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Settings Preview */}
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Settings:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Response Length:</span>
                    <span className="ml-2 font-medium">{selectedTemplate.settings.responseLength}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Technical Level:</span>
                    <span className="ml-2 font-medium">{selectedTemplate.settings.technicalLevel}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Empathy:</span>
                    <span className="ml-2 font-medium">{selectedTemplate.settings.empathy}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Formality:</span>
                    <span className="ml-2 font-medium">{selectedTemplate.settings.formality}</span>
                  </div>
                </div>
              </div>
              
              {/* Apply Button */}
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    handleApplyTemplate(selectedTemplate);
                    setSelectedTemplate(null);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Apply This Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
