'use client';

import { useState } from 'react';
import { Input } from '@/frontend/components/ui/input';
import { Button } from '@/frontend/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/frontend/components/ui/radio-group';
import { Checkbox } from '@/frontend/components/ui/checkbox';
import { saveSettings } from './actions';

const traitOptions = [
  { value: 'avventuroso', label: '🦁 Avventuroso' },
  { value: 'fiducioso', label: '💪 Fiducioso' },
  { value: 'convincente', label: '🤝 Convincente' },
  { value: 'energetico', label: '⚡ Energetico' },
  { value: 'amichevole', label: '🙂 Amichevole' },
  { value: 'divertente', label: '🤣 Divertente' },
  { value: 'ironico', label: '😜 Ironico' },
  { value: 'professionista', label: '💼 Professionista' },
] as const;
type Trait = typeof traitOptions[number]['value'];

interface Props {
  initialSettings: any | null;
}

export default function SettingsClient({ initialSettings }: Props) {
  const [name, setName] = useState(initialSettings?.name || 'Kommander.ai');
  const [color, setColor] = useState(initialSettings?.color || '#1E3A8A');
  const [personality, setPersonality] = useState(initialSettings?.personality || 'neutral');
  const [traits, setTraits] = useState<Trait[]>(initialSettings?.traits || []);
  const [saving, setSaving] = useState(false);

  const toggleTrait = (t: Trait) => {
    setTraits(prev => {
      if (prev.includes(t)) {
        return prev.filter(x => x !== t);
      }
      if (prev.length >= 3) return prev;
      return [...prev, t];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await saveSettings({ name, color, personality, traits });
    setSaving(false);
  };

  return (
    <div className="container mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-headline font-bold mb-2 text-foreground">Settings</h1>
        <p className="text-muted-foreground">Customize your chatbot.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Chatbot Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-background" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Color</label>
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-20 h-10 p-1" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Personality</label>
          <RadioGroup value={personality} onValueChange={setPersonality} className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="neutral" id="p-neutral" />
              <span>👋 Neutro</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="casual" id="p-casual" />
              <span>🤙 Casual</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="formal" id="p-formal" />
              <span>🤝 Formale</span>
            </label>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Carattere (max 3)</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {traitOptions.map((t) => (
              <label key={t.value} className="flex items-center gap-2 text-sm">
                <Checkbox checked={traits.includes(t.value)} onCheckedChange={() => toggleTrait(t.value)} />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </form>
    </div>
  );
}
