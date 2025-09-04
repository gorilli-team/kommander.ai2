# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Stack: Next.js 15 (App Router) + React 18 + TypeScript, MongoDB (native driver + GridFS), NextAuth, Stripe, OpenAI, Tailwind, Radix UI.
- Dev server runs on http://localhost:9002 by default.

Common development commands
- Install deps: npm install
- Start dev: npm run dev  # Next dev on port 9002
  - Optional: npm run dev-turbo  # Next.js turbopack dev
- Build: npm run build
- Start (prod): npm start
- Lint: npm run lint
- Typecheck: npm run typecheck
- Seed database: npm run seed
  - Note: backend/scripts/seed.ts deletes all documents in the faqs collection before inserting examples.
- WhatsApp bot: npm run whatsapp-bot
  - Prints a QR code in the terminal for pairing. Auth state stored under whatsapp-auth-<userId> (cwd in dev, /tmp in prod/serverless).
- Tests: There is no general unit test runner configured. Available harness:
  - Team management checks: npm run test:team

Environment configuration
Create .env.local with at least:
- MONGODB_URI=...
- OPENAI_API_KEY=...
- AUTH_SECRET=...  # 32+ chars recommended
- NEXTAUTH_URL=http://localhost:9002
Optional/feature-specific (as used in code):
- RESEND_API_KEY=..., EMAIL_FROM=...

High-level architecture and data flow
- Next.js App Router (app/)
  - Pages/sections: admin dashboard (app/admin-dashboard-secret-k2m4x9), analytics, billing, chatbot, conversations, login, settings, training, welcome, etc.
  - API routes (app/api/*) grouped by domain:
    - auth/[...nextauth] (NextAuth handlers)
    - analytics/* (summary, real-time, export)
    - conversations/* (CRUD and updates)
    - invitations/* and organizations/* (team/org flows)
    - kommander-query and kommander-query-stream (primary chatbot entrypoints)
    - process-file, speech/transcribe, training/*, widget-conversations/*
    - whatsapp/{start|status|stop}
- Backend libraries (backend/lib/)
  - mongodb.ts: Pooled connection, ping-on-reuse, GridFS bucket (file_uploads), and typed collections. Database name derived from MONGODB_URI; warns/defaults if missing.
  - openai.ts: Thin wrapper to instantiate OpenAI client (requires OPENAI_API_KEY).
  - buildPromptServer.ts: Composes system/user messages from FAQs, file context (summaries/snippets or smartFileContext), and conversation history.
  - conversationService.ts: Mongo-backed conversation store with summaries, tags, ratings, analytics aggregation.
  - whatsappClient.ts: Baileys-based client that integrates with existing server actions (app/chatbot/actions and app/conversations/actions) to reply on WhatsApp and persist messages.
  - Additional domain modules: businessAdvisor.ts, semanticFaqSearch.ts, smartFileManager.ts, sentimentAnalysis.ts, security.ts, analytics.ts, costTracking.ts, etc.
- Frontend (frontend/)
  - Components organized by feature (admin, chatbot, conversations, training, welcome) and a shared UI kit in frontend/components/ui.
  - NextAuth integration defined in frontend/auth.ts and wired to app/api/auth/[...nextauth]/route.ts.
- TypeScript config (tsconfig.json)
  - Strict TypeScript, noEmit, bundler moduleResolution.
  - Path aliases: '@/frontend/*', '@/backend/*', '@/app/*', '@/components/*', '@/ui/*', '@/hooks/*', '@/lib/*', '@/auth', '@/auth.config'.
- Next.js config (next.config.ts)
  - ignoreBuildErrors and ignoreDuringBuilds set to true (TypeScript/ESLint not blocking builds).
  - Remote image allowlist (placehold.co, avatars.githubusercontent.com, lh3.googleusercontent.com).
  - styledComponents compiler option enabled; serverActions bodySizeLimit set to 10mb.

Operational notes
- Seed script behavior: backend/scripts/seed.ts will delete all existing FAQs before inserting examples and will attempt to associate content with a specific email if found. Review the script before running in any shared environment.
- WhatsApp bot: Runs out-of-process via tsx and relies on Next.js server actions for generating responses and logging. Ensure the web app is reachable and environment is set before starting the bot.
- Auth and URLs: AUTH_SECRET must be present; NEXTAUTH_URL should match the dev URL (http://localhost:9002) during local development.

References from README.md
- Dev: npm run dev (served on port 9002)
- Available scripts: dev, build, start, lint, typecheck, seed, whatsapp-bot, test:team
- Key features and modules described in README are implemented across app/ (pages + API routes), backend/lib/ (services), and frontend/components/ (UI), matching the aliases set in tsconfig.json.

