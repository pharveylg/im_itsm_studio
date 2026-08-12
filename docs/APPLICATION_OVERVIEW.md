# ITSM Service Delivery — Analysis Studio

## Executive Summary

**ITSM Service Delivery — Analysis Studio** is an AI-assisted analysis platform for IT Service Management teams. It reviews ServiceNow record exports and stakeholder communications against an organization's own governance standards, then produces structured, reviewer-validated reports that can be finalized and sent through Outlook.

The application is intentionally **semi-manual**. Rather than connecting directly to a live ServiceNow instance, analysts export the records they are authorized to review, supply the governance standard that should be applied, and the tool performs a disciplined, evidence-grounded analysis. This keeps the human reviewer in control of what data is analyzed and how conclusions are validated.

It is used by ITSM analysts, Major Incident communications reviewers, and knowledge managers across six ITSM practice areas: Incidents, Major Incidents, Problem, Change, Knowledge, and Service Catalog.

---

## 1. What the Application Does

The Analysis Studio takes three kinds of input and turns them into a governed, structured report:

1. **Evidence** — ServiceNow XML exports and, for communications reviews, exported emails.
2. **Standard** — reusable governance guidelines (SOPs, SLA definitions, communication cadence rules, style guides).
3. **Scope and intent** — which ITSM modules to review and any run-specific focus.

From these, it generates a tabbed analysis where every finding is tagged by evidentiary confidence, every timeline is human-readable, and every conclusion can be validated, commented on, or excluded by an ITSM reviewer before a final report is produced.

The guiding principle throughout is that **the AI never invents governance**. Timing targets, SLA thresholds, and required behaviors come only from the guideline documents the user supplies. Where the standard is silent, the tool explicitly says so rather than assuming a value.

---

## 2. The Logic the Application Follows

This section describes what happens, in order, when the tool is used.

### Step 1 — The analyst selects a mode

Two analysis modes are available:

- **ITSM Analysis** — a cross-module governance review.
- **MI Comms Analysis** — a major incident communications and SLA compliance review.

The chosen mode determines which evidence is required, which prompt contract is used, and which report structure is produced.

### Step 2 — Evidence is gathered

The analyst uploads ServiceNow XML exports. For MI Comms Analysis, they also upload exported emails (`.msg`, `.eml`, `.html`, or `.txt`) representing the stakeholder communications sent during the incident.

As files are added, the application parses them locally in the browser for basic counts and then, on submission, performs a deeper server-side parse:

- XML is walked to detect record types, ServiceNow tables, identifiers, and important fields.
- Emails are parsed to extract sender, recipients (To/CC/BCC), sent timestamp, subject, body, and attachment names.
- Each document is classified against the six ITSM modules.

### Step 3 — The governance standard is applied

The analyst selects one or more **stored guidelines** — governance documents previously uploaded and retained for reuse. They may also add freeform notes and a run-specific focus.

For MI Comms Analysis, a stored governance guideline is **mandatory**. The tool will not run an SLA review without an evidence-based standard, because doing so would require the AI to invent timing targets.

### Step 4 — Module scope is enforced

The analyst can restrict the review to specific modules using tickboxes. When a scope is set, it is treated as a strict allow-list. Excluded modules do not appear anywhere in the output — not in evidence, counts, gaps, findings, correlations, or recommendations — even if their files are present in the packet. Excluded-module files may still be used silently as background context to interpret an in-scope fact.

### Step 5 — The request is assembled and validated

Before sending, the application:

- Checks the total request size against the platform's request limit and blocks oversized packets with a clear message.
- Builds a structured context summary from the parsed evidence.
- Assembles the guideline text into a single governing standard.
- Selects the configured AI provider (or a run-specific override).
- Applies **Turbo Mode** if enabled, which truncates guidelines, omits raw excerpts from the prompt, and reduces the output budget to stay within serverless time limits.

### Step 6 — The AI produces a tagged report

The selected AI provider is called with a strict output contract. The model must return only a fixed sequence of `[TAG]...[/TAG]` blocks. The application — not the model — controls layout by extracting each block and rendering it into its own tab.

Every narrative line must begin with a **flag token** that declares its evidentiary status. This is the core discipline of the tool: the reader can always tell the difference between a confirmed fact, an inference, an assumption, and a question requiring human input.

### Step 7 — Deterministic post-processing

After the model responds, the server enforces correctness on the parts that must not be left to the model:

- For MI Comms Analysis, the **Evidence & Scope** block is rebuilt deterministically from the parsed evidence, guaranteeing scope compliance.
- A **MIM Handovers** table is guaranteed to exist; if no handover is evidenced, a row explicitly states this and flags it for human validation.

### Step 8 — The reviewer validates the output

The rendered report is interactive. For each evidence or observation group, the ITSM reviewer can:

- Mark it **Valid**, **Invalid**, or **Ignore**.
- Add one or more reviewer comments.
- Remove comments.

These decisions shape the final report.

### Step 9 — The final report is produced

When the reviewer clicks **Produce Finalized Report**, the tool:

- Excludes anything marked Invalid or Ignore.
- Retains Valid and unreviewed evidence along with reviewer comments.
- Builds a deterministic **Incident Overview** (Priority, Impacted Location/Region, Issue Description, Business Impact, Resolution Summary) drawn from the XML fields.
- Assembles the report body with all relevant sections.
- Provides an **editable ITSM Recommendation** box.

### Step 10 — The report is exported to Outlook

The finalized report can be:

- Copied as rich Outlook-ready HTML.
- Sent to Outlook (opens a new message; the formatted body is placed on the clipboard to paste, with a plain-text fallback in the message).
- Downloaded as a self-contained HTML file.
- Downloaded as an Outlook `.eml` file that preserves the full HTML body.

---

## 3. Analysis Modes in Detail

### ITSM Analysis

A cross-module governance review across Incidents, Major Incidents, Problem, Change, Knowledge, and Service Catalog.

**Report tabs:**

| # | Tab | Content |
|---|-----|---------|
| 01 | Overview | Deterministic record identifiers and key facts (in scope only) |
| 02 | Executive Summary | Numbered, flag-tagged key findings |
| 03 | Module Findings | Per-module analysis |
| 04 | Timeline | Human-readable chronological table |
| 05 | Cross-Module | Relationships and handoffs between modules |
| 06 | ITIL Commentary | ITIL 4 best-practice comments paired to observations |
| 07 | Risks & Gaps | Risks, breaches, and unknowns |
| 08 | Recommended Actions | Corrective actions |
| 09 | Review Items | Items requiring human verification |
| 10 | Confidence | Overall confidence rating with justification |

### MI Comms Analysis

A major incident communications and SLA compliance review. Requires ServiceNow XML plus stakeholder emails and a mandatory governance guideline.

**Report tabs:**

| # | Tab | Content |
|---|-----|---------|
| 01 | Evidence & Scope | Deterministically enforced in-scope evidence summary |
| 02 | Executive Assessment | Overall RAG-style assessment |
| 03 | Handling Timeline | Human-readable incident handling chronology |
| 04 | MIM Handovers | Table of handovers/changeovers: who, what, when |
| 05 | Comms SLA | Communication timing vs. governance, Pass/Fail |
| 06 | Stakeholder Coverage | Required vs. evidenced audiences |
| 07 | Message Quality | Accuracy, clarity, impact, cadence, closure |
| 08 | ITIL Commentary | ITIL 4 best-practice comments |
| 09 | Handling Governance | Declaration, ownership, escalation, restoration |
| 10 | Governance Findings | Compliant, breach, and unknown controls |
| 11 | Corrective Actions | Prioritized actions |
| 12 | Validation | Final go/no-go checklist |

---

## 4. The Tagged-Block Output System

The application defines the report layout, not the AI. The model returns only tagged blocks, which are extracted with a resilient parser that also recovers gracefully if the response is truncated before a closing tag.

### Flag tokens

Every narrative line begins with one token, which the renderer strips into a colored badge:

| Token | Badge Color | Meaning |
|-------|-------------|---------|
| EVIDENCE | Green | Fact extracted directly from source material |
| OBSERVATION | Teal | AI inference drawn from evidence |
| ASSUMPTION | Amber | AI filled a gap; evidence was incomplete |
| QUESTION | Violet | Needs human validation before proceeding |
| RISK | Amber | Compliance risk identified |
| BREACH | Red | Compliance breach identified |
| ACTION | Violet | Required action |
| COMPLIANT | Green | Meets the requirement |
| UNKNOWN | Gray | Indeterminate from available evidence |

### Supporting rendering rules

- **Point-grouping** — a follow-on line (Observation, Assumption, Question) directly tied to an Evidence line renders as one connected card.
- **Checklists** — items containing "NOT MET" render with an amber warning badge; all others render with a green checkmark.
- **Confidence** — a single line parsed into a High/Medium/Low badge with justification.
- **Tables** — model tables are normalized to fixed-width, readable HTML; ISO and ServiceNow timestamps are converted to a human-readable format.

---

## 5. Knowledge Authoring

A dedicated workspace for producing ServiceNow-ready knowledge base articles.

**Inputs:**

- Title, summary, and article type (General Knowledge, How-To, Troubleshooting, Policy, Known Error, FAQ).
- Category, Knowledge Base, and Audience.
- A style guide (DOCX, PDF, XML, TXT, or MD) that the output must follow.
- Optional source incident/problem/change XML to ground the article in real events.

**Output:**

- Clean semantic HTML ready to paste into ServiceNow's KB HTML field.
- Image placeholders using the `[IMAGE:description|alt_text|caption]` syntax, since ServiceNow handles images as attachments rather than inline data.
- AI-suggested metadata (article type, category, KB, audience) that the author can accept.
- Three views: Preview, Raw HTML, and ServiceNow-ready.

---

## 6. Reviewer Collaboration

The report surface is a working document, not a static output. ITSM reviewers validate the AI's work before it becomes a report:

- **Valid** — the finding is confirmed and retained, marked as validated in the final report.
- **Invalid** — the finding is incorrect and excluded from the final report.
- **Ignore** — the finding is irrelevant and excluded from the final report.
- **Comments** — reviewers add context, corrections, or instructions per item; these are carried into the final report.

Unreviewed items are retained by default, so the reviewer only needs to act on items that require a decision.

---

## 7. Backend Configuration

### Architecture

The application is a **Next.js (App Router)** application. All AI calls, document parsing, and database access occur server-side. It uses:

- **Next.js** for the UI and server API routes.
- **Drizzle ORM** over **PostgreSQL** for persistence.
- A **server-side AI provider abstraction** that normalizes requests across providers.
- Server-side parsers for XML (`fast-xml-parser`), Word (`mammoth`), PDF (`pdf-parse`), and email (`postal-mime`, `@kenjiuno/msgreader`).

Native and heavy parsing packages are dynamically imported so they load only when needed, which keeps the serverless runtime stable.

### Database schema

Four tables are used:

| Table | Purpose |
|-------|---------|
| `connection_config` | Draft settings for the future ServiceNow REST connection |
| `ai_provider_configs` | Stored AI provider configurations, including keys, held server-side |
| `stored_guidelines` | Reusable governance documents with extracted text and usage tracking |
| `guideline_upload_chunks` | Temporary storage for chunked file uploads, auto-cleaned after 24 hours |

The schema is created either by running `npx drizzle-kit push` or through the in-app **Database Setup** panel, which calls a bootstrap endpoint that creates any missing tables and reports their status. Table creation logic is also idempotent at the point of use, so the tables are created on first access if they do not exist.

### AI providers

Providers are configured entirely through the UI at **Settings → AI Analysis Engine** and stored in the database. Two tiers are supported:

- **Cloud providers** — OpenAI, Anthropic Claude, and Azure OpenAI (the M365 Copilot backend). These work in all deployments.
- **Local providers** — Ollama and any generic OpenAI-compatible endpoint. These only work when the application is run on the user's own machine, because a serverless deployment cannot reach `localhost`.

Each provider has its own model, endpoint, temperature, maximum tokens, and API key. API keys are stored server-side and never returned to the browser. An on-demand **Test All Providers** action validates each configured provider with a minimal request and reports the exact error if one fails.

### Guideline uploads

Guideline documents are uploaded through a **chunked upload protocol**. The browser splits each file into 500 KB chunks, sends them individually to a dedicated endpoint, and the server reassembles, extracts, and stores the text. This design avoids the request-size limits of the serverless platform and supports files up to 12 MB across XML, DOCX, PDF, TXT, and Markdown.

### Request handling and limits

The analysis endpoint runs on the Node.js serverless runtime. It:

- Validates that at least one XML extract is present.
- Enforces mode-specific requirements (emails and a governance guideline for MI Comms).
- Rejects oversized request bodies with a clear message before calling the AI.
- Returns structured JSON errors for all handled failures, so the client can display a meaningful message instead of a raw platform error page.

---

## 8. How It Is Currently Deployed

The application is deployed as follows:

### Hosting — Vercel

The application runs on **Vercel** as a serverless Next.js deployment. It is connected to a **GitHub repository**; each push to the `main` branch triggers an automatic build and deployment. No manual deploy step is required once the repository is linked.

### Database — Supabase

Persistence is provided by a **Supabase** managed PostgreSQL project. The application connects using Supabase's **connection pooler on port 6543**, which is required for serverless environments because it manages the many short-lived connections that serverless functions create. SSL is applied automatically for Supabase connections.

### Environment configuration

A single required environment variable is set in Vercel:

```
DATABASE_URL=postgresql://postgres.<project>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

AI provider keys are **not** stored as environment variables. They are configured through the application's Settings interface and stored in the `ai_provider_configs` table in Supabase.

### First-run setup after deployment

Once deployed, the application is made operational through the UI:

1. **Settings → Database Setup → Create Missing Tables** ensures all four tables exist.
2. **Settings → AI Analysis Engine** is used to configure and enable at least one AI provider (typically Anthropic or OpenAI).
3. **Guidelines** are uploaded once and reused across all future analyses.

### Serverless timing considerations

The deployment operates within the serverless function time limit of the hosting plan. On the Vercel Hobby plan this is 60 seconds; the Pro plan allows up to 300 seconds. Because a large analysis (many emails plus full XML plus a lengthy governance standard) can exceed 60 seconds, the application includes a **Turbo Mode** that reduces prompt size and output budget to stay within the free-plan limit. For consistently large Major Incident reviews, the Pro plan is recommended.

---

## 9. Local Development

The application can also run locally, which additionally enables the local AI providers.

```bash
npm install
# Create .env with a DATABASE_URL (local PostgreSQL or Supabase)
npx drizzle-kit push
npm run dev
```

The application is then available at `http://localhost:3000`. When running locally, Ollama and generic OpenAI-compatible endpoints become usable because the server can reach `localhost`.

---

## 10. Current Limitations and Design Decisions

- **Serverless timeout** — analyses must complete within the hosting plan's function limit. Turbo Mode mitigates this on the free plan; the Pro plan removes the constraint for practical purposes.
- **Request size** — very large packets are blocked client-side before submission to avoid platform rejections; chunked uploads handle large guideline files separately.
- **Outlook rich formatting** — browsers cannot inject rich HTML through `mailto:`, so "Send to Outlook" copies the formatted report to the clipboard first and opens a message for the user to paste into. The `.eml` download preserves the full formatted body directly.
- **ServiceNow REST connection** — a live REST API integration is prepared in Settings but is not yet active; all analysis is currently based on manually exported XML.
- **Reviewer state persistence** — reviewer decisions and comments currently persist for the active session and are not yet stored in the database.
- **Authentication** — the application has no built-in user authentication. For team use it should be placed behind network controls or a reverse proxy.

---

## 11. Summary of the End-to-End Flow

1. Choose a mode (ITSM Analysis or MI Comms Analysis).
2. Upload ServiceNow XML, and emails for communications reviews.
3. Select a stored governance guideline and, optionally, set module scope and focus.
4. Submit; the server parses evidence, enforces scope, and calls the configured AI provider.
5. The AI returns a tagged, flag-tokened report; the server enforces deterministic sections.
6. The reviewer validates findings and adds comments.
7. Produce the finalized report with a deterministic incident overview and an editable recommendation.
8. Export to Outlook as rich HTML, a downloadable HTML file, or an `.eml` file.

The result is a repeatable, governed, evidence-grounded review process that keeps the ITSM reviewer in control of both the inputs and the conclusions.
