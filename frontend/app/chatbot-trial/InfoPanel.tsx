"use client";

import { useState } from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Input } from "@/frontend/components/ui/input";

interface InfoPanelProps {
  snippet: string;
  shareUrl: string;
}

export default function InfoPanel({ snippet, shareUrl }: InfoPanelProps) {
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopy = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <CheckCircle className="text-green-600" />
        <span>Il tuo Chatbot AI è pronto!</span>
      </h1>
      <p className="text-muted-foreground">
        Il tuo addestramento del Chatbot è completo: usa il link qui sotto per
        condividerlo sui social media, nelle app di messaggistica o nelle email.
      </p>
      <div className="flex items-start gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
        <AlertTriangle className="w-5 h-5 mt-1" />
        <p className="text-sm">
          Il chatbot può rispondere solo utilizzando le informazioni che hai
          fornito. Se alcune risposte non sono corrette, puoi perfezionare la sua
          knowledge base.
        </p>
      </div>
      <div className="space-y-2">
        <h2 className="font-semibold">Installa Chatbot</h2>
        <div className="relative">
          <Textarea
            readOnly
            value={snippet}
            className="font-mono text-sm bg-muted pr-24"
            rows={4}
          />
          <Button
            size="sm"
            onClick={() => handleCopy(snippet, setSnippetCopied)}
            className="absolute top-2 right-2"
          >
            {snippetCopied ? "Copiato!" : "Copia"}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="font-semibold">Condividi Chatbot</h2>
        <div className="flex items-center gap-2">
          <Input readOnly value={shareUrl} className="flex-1" />
          <Button
            size="sm"
            onClick={() => handleCopy(shareUrl, setLinkCopied)}
          >
            {linkCopied ? "Copiato!" : "Copia"}
          </Button>
        </div>
      </div>
    </div>
  );
}
