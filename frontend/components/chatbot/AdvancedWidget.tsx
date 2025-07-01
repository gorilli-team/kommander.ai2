"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Card } from '@/frontend/components/ui/card';
import { Badge } from '@/frontend/components/ui/badge';
import { 
  MessageCircle, X, Minimize2, Maximize2, 
  Settings, Star, Download, Share2, 
  Clock, Users, Zap
} from 'lucide-react';

interface WidgetConfig {
  theme: 'light' | 'dark' | 'auto';
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor: string;
  welcomeMessage: string;
  avatar: string;
  showBranding: boolean;
  enableRating: boolean;
  enableTranscript: boolean;
  workingHours?: {
    enabled: boolean;
    timezone: string;
    schedule: Array<{day: string; start: string; end: string}>;
  };
}

interface AdvancedWidgetProps {
  config: WidgetConfig;
  onConfigChange?: (config: WidgetConfig) => void;
}

export default function AdvancedWidget({ config, onConfigChange }: AdvancedWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Check working hours
  useEffect(() => {
    if (config.workingHours?.enabled) {
      checkWorkingHours();
      const interval = setInterval(checkWorkingHours, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [config.workingHours]);

  const checkWorkingHours = () => {
    if (!config.workingHours?.enabled) return;
    
    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5);
    
    const todaySchedule = config.workingHours.schedule.find(s => s.day === today);
    if (todaySchedule) {
      const isInWorkingHours = currentTime >= todaySchedule.start && currentTime <= todaySchedule.end;
      setIsOnline(isInWorkingHours);
    } else {
      setIsOnline(false);
    }
  };

  const getPositionClasses = () => {
    switch (config.position) {
      case 'bottom-right': return 'bottom-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'top-right': return 'top-4 right-4';
      case 'top-left': return 'top-4 left-4';
      default: return 'bottom-4 right-4';
    }
  };

  const handleExportTranscript = () => {
    // Implementation for exporting chat transcript
    console.log('Exporting transcript...');
  };

  const handleRating = (rating: number) => {
    // Implementation for rating
    console.log('Rating:', rating);
  };

  const handleShare = () => {
    // Implementation for sharing conversation
    console.log('Sharing conversation...');
  };

  return (
    <div className={`fixed z-50 ${getPositionClasses()}`}>
      {/* Chat Widget */}
      {isOpen ? (
        <Card 
          className={`w-80 h-96 shadow-2xl transition-all duration-300 ${
            isMinimized ? 'h-12' : 'h-96'
          }`}
          style={{ 
            backgroundColor: config.theme === 'dark' ? '#1f2937' : '#ffffff',
            borderColor: config.primaryColor 
          }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-3 border-b"
            style={{ backgroundColor: config.primaryColor, color: 'white' }}
          >
            <div className="flex items-center space-x-2">
              <img 
                src={config.avatar} 
                alt="Assistant" 
                className="w-8 h-8 rounded-full"
              />
              <div>
                <h3 className="font-semibold text-sm">Kommander.ai</h3>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                  <span className="text-xs opacity-90">
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfig(!showConfig)}
                className="text-white hover:bg-white/20"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-white/20"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Configuration Panel */}
              {showConfig && (
                <div className="p-3 border-b bg-gray-50 dark:bg-gray-800">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Quick Actions</h4>
                    <div className="flex space-x-2">
                      {config.enableTranscript && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportTranscript}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Export
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShare}
                      >
                        <Share2 className="w-3 h-3 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Area */}
              <div className="flex-1 p-3">
                <div className="text-center text-sm text-gray-500">
                  {config.welcomeMessage}
                </div>
                {/* Chat messages would go here */}
              </div>

              {/* Rating System */}
              {config.enableRating && (
                <div className="p-3 border-t">
                  <div className="text-xs text-gray-500 mb-2">Rate this conversation:</div>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRating(rating)}
                        className="p-1"
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Branding */}
              {config.showBranding && (
                <div className="p-2 border-t text-center">
                  <span className="text-xs text-gray-400">
                    Powered by Kommander.ai
                  </span>
                </div>
              )}
            </>
          )}
        </Card>
      ) : (
        /* Chat Button */
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg relative"
          style={{ backgroundColor: config.primaryColor }}
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center"
              style={{ backgroundColor: '#ef4444', color: 'white' }}
            >
              {unreadCount}
            </Badge>
          )}
          {!isOnline && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 rounded-full border-2 border-white" />
          )}
        </Button>
      )}
    </div>
  );
}
