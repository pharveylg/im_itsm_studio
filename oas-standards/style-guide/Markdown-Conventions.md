---
document_id: MD-CONVENTIONS
title: Markdown Conventions
category: Supporting Guidance
version: 0.1-DRAFT
status: Draft
owner: Operations
classification: Internal
parent: OAS-000
related:
  - OAS-000
review_cycle: Annual
---

# Markdown Conventions (DRAFT)

> **Status:** DRAFT — seeded placeholder.

## Front Matter

Every OAS document shall include YAML front matter:

```yaml
---
document_id: OAS-XXX
title: ...
category: Governance Standard | Analysis Methodology
version: 1.0
status: Approved
owner: Operations
classification: Internal
parent: OAS-000
related:
  - OAS-YYY
review_cycle: Annual
---
```

## Formatting

- Headings: ATX style (`## `). Exactly one H1 per document (the title).
- Lists: `-` for bullets, `1.` for ordered steps.
- Tables: GitHub-flavoured Markdown.
- Code: fenced blocks for YAML, record excerpts, and CLI snippets.
- Diagrams: Mermaid or text trees committed under `assets/diagrams/`.
- Dates: ISO 8601 (`YYYY-MM-DD`).
- Normative terms: **Shall / Should / May / Must Not** rendered in bold.

## Compatibility

Compatible with GitHub, GitLab, Azure DevOps Wiki, Obsidian, VS Code, and MkDocs.

*To be expanded in a future release.*
