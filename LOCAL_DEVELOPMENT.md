# Setup Ambiente Locale di Sviluppo

## 🚀 Configurazione per sviluppo locale

### Variabili d'ambiente necessarie

Per far funzionare l'applicazione in locale su `http://localhost:9002`, assicurati che i tuoi file `.env` e `.env.local` abbiano queste configurazioni:

#### `.env` principale:
```env
NEXTAUTH_URL=http://localhost:9002
NEXT_PUBLIC_BASE_URL=http://localhost:9002
NEXT_PUBLIC_APP_URL=http://localhost:9002
BYPASS_AUTH=false
NEXT_PUBLIC_BYPASS_AUTH=false
```

#### `.env.local`:
```env
FRONTEND_URL=http://localhost:9002
NEXTAUTH_URL=http://localhost:9002
BYPASS_AUTH=false
```

### 🔧 Comandi per sviluppo

1. **Installa dipendenze:**
   ```bash
   npm install
   ```

2. **Avvia server di sviluppo:**
   ```bash
   npm run dev
   ```
   Il server sarà disponibile su: `http://localhost:9002`

3. **Crea nuovo branch per feature:**
   ```bash
   git checkout -b feature/nome-feature
   ```

### ✅ Funzionalità verificate in locale

- ✅ Autenticazione reale (no bypass)
- ✅ Database MongoDB connesso
- ✅ Chatbot widget funzionante
- ✅ Tutte le pagine accessibili
- ✅ API endpoints funzionanti

### 🧪 Test delle modifiche

1. Fai le modifiche nel branch di sviluppo
2. Verifica in locale su `http://localhost:9002`
3. Quando sei soddisfatto, fai commit e push
4. Crea PR verso main se necessario

### 📝 Note

- I file `.env` e `.env.local` sono ignorati da git (corretto per sicurezza)
- Le chiavi API e credenziali sono condivise con l'ambiente di produzione
- Il chatbot carica correttamente da `http://localhost:9002/chatbot.js`
