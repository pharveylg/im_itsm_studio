# Operational Analysis Standard (OAS)

> **Release:** 1.2.1 &nbsp;|&nbsp; **Status:** Approved &nbsp;|&nbsp; **Effective:** 2026-07-23 &nbsp;|&nbsp; **Classification:** Internal

The **Operational Analysis Standard (OAS)** is an enterprise standards library that defines
evidence-based methodologies for analysing operational records across the IT Service
Management (ITSM) lifecycle.

OAS does **not** replace ITIL, ITSM processes, or ServiceNow controls. It provides
governance and analytical methodology that *complements* them, ensuring that operational
analysis is consistent, repeatable, auditable, and vendor-neutral.

---

## What is the OAS Framework?

OAS is a governed collection of **standards** and **methodologies** that tells analysts *how*
to investigate and document operational events — Incidents, Major Incidents, Problems,
Changes, and operational Knowledge — using the evidence those records contain.

The framework is built on three enduring principles:

- **Evidence over opinion.** Conclusions must be traceable to evidence. Missing evidence is
  recorded as a gap, never filled with assumption.
- **Governance before methodology.** All methodologies inherit the rules defined in
  **OAS-000**. No methodology may contradict the governance standard.
- **Platform-agnostic by design, ServiceNow by reference.** Methodologies are written to
  apply to any ITSM platform, with ServiceNow treated as the reference implementation.

For every analysis, OAS produces a consistent set of outputs: an evidence manifest, an
operational timeline, findings (operational and business), a confidence assessment,
outstanding questions, and evidence-based recommendations.

---

## Relationship to ITIL and ServiceNow

| Dimension | Relationship |
|-----------|--------------|
| **ITIL 4** | OAS is *aligned* with ITIL 4 practices (Incident Management, Problem Management, Change Enablement, Major Incident Management, Knowledge Management). It adopts ITIL terminology and follows ITIL's emphasis on continual improvement, but it is a *documentation and analysis* standard, not a process standard. |
| **ServiceNow** | ServiceNow is the **reference implementation**. Examples use ServiceNow record types (Incident, Major Incident, Problem, Change, Knowledge), related lists, and XML exports. ServiceNow XML is treated as the authoritative structured evidence source. |
| **Other ITSM platforms** | Methodologies are platform-agnostic where practical. No organisation-specific ServiceNow customisation is assumed, so the methods remain portable to other tools. |

OAS analyses the *outputs* of ITIL processes and ServiceNow records; it does not redefine
how those processes are executed.

### Primary Operational Record Types

| OAS Standard | Primary Record |
|--------------|----------------|
| OAS-000 | Framework governance (parent of all) |
| OAS-101 | Incident |
| OAS-201 | Major Incident Communications |
| OAS-301 | Problem |
| OAS-401 | Change |
| OAS-501 | Knowledge (governance) |

---

## Library Structure

The library is organised into three categories, each governed by **OAS-000**:

1. **Governance Standards** — define the rules that apply across the whole framework.
2. **Analysis Methodologies** — structured analytical approaches for specific record types.
3. **Knowledge Base** — reusable, derived assets (templates, checklists, prompts, examples).

```text
OAS
├── Governance Standards
│   ├── OAS-000  Operational Analysis Standard (Governance)
│   └── OAS-501  Operational Knowledge Standard
├── Analysis Methodologies
│   ├── OAS-101  Incident Analysis
│   ├── OAS-201  Major Incident Communications
│   ├── OAS-301  Problem Analysis
│   └── OAS-401  Change Analysis
└── Knowledge Base (authored — OAS-KB-001 … OAS-KB-006)
```

---

## Navigating the Repository

This repository is structured for direct use in GitHub, GitLab, Azure DevOps Wiki,
Obsidian, VS Code, and MkDocs.

```text
oas/
├── README.md                              # You are here — library entry point
├── LICENSE                                # Internal-use licence
├── CHANGELOG.md                           # Release history
├── CONTRIBUTING.md                        # How to propose changes
│
├── governance/                            # Governance Standards (authoritative)
│   ├── OAS-000-Governance.md
│   └── OAS-501-Operational-Knowledge-Standard.md
│
├── methodologies/                         # Analysis Methodologies
│   ├── OAS-101-Incident-Analysis.md
│   ├── OAS-201-Major-Incident-Communications.md
│   ├── OAS-301-Problem-Analysis.md
│   └── OAS-401-Change-Analysis.md
│
├── knowledge-base/                        # Reusable assets (authored — see knowledge-base/README.md)
│   ├── README.md
│   ├── templates/      (OAS-KB-001)
│   ├── checklists/     (OAS-KB-002)
│   ├── reports/        (OAS-KB-003)
│   ├── examples/       (OAS-KB-004)
│   ├── references/     (OAS-KB-005)
│   └── prompts/        (OAS-KB-006)
│
├── assets/                                # Diagrams, images, logos
│   ├── images/
│   ├── diagrams/
│   └── logos/
│
├── presentation/                         # Slide decks (Major Incident showcase: .html + .pptx)
└── style-guide/                           # Documentation style (DRAFT)
    ├── Documentation-Style-Guide.md
    └── Markdown-Conventions.md
```

**Reading order for new users:** start with `OAS-000` (the rules), then read the
methodology for the record type you are analysing, then apply the relevant Knowledge Base
asset once it is published.

---

## Release Version

- **Current release:** `1.2.2`
- **Release date:** 2026-07-23
- **Status:** Approved (editorial review complete)
- **Scope:** Six standards — OAS-000, OAS-101, OAS-201, OAS-301, OAS-401, OAS-501 — plus
  the Knowledge Base (OAS-KB-001 … OAS-KB-006).
- **1.1.0 change:** All six standards elaborated for professional depth (rationale,
  examples, per-phase guidance, definitions, worked examples, anti-patterns).
- **1.2.0 change:** Knowledge Base authored — templates, checklists, report templates,
  worked examples, reference guides, and an AI prompt library, all derived from the frozen
  standards.
- **1.2.1 change:** Added relationship visuals — 16 Mermaid diagrams across the standards
  and Knowledge Base, plus a static SVG architecture export in `assets/diagrams/`.
- **1.2.2 change:** Added a presentation deck (`presentation/oas-major-incident-deck.html`)
  showcasing all standards through the Major Incident (OAS-201) lens.
- **Not yet included:** Ratified style guides (`style-guide/` remains DRAFT seeds).

See `CHANGELOG.md` for the full release history.

---

## Quick Start for New Analysts

1. **Confirm the record type** you are analysing (Incident, Major Incident, Problem,
   Change, or Knowledge) and open the matching methodology:
   - Incident → `methodologies/OAS-101-Incident-Analysis.md`
   - Major Incident communications → `methodologies/OAS-201-Major-Incident-Communications.md`
   - Problem → `methodologies/OAS-301-Problem-Analysis.md`
   - Change → `methodologies/OAS-401-Change-Analysis.md`
   - Operational Knowledge → `governance/OAS-501-Operational-Knowledge-Standard.md`
2. **Read OAS-000 first** if this is your first OAS analysis. It defines the evidence
   hierarchy, confidence model, and the analytical lifecycle every methodology inherits.
3. **Build an Evidence Manifest.** List every artefact you have (XML exports, `.eml`
   files, chat exports, bridge notes, timelines) and classify each as Present, Referenced,
   Missing, or Not Applicable.
4. **Follow the methodology phases** in order. Analyse the primary record *first*, then
   correlate related records.
5. **Assign a confidence rating** (High / Moderate / Low / Unknown) to every significant
   finding, and never infer what evidence does not support.
6. **Separate facts from opinions.** Use the OAS-000 classification (Fact, Observation,
   Inference, Hypothesis, Recommendation) consistently.
7. **Complete the Quality Assurance Checklist** at the end of the methodology before
   publishing.
8. **Escalate ambiguity.** Where evidence is insufficient or contradictory, record it
   explicitly rather than resolving it by assumption.

---

## Governance and Contribution

- All changes are governed by **OAS-000** and follow the contribution process in
  `CONTRIBUTING.md`.
- Documents use semantic versioning: *Major* = breaking methodological change,
  *Minor* = new capability, *Patch* = editorial correction.
- Each standard maintains a Revision History and a Future Revision Register.
- The Knowledge Base shall never supersede Governance Standards or Analysis Methodologies.

## Status of the Knowledge Base

The Knowledge Base is **authored** in Release 1.2.0 and is *derived* from the approved
standards (for example, OAS-KB-002 checklists from the methodologies, OAS-KB-001 templates
from OAS-501). See `knowledge-base/README.md` for the full asset index.

---

*End of README.*
