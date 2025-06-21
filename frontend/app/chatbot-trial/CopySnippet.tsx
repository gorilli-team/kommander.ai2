"use client";
import { useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';

export default function CopySnippet({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <div className="relative">
      <textarea
        readOnly
        value={snippet}
        className="w-full font-mono text-sm bg-muted p-3 rounded-md"
        rows={4}
      />
      <Button onClick={handleCopy} className="absolute top-2 right-2">
        {copied ? 'Copiato!' : 'Copia negli appunti'}
      </Button>
    </div>
  );
}

export function CopyInput({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input readOnly value={value} className="flex-1" />
      <Button size="sm" onClick={handleCopy}>
        {copied ? 'Copiato!' : 'Copia'}
      </Button>
    </div>
  );
}
