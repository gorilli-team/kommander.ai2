
"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FaqList from '@/frontend/components/training/FaqList';
import FileList from '@/frontend/components/training/FileList';
import { Button } from '@/frontend/components/ui/button';
import { cn } from '@/frontend/lib/utils';
import { Skeleton } from '@/frontend/components/ui/skeleton';

type ActiveTab = "faqs" | "files";

export default function TrainingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("faqs");

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/training');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-2 space-y-6">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-2/3" />
        <div className="flex">
          <Skeleton className="h-10 w-24 mr-px" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    // This will be brief as the useEffect above will redirect
    return <div className="container mx-auto py-2 space-y-6">Redirecting to login...</div>;
  }

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
