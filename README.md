# EmailAI Prototype

EmailAI Prototype is a Next.js app for turning a CSV or Excel lead list into a personalized outbound email campaign. It lets you upload a spreadsheet, detect or confirm the email column, generate per-recipient drafts from a global template, optionally rewrite drafts with a configurable LLM provider, and send selected emails through the authenticated user's Gmail account.

The current implementation is intentionally lightweight: authentication is handled with Google OAuth, campaign state lives entirely in memory, there is no database, and refreshing the page preserves auth but clears the current campaign workspace.

## What the project does

- Imports `.csv`, `.xlsx`, and other spreadsheet formats supported by `xlsx`
- Detects likely email columns and lets the user confirm the correct one
- Flags missing, invalid, or duplicate email rows before campaign creation
- Creates one recipient draft per valid row using `{{field_name}}` placeholders
- Lets users edit subjects and bodies per recipient
- Supports AI rewrite/regeneration for individual drafts
- Lets each user configure browser-local API keys for OpenAI, DeepSeek, Anthropic, and Google
- Protects the main workspace behind Google sign-in
- Bulk-sends checked recipients through the signed-in user's Gmail account

## Product flow

1. Upload a spreadsheet containing lead or clinic data.
2. Review the import preview and confirm the email column.
3. Define a campaign name, global subject, and global body template.
4. Generate recipient drafts using imported row fields.
5. Review, edit, or regenerate drafts one by one.
6. Select recipients and send the final emails.

## Personalization format

Global subjects and bodies support handlebars-style placeholders based on normalized column names:

```txt
Subject: Helping {{clinic_name}} streamline patient communication

Body:
Hi {{clinic_name}},

I noticed your clinic is located at {{address}}...
```

Imported headers are normalized to lowercase snake_case-style keys, so a column like `Clinic Name` becomes `clinic_name`.

## Tech stack

- Next.js 14 App Router
- React 18
- TypeScript
- Zustand for client-side state
- Tailwind CSS + Radix UI primitives
- `xlsx` for spreadsheet parsing
- Multi-provider AI rewrite routing for OpenAI, DeepSeek, Anthropic, and Google
- Google OAuth + NextAuth for authentication
- Gmail API for email delivery

## Local development

### Requirements

- Node.js 18+
- Bun 1.3+
- A Google Cloud OAuth client with Gmail API enabled
- One or more provider API keys entered through the in-app AI Settings dialog if you want AI regeneration enabled

### Environment variables

Create a `.env.local` file with:

```bash
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXTAUTH_URL=http://localhost:3001
```

Notes:

- `AUTH_SECRET` is used to sign the session cookie.
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` come from a Google OAuth web application.
- `NEXTAUTH_URL` should match the app origin in each environment.
- The Google OAuth app must include `http://localhost:3001/api/auth/callback/google` as an authorized redirect URI for local development.
- LLM API keys are entered in the app UI and stored in browser localStorage for that browser only.

### Run the app

```bash
bun install
bun run dev
```

Then open `http://localhost:3001`. Unauthenticated users are redirected to `/login`.

Notes:

- The dev script runs Next.js through Bun's runtime using `bun --bun`, which is Bun's recommended setup for Next.js development.
- Fast Refresh should update the browser automatically when you save supported app files. If you change environment variables or dependency versions, restart the dev server.

## API surface

### `POST /api/ai/regenerate`

Regenerates a single recipient draft using the active provider and model selected in AI Settings. Supported providers are OpenAI, DeepSeek, Anthropic, and Google.

### `POST /api/send/bulk`

Sends up to 100 recipients per request through the authenticated user's Gmail account. The current implementation processes sends in batches of 5 concurrent requests.

### `POST /api/send/test`

Sends a single test email through the authenticated user's Gmail account.

## Current prototype constraints

- No persistence: all campaign and recipient state is session-only
- AI provider keys are browser-local only; they are not stored on the backend
- No role model or team workflows beyond per-user Google sign-in
- No delivery analytics, open tracking, or reply tracking
- Only the first worksheet in an uploaded workbook is processed
- AI rewrite is per-recipient, not batch generation
- Bulk send requests are capped at 100 recipients

## Project structure

```txt
app/
  (pages)/                    # Route-grouped app pages without affecting URLs
    login/page.tsx            # Public login page
    page.tsx                  # Protected main workspace
  api/ai/regenerate/route.ts   # OpenAI rewrite endpoint
  api/auth/[...nextauth]/route.ts # Google OAuth handlers
  api/_lib/api-auth.ts        # Shared API auth helpers
  api/send/bulk/route.ts       # Gmail bulk send endpoint
  components/
    auth/                      # Login and logout actions
    campaign/                  # Campaign-level UI
    data-import/               # Upload and preview UI
    recipient/                 # Per-recipient draft cards
    settings/                  # AI provider settings UI
  core/
    auth/                      # Auth config, session guards, token helpers
    ai/                        # Provider defaults and LLM dispatch logic
    campaign/                  # Template merge and draft creation
    email/                     # Email rendering helpers
    excel/                     # Spreadsheet parsing and validation
    integrations/              # Third-party API clients
    utils/                     # Shared utilities
  hooks/                       # Client-side workflow hooks
  store/                       # Zustand campaign store
  types/                       # Shared API and campaign types
  zodSchemas/                  # Runtime request/response schemas
app/
  tests/
    api/                       # Route and API handler tests
    components/                # UI workflow tests
    core/                      # Pure utility tests
    e2e/                       # Browser-level auth and route protection tests
    fixtures/                  # Shared test data
    setup/                     # Vitest setup and globals
    store/                     # Zustand store tests
    utils/                     # Shared test helper coverage
```

## Good fit for this project

This codebase is a useful starting point for:

- AI-assisted outbound sales workflows
- Small internal campaign tools where each user sends from their own Google account
- Spreadsheet-to-email operational tooling
- Prototyping personalized email generation before adding persistence, encrypted key storage, and analytics
