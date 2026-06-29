# Content Repurposer - Architecture & Implementation Plan

## Context

A web app that takes text content (podcast transcripts, articles, blog posts, etc.) and uses AI to repurpose it into multiple social media formats: blog articles, LinkedIn posts, X threads, video scripts, newsletters, quote graphics, carousels, and FAQs. Text-only for now. The architecture uses abstraction layers for all third-party services so providers can be swapped easily.

## Key Decision: No Separate Express Backend

Next.js API routes handle everything needed — AI API calls, DB queries, auth, SSE streaming. Adding Express doubles deployment complexity with no benefit. The abstraction layers live as TypeScript modules inside the Next.js project. If a separate backend becomes necessary later, the abstractions make extraction trivial.

## Folder Structure

```
content-repurposer/
├── frontend/                          # Next.js App Router
│   ├── src/
│   │   ├── app/                       # Pages + API routes
│   │   │   ├── page.tsx               # Landing page
│   │   │   ├── dashboard/page.tsx     # Main repurposing UI
│   │   │   ├── history/page.tsx       # Past generations
│   │   │   ├── auth/signin/page.tsx   # Sign in / Sign up
│   │   │   └── api/
│   │   │       ├── repurpose/route.ts # Streaming SSE endpoint
│   │   │       ├── sources/route.ts   # CRUD content sources
│   │   │       ├── outputs/route.ts   # CRUD generated outputs + regenerate
│   │   │       ├── stats/route.ts     # User stats (most used formats, totals)
│   │   │       ├── user/preferences/route.ts  # Theme, defaults persistence
│   │   │       └── auth/[...nextauth]/route.ts
│   │   ├── components/
│   │   │   ├── session-provider.tsx    # NextAuth session wrapper
│   │   │   ├── theme-provider.tsx     # Dark/light mode context
│   │   │   └── toast.tsx              # Toast notification system
│   │   ├── lib/                       # ABSTRACTION LAYERS
│   │   │   ├── ai/                    # AIProvider interface + Groq/Claude providers
│   │   │   ├── db/                    # DBProvider interface + NeonProvider
│   │   │   ├── media/                 # MediaProvider interface (future)
│   │   │   ├── payments/             # PaymentProvider interface (future)
│   │   │   ├── prompts/              # Format-specific system prompts + builder
│   │   │   ├── config.ts             # Environment config
│   │   │   └── rate-limit.ts         # In-memory rate limiter
│   │   └── types/index.ts            # Shared TypeScript types
│   ├── package.json, tsconfig.json, next.config.ts, .env.local
├── database/
│   ├── migrations/                    # Sequential SQL files (run manually on Neon)
│   │   ├── 001_create_users.sql
│   │   ├── 002_create_content_sources.sql
│   │   ├── 003_create_generated_outputs.sql
│   │   └── 004_create_prompt_templates.sql
│   └── seed.sql                       # Default prompt templates (run in all environments)
├── docs/                              # Documentation
└── README.md
```

## AI Integration

### Provider Abstraction

The app supports multiple AI providers via a swappable abstraction layer. Currently implemented:

- **Groq** (default) — uses `groq-sdk`, model `llama-3.3-70b-versatile`, with automatic token limit handling for the free tier (12,000 TPM)
- **Anthropic/Claude** — uses `@anthropic-ai/sdk`, model `claude-sonnet-4-6`, with prompt caching support

To switch providers, change two environment variables:
```
AI_PROVIDER=groq        # or "anthropic"
AI_API_KEY=your-key
DEFAULT_AI_MODEL=llama-3.3-70b-versatile  # or "claude-sonnet-4-6"
```

### Abstraction Layer Pattern

Each service follows: **Interface** → **Provider Implementation(s)** → **Factory Function**

```typescript
// ai-provider.ts — Interface
export interface AIProvider {
  generate(options: GenerateOptions): Promise<GenerateResult>;
  generateStream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}

// groq-provider.ts / claude-provider.ts — Implementations
export class GroqAIProvider implements AIProvider { ... }
export class ClaudeAIProvider implements AIProvider { ... }

// index.ts — Factory (reads AI_PROVIDER env var)
export function getAIProvider(): AIProvider { ... }
```

Same pattern for DB (`DBProvider` → `NeonDBProvider`), media, and payments.

### Streaming

All AI generation uses Server-Sent Events (SSE) for real-time output display. The `/api/repurpose` endpoint streams text chunks per format back to the browser, with a 2-second delay between formats to avoid rate limiting on free tiers.

### Groq Free Tier Handling

The Groq provider includes automatic token management:
- Caps `max_tokens` at 6,000 (output)
- Estimates input tokens and truncates content if the total would exceed 12,000 TPM
- Adds 2-second delays between format generations

## Database Schema (Neon PostgreSQL)

4 tables:
- **users** — id, email, name, password_hash, plan (free/basic/pro/agency), monthly_requests_used, monthly_requests_reset_at, theme (dark/light), default_formats (json array), custom_instructions (text), onboarding_completed (bool)
- **content_sources** — id, user_id, title, source_type, content, word_count, tone, custom_instructions, metadata
- **generated_outputs** — id, content_source_id, user_id, format, content, edited_content, model_used, tokens_input/output, is_favorite, rating (thumbs up/down/null)
- **prompt_templates** — id, format, name, system_prompt, user_prompt_template, is_default

Migrations are in `database/migrations/` and must be run manually on Neon. The `seed.sql` file inserts default prompt templates and should be run in all environments.

## UX Flow

### Landing Page
- Creative, eye-catching landing page with 3D-like animations/effects (Framer Motion + CSS 3D transforms)
- Clear CTA prompting users to sign in / create account
- "How it works" section with 3-step visual explanation

### Auth Flow
- Sign in / Sign up with email + password (NextAuth.js credentials provider + bcrypt)
- After login → redirect to dashboard

### Dashboard (Main App)
- Large text input area where users paste their content
- Tone selector: professional, casual, humorous, authoritative
- Custom instructions field for user-defined rules
- Format selector: cards for each of the 8 social media platforms
- "Repurpose" button (also Ctrl+Enter) → AI generates content via streaming SSE
- Results displayed in separate cards per platform, each with:
  - One-click copy button
  - Inline edit mode
  - Regenerate (redo) single format
  - Thumbs up/down rating
  - Character/word count with platform limit warnings
- Export all outputs as Markdown
- Dark/light mode toggle in header

### History
- All generated content saved automatically (persisted in DB)
- Users can browse past generations, view outputs, delete specific entries
- "Most used platform" stat based on which formats they request most often
- Copy from history

## Implementation Phases

### Phase 1: Foundation (Complete)
- Next.js (App Router, TypeScript, Tailwind) in `frontend/`
- DB migrations for Neon
- AI abstraction layer with Groq + Claude providers
- DB abstraction layer with Neon provider
- Auth with NextAuth.js — email/password login

### Phase 2: Landing Page (Complete)
- Landing page with 3D floating card animations (Framer Motion)
- Sign in / Sign up page
- Gradient hero, how-it-works section, CTA

### Phase 3: Core Flow (Complete)
- Dashboard with text input, tone selector, custom instructions, format picker
- `/api/repurpose` SSE streaming endpoint (auth-gated, rate-limited)
- Results in separate cards with copy buttons
- Format-specific system prompts for all 8 output types
- Auto-save all generations to DB

### Phase 4: History & Stats (Complete)
- History page with expandable past sources/outputs
- "Most used platform" stat
- Delete, copy from history

### Phase 5: Customization & Polish (Complete)
- Dark/light mode toggle (persisted to localStorage + DB)
- Tone/style selector per generation
- Custom instructions field
- Character/word count per output with platform limit enforcement
- Export all outputs as Markdown download
- Regenerate single output without redoing all formats
- Inline editing of outputs before copying
- Thumbs up/down on each output
- Loading skeleton animations during generation
- Toast notifications (copy, errors, limits)
- Responsive/mobile-friendly layout
- Keyboard shortcuts (Ctrl+Enter to generate)
- Rate limiting on API routes (10 req/min per user)

### Phase 6: Payments (Planned — infrastructure ready)
- 3 free requests/month for all users, then paid plans required
- **Basic Plan** — TBD limits/pricing
- **Pro Plan** — TBD limits/pricing
- **Agency Plan** — TBD limits/pricing
- Payment provider abstraction layer (interface + Stripe implementation)
- Usage tracking: count requests per month, enforce limits, show remaining
- Upgrade prompts when free tier exhausted

### Phase 7: Future
- Media provider (ImageKit for quote graphics)
- Parallel generation (all formats concurrently)
- Batch API for bulk processing
- First-time user onboarding tooltip walkthrough

## Verification

- Run `npm run dev` in `frontend/`, paste sample text, select formats, confirm streaming output renders
- Verify DB records created in Neon after generation
- Test swapping AI provider by changing `AI_PROVIDER` env var — confirm the app still works
- Test error handling: if AI call fails mid-stream for one format, others should still complete
- Test rate limiting: rapid requests should get 429 responses after 10/min
