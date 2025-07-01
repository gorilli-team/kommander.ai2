'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface PersonalityTesterProps {
  userId: string;
}

export function PersonalityTester({ userId }: PersonalityTesterProps) {
  const [testMessage, setTestMessage] = useState("Ciao! Mi puoi spiegare come funziona questo servizio?");
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleTest = async () => {
    if (!testMessage.trim()) return;
    
    setIsLoading(true);
    setError('');
    setResponse('');
    
    try {
      const res = await fetch('/api/test-personality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          testMessage: testMessage.trim()
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Errore nel test');
      }
      
      setResponse(data.response || 'Nessuna risposta ricevuta');
    } catch (err: any) {
      setError(err.message || 'Errore durante il test');
    } finally {
      setIsLoading(false);
    }
  };

  const quickTests = [
    "Ciao! Mi puoi spiegare come funziona questo servizio?",
    "Ho un problema urgente, puoi aiutarmi?",
    "Qual è il modo migliore per iniziare?",
    "Non riesco a capire come procedere.",
    "Grazie per l'aiuto! Sei stato molto utile."
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Test Personalità Chatbot</CardTitle>
        <CardDescription>
          Testa come il tuo chatbot risponde con la personalità e i caratteri configurati. 
          Dovresti notare differenze significative nel tono e nello stile di comunicazione.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-message">Messaggio di Test</Label>
          <Textarea
            id="test-message"
            placeholder="Inserisci un messaggio per testare la risposta del chatbot..."
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Test Rapidi</Label>
          <div className="flex flex-wrap gap-2">
            {quickTests.map((test, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setTestMessage(test)}
                className="text-xs"
              >
                {test.length > 30 ? test.substring(0, 30) + '...' : test}
              </Button>
            ))}
          </div>
        </div>
        
        <Button 
          onClick={handleTest} 
          disabled={isLoading || !testMessage.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Testa Personalità'
          )}
        </Button>
        
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}
        
        {response && (
          <div className="space-y-2">
            <Label>Risposta del Chatbot</Label>
            <div className="p-4 bg-gray-50 border rounded-md">
              <p className="text-sm whitespace-pre-wrap">{response}</p>
            </div>
            <p className="text-xs text-gray-600">
              💡 Osserva come il tono, lo stile e le espressioni riflettono la personalità e i caratteri selezionati.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
