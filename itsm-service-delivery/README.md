# ITSM Service Delivery — Analysis Studio

ServiceNow XML analysis, MI Comms governance review, and knowledge article authoring.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to supabase.com → New Project
2. Copy the connection string (port 6543, pooler):
   `postgresql://postgres.XXXX:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres`

### 3. Set environment variable

Create `.env`:

```env
DATABASE_URL=postgresql://postgres.XXXX:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
```

### 4. Push schema

```bash
npm run db:push
```

### 5. Start

```bash
npm run dev
```

Open http://localhost:3000

### 6. First-time setup in the app

1. Go to **Settings → Database Setup** → click **Create Missing Tables**
2. Go to **Settings → AI Analysis Engine** → configure at least one provider:
   - Anthropic: enter API key from console.anthropic.com
   - OpenAI: enter sk-... key
   - Azure OpenAI: enter endpoint + key from Azure Portal
3. Enable and save the provider
4. Click **Test All Providers** to verify

## Deploy to Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Add `DATABASE_URL` environment variable (Supabase port 6543)
4. Deploy
5. Open Settings → Database Setup → Create Missing Tables
6. Configure AI provider

## Features

- **ITSM Analysis** — cross-module governance review from ServiceNow XML
- **MI Comms Analysis** — major incident comms, email SLA, stakeholder review
- **Knowledge Authoring** — ServiceNow-ready KB articles with style guide enforcement
- **Multi-provider AI** — OpenAI, Anthropic, Azure OpenAI, Ollama (local), Generic
- **Persistent guidelines** — upload once, reuse across analyses
- **Module scope** — tickboxes to limit analysis to specific ITSM modules

## Tech Stack

- Next.js 16 (App Router)
- PostgreSQL via Drizzle ORM
- Tailwind CSS 4
- Supabase (managed PostgreSQL)
- Vercel (serverless hosting)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/         # ITSM + MI Comms analysis
│   │   ├── guidelines/      # Stored guidelines
│   │   ├── guidelines/upload/ # Chunked file upload
│   │   ├── ai-providers/    # AI provider management
│   │   ├── knowledge/       # KB article authoring
│   │   ├── health/          # Health check
│   │   └── setup/           # Database bootstrap
│   ├── knowledge/           # Knowledge Authoring page
│   ├── settings/            # Settings page
│   └── page.tsx             # Workbench (home)
├── components/              # React components
├── db/                      # Drizzle schema + connection
└── lib/                     # Business logic, parsers, prompts
```
