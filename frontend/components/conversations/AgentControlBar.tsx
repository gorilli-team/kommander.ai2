'use client';
import { useState } from 'react';
import { Button } from '@/frontend/components/ui/button';

interface Props {
  conversationId: string;
  initialHandledBy: 'bot' | 'agent';
  onChange?: (handledBy: 'bot' | 'agent') => void;
}

export default function AgentControlBar({ conversationId, initialHandledBy, onChange }: Props) {
  const [handledBy, setHandledBy] = useState<'bot' | 'agent'>(initialHandledBy);

  const toggle = async () => {
    const next = handledBy === 'bot' ? 'agent' : 'bot';
    await fetch(`/api/conversations/${conversationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handledBy: next }),
    });
    setHandledBy(next);
    onChange?.(next);
  };

  return (
    <div className="p-2 border-t border-border bg-muted flex items-center justify-between">
      <span className="text-sm">{handledBy === 'bot' ? 'Il bot sta rispondendo' : 'Operatore umano in controllo'}</span>
      <Button size="sm" onClick={toggle} className="ml-2">
        {handledBy === 'bot' ? 'Prendi il controllo' : 'Rilascia al bot'}
      </Button>
    </div>
  );
}
