# ITSM Service Delivery — Analysis Studio

Semi-manual ServiceNow XML analysis and knowledge article authoring for incidents, major incidents, change, problem, knowledge, and service catalog.

## Features

- **ITSM Analysis** — cross-module governance review from ServiceNow XML exports
- **MI Comms Analysis** — major incident communications, email SLA, and stakeholder review
- **Knowledge Authoring** — ServiceNow-ready KB articles with style guide enforcement
- **Multi-provider AI** — OpenAI, Anthropic Claude, Azure OpenAI, Ollama, or any OpenAI-compatible endpoint
- **Persistent guidelines** — upload once, reuse across analyses
- **ServiceNow connection** — REST API integration (coming soon)

## Deploy: GitHub → Supabase → Vercel

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name, set a database password, select a region
3. Once created, go to **Project Settings → Database**
4. Under **Connection string → URI**, copy the connection string  
   Format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
5. **Important:** use the **port 6543** pooler URI (not 5432) — Vercel serverless needs connection pooling

### 2. Push the schema to Supabase

From your local machine (one-time setup):

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install

# Set your Supabase connection string
export DATABASE_URL="postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres"

# Push the schema
npx drizzle-kit push
```

You should see tables created: `connection_config`, `ai_provider_configs`, `stored_guidelines`.

### 3. Deploy to Vercel

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the GitHub repo
3. In **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Supabase pooler URI (port 6543) |

4. Click **Deploy**

That's it. Vercel builds and deploys automatically on every push.

### 4. Configure AI providers

1. Open your Vercel deployment URL
2. Go to **Settings** → **AI Analysis Engine**
3. Configure at least one provider:
   - **Anthropic**: paste your API key from [console.anthropic.com](https://console.anthropic.com)
   - **Azure OpenAI**: paste endpoint + key from Azure Portal
   - **OpenAI**: paste your `sk-...` key
4. Enable the provider and save

### 5. Store your governance guidelines

1. Still in **Settings**, scroll to **Saved Guidelines** (or use the Workbench sidebar)
2. Upload your MI Communications SOP, Change Review Standard, etc.
3. These persist in Supabase and are reusable across all analyses

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Supabase pooler URI) |
| `AI_API_KEY` | No | Default AI provider key (configure via UI instead) |

AI provider keys are configured through the UI at `/settings` and stored encrypted in the database — they don't need to be in environment variables unless you want a default.

## Local Development

```bash
# Install dependencies
npm install

# Create a local PostgreSQL database
psql -U postgres -c "CREATE DATABASE app_db;"

# Create .env from example
cp .env.example .env
# Edit .env with your local DATABASE_URL

# Push schema
npx drizzle-kit push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL via Drizzle ORM
- **Hosting**: Vercel (serverless)
- **Storage**: Supabase (managed PostgreSQL)
- **AI**: Multi-provider (OpenAI, Anthropic, Azure, Ollama, generic)
- **Styling**: Tailwind CSS 4

## Vercel Plan Notes

| Feature | Hobby (free) | Pro |
|---------|-------------|-----|
| Serverless timeout | 60s | 300s |
| Body size limit | 4.5 MB | 4.5 MB |
| Bandwidth | 100 GB/mo | 1 TB/mo |

The `maxDuration` on API routes is set to 120s. On the Hobby plan, Vercel caps at 60s — large MI Comms analyses with many emails may time out. Upgrade to Pro if needed.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/         # ITSM + MI Comms analysis endpoint
│   │   ├── ai-providers/    # AI provider management
│   │   ├── connection/      # ServiceNow connection settings
│   │   ├── guidelines/      # Stored guideline CRUD
│   │   ├── health/          # Health check
│   │   └── knowledge/       # Knowledge article authoring
│   ├── knowledge/           # Knowledge Authoring page
│   ├── settings/            # Settings page
│   └── page.tsx             # Workbench (home)
├── components/              # React components
├── db/                      # Drizzle schema + connection
└── lib/                     # Business logic, parsers, prompts
```
