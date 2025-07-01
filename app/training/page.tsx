
"use client";

import React, { useState } from 'react';
import FaqList from '@/frontend/components/training/FaqList';
import FileList from '@/frontend/components/training/FileList';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs';
import { Badge } from '@/frontend/components/ui/badge';
import { BookOpen, FileText, HelpCircle, Upload, Brain, Zap } from 'lucide-react';
import { cn } from '@/frontend/lib/utils';

type ActiveTab = "faqs" | "files";

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("faqs");

  return (
    <div className="container mx-auto py-6 space-y-8 max-w-7xl">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Brain className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Training Center
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Build your AI's knowledge base by managing FAQs and uploading documents. 
          The more you train, the smarter your assistant becomes.
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-l-4 border-l-gray-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Knowledge Base</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">FAQs and documents ready</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Status</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">Ready to learn and assist</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Quality</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">Excellent</div>
            <p className="text-xs text-muted-foreground">Well-trained knowledge base</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Training Interface */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)} className="space-y-6">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
            <TabsTrigger value="faqs" className="flex items-center space-x-2 text-base">
              <HelpCircle className="h-4 w-4" />
              <span>FAQs</span>
              <Badge variant="secondary" className="ml-1">Smart</Badge>
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center space-x-2 text-base">
              <FileText className="h-4 w-4" />
              <span>Documents</span>
              <Badge variant="secondary" className="ml-1">AI-Ready</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="faqs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                <CardTitle>Frequently Asked Questions</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Create question-answer pairs to help your AI provide instant, accurate responses.
              </p>
            </CardHeader>
            <CardContent>
              <FaqList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-primary" />
                <CardTitle>Document Library</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload documents, PDFs, and files to expand your AI's knowledge base automatically.
              </p>
            </CardHeader>
            <CardContent>
              <FileList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Training Tips */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
            <BookOpen className="h-5 w-5" />
            <span>Training Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">📝 FAQ Best Practices:</h4>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                <li>• Use natural, conversational questions</li>
                <li>• Provide comprehensive, helpful answers</li>
                <li>• Cover common customer inquiries</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">📄 Document Guidelines:</h4>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                <li>• Upload relevant business documents</li>
                <li>• Include product manuals and guides</li>
                <li>• Keep content updated and accurate</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
