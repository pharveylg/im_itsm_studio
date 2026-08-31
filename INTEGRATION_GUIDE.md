# OAS ↔ Analysis Studio — Integration Guide

Plain-language guide to how the **Operational Analysis Standard (OAS)** library
connects to the **ITSM Service Delivery — Analysis Studio** application.

This guide is for humans. The machine-readable companion is
[`oas-catalog.json`](./oas-catalog.json).

---

## 1. What is connected today

| Layer | Status | Notes |
|-------|--------|-------|
| OAS documents in this repo | ✅ Done | All six standards live under `oas-standards/`. |
| OAS uploaded as app "Guidelines" | ✅ Done (Way A, manual) | Uploaded once in the app's Guidelines manager, reused per analysis. |
| `oas-catalog.json` (this file set) | ✅ Done (Step a) | Describes every standard + version + app-mode mapping. |
| OAS-aware database columns | ❌ Not yet (Step b) | `stored_guidelines` has no `oas_id`/`version`/`git_ref` yet. |
| `/api/oas/*` runtime route | ❌ Not yet (Step b) | The app does not yet read the catalog. |
| GitHub → Supabase auto-sync | ❌ Not yet (Step d) | Future: app pulls OAS from a pinned git tag. |

**Bottom line:** today OAS works through *manual guideline upload* (Way A). The
catalog and this guide are preparation so the app can later become
*OAS-aware* without re-uploading files by hand.

---

## 2. How each OAS standard maps to an app mode

| OAS ID | Standard | App mode | ITSM module | Guideline required? |
|--------|----------|----------|-------------|---------------------|
| OAS-000 | Governance | All modes (overlay) | — | No (implicit) |
| OAS-101 | Incident Analysis | ITSM Analysis | Incident | Optional |
| OAS-201 | Major Incident Comms | **MI Comms Analysis** | Major Incident | **Mandatory** |
| OAS-301 | Problem Analysis | ITSM Analysis | Problem | Optional |
| OAS-401 | Change Analysis | ITSM Analysis | Change | Optional |
| OAS-501 | Operational Knowledge | Knowledge Authoring | Knowledge | Style standard |

> MI Comms Analysis will **not run** without a governance guideline — that is
> why OAS-201 is the mandatory one for that mode.

---

## 3. Flag tokens ↔ OAS evidence model

Every narrative line in an Analysis Studio report begins with a **flag token**.
These map directly onto the OAS-000 evidence model:

| Token | Meaning | OAS-000 concept |
|-------|---------|-----------------|
| `EVIDENCE` | Confirmed fact from source | Fact |
| `OBSERVATION` | AI inference from evidence | Observation |
| `ASSUMPTION` | AI filled a gap (incomplete evidence) | Hypothesis → lower confidence |
| `QUESTION` | Needs human validation | Outstanding question |
| `RISK` | Compliance risk | Risk |
| `BREACH` | Rule was broken | Non-compliant |
| `ACTION` | Required action | Recommendation |
| `COMPLIANT` | Met the requirement | Compliant |
| `UNKNOWN` | Can't tell from evidence | Unknown confidence |

A healthy report is mostly `EVIDENCE`/`OBSERVATION` with a few
`QUESTION`/`UNKNOWN` flagged for a human. `BREACH` and `RISK` are your
actionable items; `ASSUMPTION` means the AI guessed and you should verify.

---

## 4. Using the current manual setup (Way A)

1. Open Analysis Studio.
2. Pick a mode (ITSM Analysis or MI Comms Analysis; Knowledge Authoring for articles).
3. Upload evidence (ServiceNow XML; plus stakeholder emails for MI Comms).
4. Select the matching OAS guideline from the Guidelines manager
   (OAS-201 for MI Comms; OAS-101/301/401 for ITSM Analysis; OAS-501 for Knowledge).
5. Submit. The app enforces scope and calls the configured AI provider.
6. Review each finding: **Valid / Invalid / Ignore**, add comments.
7. Produce the finalized report and export to Outlook / HTML / `.eml`.

If a large MI Comms review times out on Vercel Hobby (60s), enable **Turbo
Mode**, untick *Include bounded raw XML excerpts*, narrow the module scope, and
use a faster model (Step 4 of the usage walkthrough).

---

## 5. Adding or updating a standard in the catalog

1. Edit `oas-catalog.json` → add/modify the entry under `standards[]`.
2. Keep `oas_id`, `version`, `status`, `file`, and `methodology_phases` accurate
   (copy the real `##` / `Phase` headings from the source `.md`).
3. Update `library.release` and `generated_on` when you cut a new OAS release.
4. Commit and push. (The app does not yet read this file — see Roadmap.)

---

## 6. Roadmap

- **Step (a) — catalog + guide** ✅ *this document set.*
- **Step (b) — OAS-aware app:** extend `stored_guidelines` with
  `oas_id`, `version`, `git_ref`, `methodology_phases`, `qa_checklist`,
  `prompt_contract`; add a read-only `/api/oas/*` runtime that serves the
  catalog and lets the analysis engine resolve a standard by `oas_id`.
- **Step (d) — GitHub → Supabase sync:** the app pulls OAS from a **pinned git
  tag** (e.g. `oas-v1.2.2`) instead of manual uploads, keeping the live
  standard frozen and auditable.

---

## 7. For maintainers — pinning a release

To freeze the version the app should consume:

```bash
git tag oas-v1.2.2
git push --tags
```

Then set `library.git_ref` in `oas-catalog.json` to `"oas-v1.2.2"`.
