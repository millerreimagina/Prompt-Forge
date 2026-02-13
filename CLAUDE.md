# CLAUDE.md — PromptForge

## Project Overview

PromptForge is a **Next.js 15** web application that lets organizations create, manage, and use specialized AI content-generation profiles called **Optimizers**. Users interact with Optimizers through a chat interface; admins configure them via a dashboard. The backend uses **Firebase** (Auth, Firestore, Storage) and **Genkit** for AI orchestration with support for both OpenAI and Google AI providers.

## Tech Stack

- **Framework**: Next.js 15.3 (App Router) with React 18, TypeScript 5
- **AI**: Genkit (`genkit`, `@genkit-ai/google-genai`, `@genkit-ai/compat-oai`), OpenAI SDK (fallback)
- **Backend**: Firebase Auth, Firestore, Firebase Storage, Firebase Admin SDK
- **UI**: shadcn/ui (Radix primitives), Tailwind CSS 3, Lucide icons
- **Forms**: react-hook-form + zod validation
- **Hosting**: Firebase App Hosting (`apphosting.yaml`, max 1 instance)
- **Dev server**: `next dev --turbopack` on port 9002

## Directory Structure

```
src/
├── ai/                         # AI/Genkit configuration and flows
│   ├── genkit.ts               # Genkit instance (plugins: googleAI, openAI)
│   ├── dev.ts                  # Genkit dev server entry
│   └── flows/
│       ├── generate-optimized-content.ts   # Main generation flow (server-side)
│       └── test-optimizer-with-example-input.ts
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout (FirebaseProvider, TooltipProvider, Toaster)
│   ├── page.tsx                # Main chat UI (client component)
│   ├── globals.css             # Tailwind + CSS variables (theme colors)
│   ├── login/page.tsx          # Auth page (email/password + Google sign-in)
│   ├── settings/page.tsx       # Usage reports dashboard (admin-only)
│   ├── admin/
│   │   ├── layout.tsx          # Admin layout with Header
│   │   ├── page.tsx            # Optimizer management dashboard
│   │   ├── optimizers/[id]/page.tsx  # Optimizer editor
│   │   └── users/
│   │       ├── page.tsx        # User management
│   │       └── [id]/page.tsx   # User editor
│   └── api/                    # API routes (Route Handlers)
│       ├── generate-optimized-content/route.ts  # Main AI generation endpoint
│       ├── clear-chat/route.ts                  # Delete chat messages
│       ├── users/route.ts                       # CRUD users (POST/PUT/DELETE)
│       ├── usage-report/route.ts                # Aggregated usage stats (admin)
│       └── usage-ranking/route.ts
├── components/
│   ├── ui/                     # shadcn/ui primitives (DO NOT manually edit)
│   ├── admin/                  # Admin-specific forms (optimizer-form, user-form)
│   ├── header.tsx              # App header (Logo, MainNav, UserNav)
│   ├── main-nav.tsx            # Navigation links
│   ├── user-nav.tsx            # User avatar + dropdown
│   ├── logo.tsx                # App logo
│   └── FirebaseErrorListener.tsx
├── firebase/
│   ├── config.ts               # Client-side Firebase config (env vars)
│   ├── provider.tsx            # FirebaseProvider context + hooks (useAuth, useFirestore, useStorage)
│   ├── firebase-admin.ts       # Server-side Firebase Admin init (supports multiple credential strategies)
│   ├── index.ts                # Re-exports from provider
│   ├── errors.ts               # FirestorePermissionError class
│   └── error-emitter.ts        # Global error event emitter
├── hooks/
│   ├── use-toast.ts
│   └── use-mobile.tsx
└── lib/
    ├── types.ts                # Core types: Optimizer, AppUser
    ├── utils.ts                # cn() utility (clsx + tailwind-merge)
    ├── optimizers-service.ts         # Client-side Firestore operations for optimizers
    ├── optimizers-service.server.ts  # Server-side (firebase-admin) optimizer queries
    ├── users-service.ts              # Client-side user CRUD (calls /api/users)
    └── placeholder-images.ts
```

## Key Commands

```bash
npm run dev          # Start dev server (Turbopack, port 9002)
npm run build        # Production build (NODE_ENV=production next build)
npm run start        # Start production server
npm run lint         # ESLint via next lint
npm run typecheck    # TypeScript check (tsc --noEmit)
npm run genkit:dev   # Start Genkit dev UI
npm run genkit:watch # Start Genkit dev UI with watch mode
```

## Core Domain Concepts

### Optimizer
The central entity. Defined in `src/lib/types.ts`. Contains:
- **Identity**: `id`, `internalName`, `name`, `description`, `language`, `status` (Published/Draft), `category`, `organization` (Reimagina/Trend Riders/Personal)
- **Model config**: `provider` (openai/google), `model` name, `temperature`, `maxTokens`, `topP`
- **System prompt**: The main instruction prompt sent to the AI model
- **Knowledge base**: Array of `{ id, name, url }` entries (files stored in Firebase Storage)
- **Generation params**: `variants`, `preferredLength`, `creativityLevel`, `structureRules`, `historyMessages`
- **Guided inputs**: Configurable form fields for structured user input

### AppUser
User profiles stored in Firestore `appUsers` collection. Fields: `name`, `email`, `role` (member/admin), `company` (Reimagina/Trend Riders/Personal).

### Organizations
Three fixed organizations: `Reimagina`, `Trend Riders`, `Personal`. Used to scope optimizer visibility per user.

## Architecture Patterns

### Client/Server Split
- **Client services** (`optimizers-service.ts`, `users-service.ts`): Use Firebase client SDK (`firebase/firestore`) directly, or call API routes for admin operations
- **Server services** (`optimizers-service.server.ts`): Use `firebase-admin` SDK, guarded with `import 'server-only'`
- **API routes** (`src/app/api/`): Handle admin operations (user CRUD, usage reports) using Firebase Admin

### Firebase Auth & Authorization
- Auth via Firebase: email/password + Google sign-in
- Custom claims set on users: `role` (admin/member) and `company`
- Admin check: `getIdTokenResult(user, true)` then `claims.role === 'admin'`
- Members can only see optimizers from their own company; admins see all
- API routes verify Bearer tokens with `firebase-admin/auth.verifyIdToken()`

### AI Generation Pipeline
1. Client sends `{ optimizer, userInput, history, attachment }` to `/api/generate-optimized-content`
2. Route builds system prompt from optimizer config + knowledge base
3. Attempts generation via Genkit (`ai.generate()`) with the configured model
4. Falls back to direct OpenAI SDK if Genkit returns no text and provider is OpenAI
5. Records usage metrics in Firestore (`usageLogs` collection + per-user `metrics/usage`)
6. Chat messages persisted client-side to Firestore: `users/{uid}/optimizerChats/{optimizerId}/messages`

### Firebase Admin Initialization
`src/firebase/firebase-admin.ts` tries credentials in order:
1. `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` (base64-encoded JSON)
2. `FIREBASE_SERVICE_ACCOUNT_KEY` (plain JSON)
3. Discrete env vars: `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
4. Application Default Credentials fallback

## Environment Variables

### Required (Client-side, prefixed `NEXT_PUBLIC_`)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Required (Server-side)
- `OPENAI_API_KEY` — for OpenAI model provider
- One of the Firebase Admin credential strategies (see above)

### Optional
- `DEBUG_OPT=1` — enables verbose logging in the generation API route
- `GOOGLE_GENAI_API_KEY` — for Google AI models via Genkit

## Firestore Collections

| Collection | Description |
|---|---|
| `optimizers` | Optimizer configurations |
| `appUsers` | User profiles (synced with Firebase Auth) |
| `users/{uid}/optimizerChats/{optimizerId}/messages` | Chat history per user per optimizer |
| `users/{uid}/metrics/usage` | Aggregated per-user token usage |
| `usageLogs` | Granular usage log entries (uid, optimizerId, tokens, requests, timestamp) |

## Conventions

### Code Style
- TypeScript strict mode enabled
- Path alias `@/*` maps to `./src/*`
- Client components marked with `"use client"` directive
- Server-only modules use `import 'server-only'`
- UI text is mostly in **Spanish** (user-facing labels, toasts, placeholders)

### Component Patterns
- shadcn/ui components live in `src/components/ui/` — these are auto-generated; do not manually edit
- Custom components use the `cn()` utility from `src/lib/utils.ts` for conditional class merging
- Firebase context accessed via hooks: `useAuth()`, `useFirestore()`, `useStorage()` from `@/firebase`
- Forms use react-hook-form with zod schemas for validation

### Styling
- Tailwind CSS with CSS variable-based theming (defined in `globals.css`)
- Dark mode via `class` strategy (`darkMode: ['class']`)
- Primary: vibrant blue (#29ABE2), Accent: vivid orange (#FF9933), Background: light gray (#F0F2F5)
- Font: Inter (body + headlines)
- Icon library: Lucide React

### Build Notes
- `next.config.ts` sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`
- Remote image patterns allowed: `placehold.co`, `images.unsplash.com`, `picsum.photos`
- Turbopack enabled for dev server

## Common Workflows

### Adding a new API route
1. Create `src/app/api/<name>/route.ts`
2. Use `getFirebaseAdminApp()` from `@/firebase/firebase-admin` for server-side Firebase access
3. Verify auth tokens with `getAuth(app).verifyIdToken()` when needed
4. Return `NextResponse.json()`

### Adding a new page
1. Create `src/app/<path>/page.tsx`
2. Add `"use client"` if the page needs interactivity
3. Use `useAuth()` / `useFirestore()` hooks for Firebase access
4. Add auth-guard pattern: check `onAuthStateChanged` + redirect to `/login` if unauthenticated

### Adding a shadcn/ui component
Use the shadcn CLI — components will be placed in `src/components/ui/`

### Modifying an Optimizer type
Update `src/lib/types.ts` — the `Optimizer` type is used across client services, server services, API routes, and the admin form
