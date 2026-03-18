# EmailAI Prototype

EmailAI Prototype is a Next.js app for turning a CSV or Excel lead list into a personalized outbound email campaign. It lets you upload a spreadsheet, detect or confirm the email column, generate per-recipient drafts from a global template, optionally rewrite drafts with OpenAI, and send selected emails through Resend.

The current implementation is intentionally lightweight: campaign state lives entirely in memory, there is no database, and refreshing the page clears the session.

## What the project does

- Imports `.csv`, `.xlsx`, and other spreadsheet formats supported by `xlsx`
- Detects likely email columns and lets the user confirm the correct one
- Flags missing, invalid, or duplicate email rows before campaign creation
- Creates one recipient draft per valid row using `{{field_name}}` placeholders
- Lets users edit subjects and bodies per recipient
- Supports AI rewrite/regeneration for individual drafts
- Bulk-sends checked recipients with server-side Resend API calls

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
- OpenAI API for draft rewrites
- Resend API for email delivery

## Local development

### Requirements

- Node.js 18+
- npm
- A Resend account and API key
- An OpenAI API key if you want AI regeneration enabled

### Environment variables

Create a `.env.local` file with:

```bash
RESEND_API_KEY=
RESEND_FROM_EMAIL=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Notes:

- `RESEND_FROM_EMAIL` must be a sender address that Resend allows for your account/domain.
- `OPENAI_API_KEY` is only needed for the `/api/ai/regenerate` route.
- `OPENAI_MODEL` defaults to `gpt-4o-mini` if omitted.

### Run the app

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## API surface

### `POST /api/ai/regenerate`

Regenerates a single recipient draft using the global template, current draft, and recipient fields.

### `POST /api/send/bulk`

Sends up to 100 recipients per request through Resend. The current implementation processes sends in batches of 5 concurrent requests.

### `POST /api/send/test`

Sends a single test email through Resend.

## Current prototype constraints

- No persistence: all campaign and recipient state is session-only
- No auth, roles, or team workflows
- No delivery analytics, open tracking, or reply tracking
- Only the first worksheet in an uploaded workbook is processed
- AI rewrite is per-recipient, not batch generation
- Bulk send requests are capped at 100 recipients

## Project structure

```txt
app/
  api/ai/regenerate/route.ts   # OpenAI rewrite endpoint
  api/send/bulk/route.ts       # Bulk send endpoint
  page.tsx                     # Main campaign builder page
components/
  campaign/                    # Campaign-level UI
  import/                      # Upload and preview UI
  recipient/                   # Per-recipient draft cards
hooks/                         # Client-side workflow hooks
lib/
  campaign/                    # Template merge and draft creation
  excel/                       # Spreadsheet parsing and validation
  server/                      # OpenAI and Resend clients
store/                         # Zustand campaign store
types/                         # Shared API and campaign types
```

## Good fit for this project

This codebase is a useful starting point for:

- AI-assisted outbound sales workflows
- Small internal campaign tools
- Spreadsheet-to-email operational tooling
- Prototyping personalized email generation before adding persistence, auth, and analytics
