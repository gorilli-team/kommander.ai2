# Configurazione OAuth Providers

Segui queste istruzioni per configurare i provider OAuth:

## 🟡 Google OAuth

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o seleziona quello esistente
3. Abilita l'API "Google+ API" (potrebbe essere necessario)
4. Vai su "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configura schermata consenso OAuth (se richiesto)
6. Tipo applicazione: "Web application"
7. Authorized redirect URIs: 
   - `http://localhost:9002/api/auth/callback/google` (dev)
   - `https://tuodominio.com/api/auth/callback/google` (prod)
8. Copia Client ID e Client Secret nel `.env.local`

## 🟣 GitHub OAuth

1. Vai su [GitHub Developer Settings](https://github.com/settings/developers)
2. "New OAuth App"
3. Compila:
   - Application name: `Kommander.ai`
   - Homepage URL: `http://localhost:9002` (dev) o il tuo dominio
   - Authorization callback URL: `http://localhost:9002/api/auth/callback/github`
4. Copia Client ID e genera Client Secret
5. Aggiungi al `.env.local`

## 🔵 Microsoft OAuth (Azure AD)

1. Vai su [Azure Portal](https://portal.azure.com)
2. "Azure Active Directory" → "App registrations" → "New registration"
3. Compila:
   - Name: `Kommander.ai`
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: `http://localhost:9002/api/auth/callback/microsoft-entra-id`
4. Dopo la creazione:
   - Copia "Application (client) ID"
   - Vai su "Certificates & secrets" → "New client secret"
   - Copia il valore del secret (non l'ID!)
5. Aggiungi al `.env.local`

## ⚙️ Esempio .env.local

```bash
# Google OAuth
GOOGLE_CLIENT_ID=1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz

# GitHub OAuth  
GITHUB_ID=Iv1.abcdefghijklmnop
GITHUB_SECRET=abcdefghijklmnopqrstuvwxyz1234567890abcdef

# Microsoft OAuth
MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
MICROSOFT_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz~1234567890
MICROSOFT_TENANT_ID=common

# NextAuth
AUTH_SECRET=your-super-secret-32-character-string
NEXTAUTH_URL=http://localhost:9002
```

## 🚀 Test

1. Aggiorna il `.env.local` con le credenziali reali
2. Riavvia il server: `npm run dev`
3. Vai su `http://localhost:9002/login`
4. Testa ciascun provider OAuth

## 📝 Note

- `MICROSOFT_TENANT_ID=common` permette account personali e aziendali
- Per produzione, aggiorna gli URL di callback
- Mantieni sempre secret sicuri e non commitarli
