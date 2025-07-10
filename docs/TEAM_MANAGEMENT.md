# 👥 Team Management System

Sistema completo di gestione team e organizzazioni per Kommander.ai con funzionalità enterprise-grade.

## 📋 Funzionalità

### ✅ Gestione Organizzazioni
- **Multi-tenancy**: Supporto per multiple organizzazioni per utente
- **Creazione organizzazioni**: Nome, slug, descrizione personalizzabile
- **Impostazioni avanzate**: Controllo accessi, limiti membri, domini autorizzati
- **Piani**: Free, Pro, Enterprise

### ✅ Gestione Membri
- **Ruoli gerarchici**: Admin, Manager, User, Viewer, Guest
- **Permessi granulari**: 13+ permessi specifici per funzionalità
- **Gestione stato**: Attivo, Inattivo, Sospeso
- **Tracking attività**: Last active, join date, statistiche

### ✅ Sistema Inviti
- **Inviti via email**: Template HTML professionale
- **Token sicuri**: Scadenza configurabile (1-30 giorni)
- **Messaggi personalizzati**: Note personali negli inviti
- **Link condivisibili**: Copy-paste per condivisione rapida
- **Stati avanzati**: Pending, Accepted, Rejected, Expired, Cancelled

### ✅ Sicurezza & Compliance
- **Rate Limiting**: Protezione anti-abuse
- **Audit Logging**: Tracciamento completo delle azioni
- **Input Sanitization**: Protezione XSS e injection
- **Row Level Security**: Isolamento dati per organizzazione

## 🚀 Come Utilizzare

### 1. Accesso alla Funzionalità
- Naviga su `/team` dal menu laterale
- Icona: 👥 "Team Management"

### 2. Gestione Organizzazioni
```typescript
// Creazione organizzazione
const orgData = {
  name: "Acme Corporation",
  slug: "acme-corp",
  description: "Leading AI solutions provider",
  settings: {
    allowPublicJoin: false,
    requireApproval: true,
    defaultRole: "user",
    maxMembers: 50
  }
}
```

### 3. Invito Membri
```typescript
// Invio invito
const inviteData = {
  email: "colleague@company.com",
  role: "manager", // admin, manager, user, viewer, guest
  message: "Welcome to our AI team!"
}
```

### 4. Gestione Ruoli
- **Admin**: Controllo completo organizzazione
- **Manager**: Gestione team, analytics, impostazioni
- **User**: Uso chatbot, conversazioni
- **Viewer**: Solo lettura
- **Guest**: Accesso limitato

## 🔧 Configurazione

### Variabili Environment
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/kommander

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=noreply@yourdomain.com

# App URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://yourdomain.com
```

### Setup Resend per Email
1. Registrati su [resend.com](https://resend.com)
2. Crea un nuovo progetto
3. Genera API Key
4. Configura dominio verificato
5. Aggiungi RESEND_API_KEY al .env

## 🧪 Testing

### Script di Test Automatico
```bash
# Esegui test completo del sistema
npm run test:team

# Output esempio:
🧪 Starting Team Management Tests
✅ Database connection successful!
✅ Organization created with ID: 672a5f...
✅ Invitation created with token: a5b8c2d1...
🎉 All critical tests passed! Team Management is ready to use.
```

### Test Manuale
1. **Login**: Autenticati con Google OAuth
2. **Team Page**: Visita `/team`
3. **Crea Organizzazione**: "New Organization"
4. **Invita Membro**: "Invite Member" con email valida
5. **Testa Invito**: Apri link ricevuto via email
6. **Gestione Ruoli**: Modifica ruoli membri esistenti

## 📊 API Endpoints

### Organizations
```typescript
GET    /api/organizations          // Lista organizzazioni utente
POST   /api/organizations          // Crea nuova organizzazione
GET    /api/organizations/[id]/members     // Lista membri
PATCH  /api/organizations/[id]/members     // Aggiorna ruolo membro
DELETE /api/organizations/[id]/members     // Rimuovi membro
GET    /api/organizations/[id]/invitations // Lista inviti
```

### Invitations
```typescript
POST   /api/invitations            // Crea nuovo invito
PATCH  /api/invitations            // Accetta invito
GET    /api/invitations/[token]    // Dettagli invito
```

## 🎨 UI Components

### Pagine Principali
- **`/team`**: Dashboard gestione team
- **`/invite`**: Accettazione inviti

### Componenti Chiave
- **OrganizationSelector**: Switch tra organizzazioni
- **MembersTable**: Lista membri con azioni
- **InviteModal**: Form invito membri
- **InvitationsTable**: Gestione inviti pending

## 🔐 Permessi Sistema

### Admin Permissions
- `read_organization`, `write_organization`
- `manage_members`, `invite_users`, `remove_users`
- `manage_billing`, `access_analytics`
- `manage_chatbots`, `manage_settings`
- `admin_access`

### Manager Permissions
- `read_organization`, `manage_members`
- `invite_users`, `access_analytics`
- `manage_chatbots`, `manage_settings`

### User Permissions
- `read_organization`, `manage_chatbots`
- `read_conversations`, `write_conversations`

### Viewer Permissions
- `read_organization`, `read_conversations`

### Guest Permissions
- `read_organization`

## 🛠️ Architettura Tecnica

### Backend Services
- **OrganizationService**: Core business logic
- **SecurityService**: Rate limiting, audit logging
- **EmailService**: Gestione inviti via Resend

### Database Schema
```typescript
// Collections MongoDB
organizations: {
  name, slug, description, ownerId,
  settings, plan, isActive, createdAt
}

organization_members: {
  organizationId, userId, role, permissions,
  status, joinedAt, lastActiveAt
}

invitations: {
  organizationId, email, role, token,
  status, expiresAt, invitedBy, message
}
```

### Frontend Architecture
- **Next.js App Router**: Server/Client components
- **NextAuth**: Autenticazione Google OAuth
- **Tailwind CSS**: Styling moderno
- **Radix UI**: Componenti accessibili
- **React Hook Form**: Form management
- **Zod**: Validazione dati

## 🚨 Troubleshooting

### Errore: "Cannot create organization"
- Verifica connessione MongoDB
- Controlla permessi utente
- Slug deve essere univoco

### Errore: "Email not sent"
- Verifica RESEND_API_KEY
- Controlla dominio email
- Vedi logs del server

### Errore: "Invalid invitation"
- Token potrebbe essere scaduto
- Verifica URL completo
- Utente deve essere autenticato

### Errore: "Database connection failed"
- Controlla MONGODB_URI
- Verifica rete/firewall
- MongoDB deve essere in running

## 📈 Metriche e Monitoring

### Audit Logs
```typescript
// Esempio log entry
{
  userId: "user123",
  action: "create",
  resource: "organization",
  success: true,
  timestamp: "2024-01-15T10:30:00Z",
  metadata: { organizationId: "org456" }
}
```

### Rate Limiting
- **API Organizations**: 100 requests/minute
- **Invitations**: 20 requests/minute
- **Accept Invites**: 50 requests/minute

## 🔄 Future Enhancements

### In Roadmap
- [ ] **SAML/SSO**: Enterprise authentication
- [ ] **Custom Roles**: Ruoli definiti dall'utente
- [ ] **Bulk Invites**: Import CSV
- [ ] **Slack Integration**: Notifiche team
- [ ] **Mobile App**: Team management mobile
- [ ] **Advanced Analytics**: Team performance metrics

## 📞 Supporto

Per supporto tecnico o domande:
- GitHub Issues
- Documentazione API
- Test script: `npm run test:team`

---

**Team Management System v1.0** - Powered by Kommander.ai 🚀
