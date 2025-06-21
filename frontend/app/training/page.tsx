
"use client";

import React, { useState } from 'react';
import FaqList from '@/frontend/components/training/FaqList';
import FileList from '@/frontend/components/training/FileList';
import { Button } from '@/frontend/components/ui/button';
import { cn } from '@/frontend/lib/utils';

type ActiveTab = "faqs" | "files";

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("faqs");

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold mb-2 text-foreground">Training Center</h1>
        <p className="text-muted-foreground">
          Manage your knowledge base by adding FAQs and uploading relevant documents.
        </p>
      </div>

      <div className="flex">
        <Button
          variant={activeTab === "faqs" ? "default" : "outline"}
          onClick={() => setActiveTab("faqs")}
          className={cn(
            "rounded-r-none focus:z-10",
            activeTab === "faqs" ? "shadow-md" : ""
          )}
        >
          FAQs
        </Button>
        <Button
          variant={activeTab === "files" ? "default" : "outline"}
          onClick={() => setActiveTab("files")}
          className={cn(
            "rounded-l-none focus:z-10 -ml-px", 
             activeTab === "files" ? "shadow-md" : ""
          )}
        >
          Files
        </Button>
      </div>
      
      <div className="space-y-6">
        {activeTab === "faqs" && <FaqList />}
        {activeTab === "files" && <FileList />}
      </div>
    </div>
  );
}
