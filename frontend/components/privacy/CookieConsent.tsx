"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent } from '@/frontend/components/ui/card';
import { Separator } from '@/frontend/components/ui/separator';
import { Switch } from '@/frontend/components/ui/switch';
import { Badge } from '@/frontend/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/frontend/components/ui/dialog';
import { Cookie, Settings, Shield, BarChart3, Target, X } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true, // Always required
  analytics: false,
  marketing: false,
  functional: false
};

export default function CookieConsent() {
  const { data: session } = useSession();
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const [hasConsented, setHasConsented] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const savedConsent = localStorage.getItem('cookie-consent');
    const savedPreferences = localStorage.getItem('cookie-preferences');
    
    if (savedConsent) {
      setHasConsented(true);
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences));
      }
    } else {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const saveConsent = async (prefs: CookiePreferences) => {
    // Save to localStorage
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('cookie-preferences', JSON.stringify(prefs));
    
    // Save to database if user is logged in
    if (session?.user?.id) {
      try {
        await fetch('/api/privacy/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            preferences: prefs,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Failed to save consent:', error);
      }
    }
    
    setPreferences(prefs);
    setHasConsented(true);
    setShowBanner(false);
    setShowSettings(false);
    
    // Apply cookie settings
    applyCookieSettings(prefs);
  };

  const applyCookieSettings = (prefs: CookiePreferences) => {
    // Apply analytics cookies
    if (prefs.analytics) {
      // Enable Google Analytics or other analytics
      console.log('Analytics cookies enabled');
    } else {
      // Disable analytics
      console.log('Analytics cookies disabled');
    }
    
    // Apply marketing cookies
    if (prefs.marketing) {
      console.log('Marketing cookies enabled');
    } else {
      console.log('Marketing cookies disabled');
    }
    
    // Apply functional cookies
    if (prefs.functional) {
      console.log('Functional cookies enabled');
    } else {
      console.log('Functional cookies disabled');
    }
  };

  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true
    };
    saveConsent(allAccepted);
  };

  const rejectOptional = () => {
    saveConsent(DEFAULT_PREFERENCES);
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const saveCustomPreferences = () => {
    saveConsent(preferences);
  };

  const cookieTypes = [
    {
      key: 'necessary' as keyof CookiePreferences,
      title: 'Necessary Cookies',
      description: 'Essential for the website to function properly. These cannot be disabled.',
      icon: Shield,
      required: true
    },
    {
      key: 'functional' as keyof CookiePreferences,
      title: 'Functional Cookies',
      description: 'Enable enhanced functionality and personalization, such as remembering your preferences.',
      icon: Settings,
      required: false
    },
    {
      key: 'analytics' as keyof CookiePreferences,
      title: 'Analytics Cookies',
      description: 'Help us understand how visitors interact with our website by collecting anonymous information.',
      icon: BarChart3,
      required: false
    },
    {
      key: 'marketing' as keyof CookiePreferences,
      title: 'Marketing Cookies',
      description: 'Used to track visitors and display ads that are relevant and engaging.',
      icon: Target,
      required: false
    }
  ];

  if (hasConsented && !showSettings) {
    return null;
  }

  return (
    <>
      {/* Cookie Consent Banner */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
          <Card className="mx-auto max-w-4xl">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Cookie className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Cookie Preferences</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts. 
                    You can customize your preferences or accept our recommended settings.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={acceptAll} className="bg-primary hover:bg-primary/90">
                      Accept All
                    </Button>
                    <Button onClick={rejectOptional} variant="outline">
                      Reject Optional
                    </Button>
                    <Button onClick={openSettings} variant="ghost">
                      <Settings className="h-4 w-4 mr-2" />
                      Customize
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBanner(false)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Cookie Settings
            </DialogTitle>
            <DialogDescription>
              Choose which cookies you want to accept. You can change these settings at any time.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {cookieTypes.map((type) => (
              <div key={type.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <type.icon className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {type.title}
                        {type.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {type.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences[type.key]}
                    onCheckedChange={(checked) => {
                      if (!type.required) {
                        setPreferences(prev => ({
                          ...prev,
                          [type.key]: checked
                        }));
                      }
                    }}
                    disabled={type.required}
                  />
                </div>
                {type.key !== 'marketing' && <Separator />}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={saveCustomPreferences}>
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Cookie Settings Button (for users who have already consented) */}
      {hasConsented && !showBanner && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 z-40 rounded-full shadow-lg"
          onClick={() => setShowSettings(true)}
          title="Cookie Settings"
        >
          <Cookie className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}
