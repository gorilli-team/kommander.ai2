export type WSMessage = {
  role: 'user' | 'assistant' | 'agent' | 'system';
  text: string;
  timestamp: string;
};

export async function broadcastUpdate(
  conversationId: string,
  payload: { handledBy?: 'bot' | 'agent'; messages?: WSMessage[] }
): Promise<void> {
  const url = process.env.WS_BROADCAST_URL;
  const token = process.env.WS_BROADCAST_TOKEN;

  // If external relay configured, use it
  if (url && token) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId, ...payload }),
        cache: 'no-store',
      });
      return;
    } catch (e) {
      console.error('[broadcastUpdate] Relay POST failed, falling back to local WS if available:', e);
      // fallthrough to local
    }
  }

  // Dev/local fallback: local WS hub
  try {
    const { getWsHub } = await import('./wsHub');
    try { getWsHub().start(); } catch {}
    getWsHub().broadcast(conversationId, { type: 'update', conversationId, ...payload } as any);
  } catch (err) {
    console.error('[broadcastUpdate] Local WS fallback failed:', err);
  }
}
