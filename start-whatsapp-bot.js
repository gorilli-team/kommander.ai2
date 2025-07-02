#!/usr/bin/env node

console.log('🚀 Avvio Bot WhatsApp per Kommander...\n');

// Importa e avvia il bot
require('tsx/cli').main(['backend/lib/whatsappClient.ts']);
