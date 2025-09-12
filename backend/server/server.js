const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || process.env.WS_PORT || 3000;
const TOKEN = process.env.WS_RELAY_TOKEN || process.env.WS_BROADCAST_TOKEN || '';

const subscribersByConv = new Map(); // conversationId -> Set<ws>

function broadcast(conversationId, payload) {
  const set = subscribersByConv.get(conversationId);
  if (!set) return 0;
  const data = JSON.stringify({ type: 'update', conversationId, ...payload });
  let count = 0;
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) {
      try { ws.send(data); count++; } catch {}
    }
  }
  return count;
}

const server = http.createServer((req, res) => {
  // Simple router
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'POST' && req.url === '/broadcast') {
    // Auth
    const auth = req.headers['authorization'] || '';
    const token = (auth.split(' ')[1] || '').trim();
    if (!TOKEN || token !== TOKEN) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
      return;
    }
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};
        const { conversationId, handledBy, messages } = json || {};
        if (!conversationId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'conversationId required' }));
          return;
        }
        const sent = broadcast(conversationId, { handledBy, messages });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, sent }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'bad json' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'not found' }));
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  // Heartbeat
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg && msg.type === 'subscribe' && msg.conversationId) {
        const convId = String(msg.conversationId);
        if (!subscribersByConv.has(convId)) subscribersByConv.set(convId, new Set());
        subscribersByConv.get(convId).add(ws);
        try { ws.send(JSON.stringify({ type: 'subscribed', conversationId: convId })); } catch {}
      }
    } catch {}
  });

  const cleanup = () => {
    for (const [convId, set] of subscribersByConv.entries()) {
      if (set.has(ws)) {
        set.delete(ws);
        if (set.size === 0) subscribersByConv.delete(convId);
      }
    }
  };

  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

// Heartbeat interval
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  });
}, 25000);

wss.on('close', function close() {
  clearInterval(interval);
});

server.listen(PORT, () => {
  console.log(`[WS Relay] Listening on port ${PORT}`);
});
