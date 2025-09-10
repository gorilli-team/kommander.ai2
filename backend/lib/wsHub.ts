import WebSocket, { WebSocketServer } from 'ws';

export type WSUpdatePayload = {
  type: 'update';
  conversationId: string;
  handledBy?: 'bot' | 'agent';
  messages?: Array<{ role: 'user' | 'assistant' | 'agent' | 'system'; text: string; timestamp: string }>;
};

type Subscriber = {
  ws: WebSocket;
  conversations: Set<string>;
  userId?: string;
};

class WsHub {
  private wss: WebSocketServer | null = null;
  private subscribersByConv = new Map<string, Set<WebSocket>>();
  private subscribers = new Set<Subscriber>();
  private started = false;
  private port = 9003;

  start(port?: number) {
    if (this.started) return;
    this.port = port || parseInt(process.env.WS_PORT || '9003', 10);
    this.wss = new WebSocketServer({ port: this.port, path: '/ws' });
    this.started = true;

    this.wss.on('connection', (ws: WebSocket) => {
      const sub: Subscriber = { ws, conversations: new Set() };
      this.subscribers.add(sub);

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg?.type === 'subscribe' && msg.conversationId) {
            const convId: string = msg.conversationId;
            sub.userId = msg.userId || sub.userId;
            sub.conversations.add(convId);
            if (!this.subscribersByConv.has(convId)) {
              this.subscribersByConv.set(convId, new Set());
            }
            this.subscribersByConv.get(convId)!.add(ws);
            ws.send(JSON.stringify({ type: 'subscribed', conversationId: convId }));
          }
        } catch (e) {
          // ignore malformed
        }
      });

      const cleanup = () => {
        // remove from all conversation sets
        for (const convId of sub.conversations) {
          const set = this.subscribersByConv.get(convId);
          if (set) {
            set.delete(ws);
            if (set.size === 0) this.subscribersByConv.delete(convId);
          }
        }
        this.subscribers.delete(sub);
      };

      ws.on('close', cleanup);
      ws.on('error', cleanup);
    });

    console.log(`[WsHub] WebSocket server started on port ${this.port} at path /ws`);
  }

  broadcast(conversationId: string, payload: WSUpdatePayload) {
    if (!this.started || !this.wss) return;
    const set = this.subscribersByConv.get(conversationId);
    if (!set || set.size === 0) return;
    const data = JSON.stringify({ ...payload, conversationId });
    for (const ws of set) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }
}

// Singleton su globalThis per evitare duplicazioni in dev/hot reload
export function getWsHub(): WsHub {
  const g = globalThis as any;
  if (!g.__kommanderWsHub) {
    g.__kommanderWsHub = new WsHub();
  }
  return g.__kommanderWsHub as WsHub;
}
