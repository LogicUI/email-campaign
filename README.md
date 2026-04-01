# EmailAI - AI-Powered Email Campaign Platform

Transform spreadsheets into personalized, AI-enhanced email campaigns in minutes. EmailAI helps you create data-driven outreach that connects with your audience at scale.

## What Makes EmailAI Different

**AI-First Personalization**: Harness multiple AI providers (OpenAI, Anthropic, DeepSeek, Google) to generate, refine, and personalize your email content automatically. Let AI craft compelling messages while you maintain full control.

**Universal Data Import**: Connect to any data source—CSV, Excel, Google Sheets, or your PostgreSQL/Supabase database. If you have your contacts in a spreadsheet or database, EmailAI can work with it.

**Send From Your Gmail**: Deliver campaigns through your existing Gmail account with full tracking and error handling. No new infrastructure required.

## Key Capabilities

### AI-Powered Campaign Creation

- **Multi-Provider AI Support**: Choose from OpenAI (GPT-4o-mini), Anthropic (Claude 3.5 Sonnet), DeepSeek, or Google (Gemini 2.0 Flash)
- **Global Template AI Regeneration**: Describe what you want to say, and AI rewrites your entire campaign template
- **Individual Email Enhancement**: Let AI personalize specific recipient emails based on their data
- **Smart Placeholder Preservation**: AI keeps your `{{field_name}}` personalization tokens intact during regeneration

### Flexible Data Management

- **Spreadsheet Import**: Upload CSV, Excel, or other spreadsheet formats with automatic email detection
- **Google Sheets Integration**: Connect directly to Google Drive and import from live spreadsheets
- **Database Connections**: Pull data from PostgreSQL or Supabase with SSL-secure connections
- **Intelligent Validation**: Flags missing, invalid, or duplicate emails before you send

### Intelligent Campaign Workflow

- **Template-Based Personalization**: Use `{{field_name}}` placeholders to dynamically insert recipient data
- **Real-Time Preview**: See exactly how each personalized email will look before sending
- **Test Emails**: Send test emails to yourself to verify formatting and deliverability
- **Bulk Sending**: Send up to 100 emails per batch with automatic retry and error handling

## How It Works

### 1. Import Your Data
Upload from CSV/Excel, connect to Google Sheets, or pull from your database. EmailAI automatically detects email columns and validates your data.

### 2. Craft Your Message
Create a global template with personalization fields. Use placeholders like `{{company_name}}`, `{{contact_name}}`, or any column from your data.

### 3. Let AI Enhance (Optional)
Use AI to generate your initial template, refine your messaging, or personalize individual emails. Just describe what you want, and AI handles the rest.

### 4. Review and Test
Preview personalized emails for specific recipients. Send test emails to verify everything looks perfect.

### 5. Send at Scale
Select recipients and send through your Gmail account. Track delivery status and handle errors in real-time.

## Use Cases Across Industries

### B2B Sales & Lead Generation
- **Prospect Outreach**: Personalize emails with company-specific details from your CRM
- **Event Follow-Ups**: Reference attendee sessions and interests post-event
- **Partnership Proposals**: Tailor messaging based on prospect industry and size

### Marketing & Customer Engagement
- **Product Launches**: Segment customers and send personalized announcements
- **Newsletter Campaigns**: Dynamic content based on customer preferences
- **Re-Engagement**: Win back inactive customers with personalized offers

### Events & Conferences
- **Pre-Event Invitations**: Personalized invitations with speaker-specific content
- **Post-Event Follow-Ups**: Reference sessions attended and next steps
- **Sponsor Outreach**: Custom proposals based on sponsor profile data

### Customer Success
- **Onboarding Sequences**: Account-specific setup guides and milestones
- **Check-In Emails**: Usage-based recommendations and tips
- **Renewal Reminders**: Personalized terms based on account history

## Personalization in Action

EmailAI uses simple `{{field_name}}` placeholders that automatically pull from your data. Here's how it works across industries:

**B2B Sales Example**
```
Subject: Partnership opportunity for {{company_name}}

Hi {{contact_name}},

I noticed {{company_name}} is expanding in {{industry}}.
I'd love to explore how we could support {{company_name}}'s growth
in the {{region}} market.

Would you be open to a brief call next week?
```

**Event Marketing Example**
```
Subject: Your exclusive pass to {{event_name}}

Hi {{attendee_name}},

Based on your interest in {{topic}}, I thought you'd love
{{session_name}} featuring {{speaker_name}}.

Your exclusive discount code: {{discount_code}}
```

**Customer Success Example**
```
Subject: How {{company_name}} can get more from {{product_name}}

Hi {{customer_name}},

Your team has achieved {{milestone}} with {{product_name}}!
I wanted to share some advanced features that could help
{{company_name}} reach {{next_goal}} even faster.
```

**How It Works**: Import headers are automatically normalized (e.g., "Company Name" becomes `company_name`), ensuring your templates work regardless of source data format.

## Why Marketers Love EmailAI

- **No Infrastructure Required**: Browser-based platform—nothing to install or host
- **Your Data, Your Control**: Data stays in your browser and Google account
- **AI Flexibility**: Switch between AI providers or use your own API keys
- **Database-Ready**: Direct PostgreSQL/Supabase connections—no export needed
- **Gmail Integration**: Send from your existing email address with full tracking
- **Cost-Effective**: Use your own AI provider keys—no per-email surcharges
- **Fast Setup**: From data import to sent emails in under 5 minutes

## Getting Started

### What You'll Need

- **Time**: ~5 minutes for initial setup
- **Google Account**: For Gmail integration and OAuth
- **AI Provider API Key** (optional): For AI features—choose OpenAI, Anthropic, DeepSeek, or Google
- **Node.js 18+ and Bun 1.3+**: For running the platform locally

### Step 1: Set Up Google OAuth

EmailAI uses Google OAuth for secure Gmail integration.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Web application)
5. Add `http://localhost:3001/api/auth/callback/google` to authorized redirect URIs
6. Copy your Client ID and Client Secret

### Step 2: Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# Required: Session security
AUTH_SECRET=your-random-secret-string

# Required: Google OAuth credentials
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# Required: Your app URL
NEXTAUTH_URL=http://localhost:3001
```

**What These Do**:
- `AUTH_SECRET`: Securely signs user session cookies
- `AUTH_GOOGLE_ID/SECRET`: Enables Google sign-in and Gmail access
- `NEXTAUTH_URL`: Tells the app where it's running

### Step 3: Install and Run

```bash
# Install dependencies
bun install

# Start the development server
bun run dev
```

Open `http://localhost:3001` in your browser. You'll be redirected to sign in with Google.

### Step 4: Configure AI (Optional)

For AI-powered features, enter your provider API key in the app:

1. Click **Settings** → **AI Settings**
2. Select your provider (OpenAI, Anthropic, DeepSeek, or Google)
3. Enter your API key
4. Choose your preferred model

**Note**: AI keys are stored in your browser only—never sent to our servers.

## Campaign Workflow

1. **Upload Data**: Import from CSV, Excel, Google Sheets, or database
2. **Review Import**: Confirm email column and validate data
3. **Define Campaign**: Create global subject and body template with `{{field_name}}` placeholders
4. **Generate Drafts**: System creates personalized drafts for each recipient
5. **Enhance with AI** (optional): Use AI to regenerate templates or individual emails
6. **Review & Edit**: Preview personalized emails and make adjustments
7. **Test**: Send test emails to verify formatting
8. **Send**: Select recipients and send through Gmail

## Platform Scope

### Ideal For
- Small to medium marketing teams (1-50 users)
- Sales teams doing outbound prospecting
- Event managers sending personalized invitations
- Customer success teams running onboarding campaigns
- Internal communications with database-driven personalization

### Current Focus
- Single-user campaigns (each user sends from their own Gmail)
- Browser-based AI key management (no server-side key storage)
- Session-based campaign building (data persists in browser during session)
- Gmail delivery (other providers coming soon)

### Technical Foundation
Built with modern, secure technologies:
- **Next.js 14**: React framework for fast, responsive UI
- **TypeScript**: Type-safe codebase for reliability
- **Drizzle ORM**: Efficient database operations
- **Tailwind CSS**: Modern, mobile-friendly design
- **Vitest/Playwright**: Comprehensive testing suite

## For Developers

### API Endpoints

**`POST /api/ai/regenerate`**
Regenerates a single recipient draft using your configured AI provider.

**`POST /api/ai/regenerate-global-template`**
Rewrites the entire campaign template (subject + body) using AI.

**`POST /api/send/bulk`**
Sends up to 100 emails through authenticated user's Gmail. Processes 5 concurrent requests per batch.

**`POST /api/send/test`**
Sends a single test email for preview and verification.

**`GET /api/database/tables`**
Lists available tables in connected database.

**`POST /api/google/sheets/import`**
Imports data directly from Google Sheets by URL.

### Project Structure

```
app/
  (pages)/                    # Main application pages
    login/page.tsx            # Public login page
    page.tsx                  # Protected main workspace
  api/                        # Backend API routes
    ai/                       # AI regeneration endpoints
    auth/                     # Google OAuth handlers
    send/                     # Gmail delivery endpoints
    database/                 # Database connection endpoints
    google/                   # Google Sheets integration
  components/                 # React components
    campaign/                 # Campaign management UI
    data-import/              # Data import workflows
    recipient/                # Recipient card components
  core/                       # Business logic
    ai/                       # AI provider integration
    campaign/                 # Template and draft logic
    email/                    # Email rendering helpers
    excel/                    # Spreadsheet parsing
    integrations/             # Third-party API clients
```

## Common Questions

**Q: Does EmailAI store my data?**
A: Campaign data lives in your browser during your session. We don't store your contacts or emails on our servers.

**Q: Is my AI API key secure?**
A: AI keys are stored in your browser's localStorage and sent directly to your chosen AI provider—never to our servers.

**Q: Can I use my own email provider?**
A: Currently, EmailAI integrates with Gmail. Additional email providers are on our roadmap.

**Q: What's the maximum campaign size?**
A: The platform handles thousands of recipients efficiently. Bulk sends process 100 emails per batch with automatic error handling.

**Q: Do I need coding skills?**
A: No. If you can run the setup commands and use a spreadsheet, you can create campaigns. For developers, we offer API endpoints for custom integrations.

## License

MIT License - feel free to use this for your own email marketing needs or as a starting point for custom solutions.

## Contributing

Contributions are welcome! This platform is designed as a starting point for AI-powered marketing tools. Extend it for your use case or contribute back to the community.
