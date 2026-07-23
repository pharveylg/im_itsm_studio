---
document_id: OAS-000
title: Operational Analysis Standard — Governance
category: Governance Standard
version: 1.0
status: Approved
owner: Operations
classification: Internal
parent: None
related:
  - OAS-101
  - OAS-201
  - OAS-301
  - OAS-401
  - OAS-501
review_cycle: Annual
author: Operations — OAS Working Group
approved_by: Operations — Standards Governance Board
effective_date: 2026-07-23
---

# Operational Analysis Standard (OAS)

---

# Document Control

| Field | Value |
|---------|--------|
| Standard | Operational Analysis Standard |
| Identifier | OAS-000 |
| Version | 1.0 |
| Status | Approved |
| Framework Alignment | ITIL 4 |
| Applies To | Operational Analysis |
| Review Cycle | Annual |

---

# 1 Purpose

The Operational Analysis Standard (OAS) establishes a consistent methodology for analysing operational records within the IT Service Management (ITSM) lifecycle.

Its purpose is to ensure that operational analysis is:

- Consistent
- Evidence based
- Repeatable
- Auditable
- Vendor neutral
- Tool independent

The standard defines how operational evidence shall be collected, analysed, correlated and presented to stakeholders.

OAS does not replace ITIL or ITSM processes, nor does it replace ServiceNow (or any other platform) controls. It provides evidence-based analytical governance that complements them.

---

# 2 Scope

This standard applies to analysis performed against operational records including, but not limited to:

- Incidents (INC)
- Major Incidents (MI)
- Changes (CHG)
- Problems (PRB/PBI)
- Knowledge Articles
- Tasks
- Vendor Cases
- Monitoring Alerts
- Configuration Items
- Email Communications
- Supporting Documentation

This standard governs the analytical process only.

It does not replace existing ITIL processes for Incident Management, Change Enablement, Problem Management, Major Incident Management, or Knowledge Management.

---

# 3 Objectives

The objectives of this standard are to:

- Establish a common analytical methodology.
- Improve consistency between analysts.
- Improve AI-assisted analysis.
- Improve evidence traceability.
- Separate facts from assumptions.
- Improve executive reporting.
- Improve technical reporting.
- Standardise operational documentation.

---

# 4 Guiding Principles

Every analysis shall adhere to the following principles.

## 4.1 Evidence First

Analysis shall only be based on available evidence.

Missing evidence shall never be replaced with assumptions.

---

## 4.2 Objectivity

Analysis shall remain impartial.

Operational conclusions shall be supported by documented evidence.

---

## 4.3 Traceability

Every significant conclusion shall be traceable to one or more evidence sources.

---

## 4.4 Transparency

Where confidence is limited, the analyst shall explicitly state why.

---

## 4.5 Separation of Fact and Opinion

Facts

: Supported directly by evidence.

Observations

: Describe what occurred.

Inferences

: Logical conclusions derived from multiple evidence sources.

Hypotheses

: Possible explanations under investigation.

Recommendations

: Suggested future actions.

These shall never be presented interchangeably.

---

# 5 Analysis Philosophy

Operational analysis is not the process of explaining what happened.

Operational analysis is the process of determining what the available evidence supports.

The objective is to reduce uncertainty while maintaining analytical integrity.

---

# 6 Analysis Lifecycle

Every analysis shall follow the same lifecycle. This is the *conceptual* sequence of analytical stages; the operational execution workflow is provided in Appendix C.

```text
Evidence Collection
        │
        ▼
Evidence Inventory
        │
        ▼
Evidence Classification
        │
        ▼
Record Analysis
        │
        ▼
Cross-Record Correlation
        │
        ▼
Timeline Reconstruction
        │
        ▼
Gap Identification
        │
        ▼
Confidence Assessment
        │
        ▼
Operational Assessment
        │
        ▼
Executive Summary
```

---

# 7 Evidence Hierarchy

Operational evidence shall be evaluated according to its authority.

| Priority | Source |
|-----------|----------|
| 1 | Primary ITSM Record |
| 2 | Related ITSM Record |
| 3 | Vendor Record |
| 4 | Monitoring System |
| 5 | Email Communication |
| 6 | User Supplied Documentation |
| 7 | Analyst Notes |

Where evidence conflicts, the analyst shall:

- document the conflict
- identify affected conclusions
- avoid selecting one source without justification

---

# 8 Evidence States

Every required evidence source shall be classified.

| State | Description |
|----------|-------------|
| Present | Evidence supplied |
| Referenced | Mentioned but unavailable |
| Missing | Expected but absent |
| Not Applicable | Not required |

---

# 9 Evidence Classification

Every extracted finding shall be classified.

| Classification | Description |
|----------------|-------------|
| Fact | Directly supported |
| Observation | Behaviour observed |
| Inference | Logical conclusion |
| Hypothesis | Working theory |
| Vendor Statement | Vendor supplied |
| Recommendation | Proposed action |

---

# 10 Confidence Model

Every significant finding shall include a confidence rating.

| Rating | Description |
|----------|-------------|
| High | Supported by multiple independent evidence sources |
| Moderate | Supported by one authoritative source |
| Low | Limited supporting evidence |
| Unknown | Evidence unavailable |

Confidence shall never be implied.

---

# 11 Record Relationships

Operational records exist within a service management ecosystem.

No record shall automatically be assumed to explain another.

Relationships shall be established using evidence.

Examples include:

```text
Incident
   ↓
Major Incident
   ↓
Change
   ↓
Problem
   ↓
Vendor Case
   ↓
Task
   ↓
Configuration Item
   ↓
Knowledge Article
```

---

# 12 Correlation Standard

Each record shall first be analysed independently.

Only after independent analysis shall correlation occur.

Correlation seeks to determine:

- chronology
- causation
- dependency
- operational impact
- recovery
- remaining risk

---

# 13 Missing Information

Missing information shall never be inferred.

Where required information is absent the analyst shall record:

```text
Missing Information
Required Evidence
Reason
Impact to Confidence
```

Example

```text
Root Cause
Required Evidence : Problem Record
Confidence        : Unknown
```

---

# 14 AI Assisted Analysis

Artificial Intelligence may assist in:

- evidence extraction
- summarisation
- timeline reconstruction
- correlation
- documentation

Artificial Intelligence shall not:

- invent evidence
- infer unsupported conclusions
- conceal uncertainty
- modify timestamps
- rewrite operational history

Human validation remains mandatory.

---

# 15 Required Inputs

Every analysis shall begin with an Evidence Manifest.

Example

```text
Primary Record : INC0012345.xml
Related Records: PRB000456.xml, CHG000321.xml
Communications : Update 1.eml, Update 2.eml
Supporting     : Logs.zip
```

---

# 16 Required Outputs

Every completed analysis shall contain:

- Executive Summary
- Evidence Manifest
- Timeline
- Current State
- Operational Findings
- Business Findings
- Evidence Matrix
- Confidence Assessment
- Outstanding Questions
- Recommendations
- Next Required Evidence

---

# 17 Quality Assurance

Before publication verify:

- [ ] Evidence inventory complete
- [ ] Metadata extracted
- [ ] Timeline validated
- [ ] Facts separated from assumptions
- [ ] Confidence assigned
- [ ] Evidence gaps identified
- [ ] Recommendations evidence based
- [ ] Executive summary completed

---

# 18 Methodology Hierarchy

This standard governs all operational methodologies and governance standards within the OAS library.

| Standard | Category | Primary Record | Purpose |
|----------|----------|----------------|---------|
| OAS-000 | Governance Standard | — | Framework governance |
| OAS-101 | Analysis Methodology | Incident | Incident Analysis |
| OAS-201 | Analysis Methodology | Major Incident | Major Incident Communications |
| OAS-301 | Analysis Methodology | Problem | Problem Analysis |
| OAS-401 | Analysis Methodology | Change | Change Analysis |
| OAS-501 | Governance Standard | Knowledge | Operational Knowledge Standard |

Each methodology and governance standard inherits this standard.

Methodologies and standards may extend this standard but shall not contradict it.

## 18.1 Future Expansion (Planned — Not Yet Authored)

The following candidate standards have been identified for future consideration. They are **not** part of Release 1.0 and shall not be referenced as approved standards until authored and ratified under OAS-000 governance.

| Candidate ID | Intended Scope |
|--------------|----------------|
| OAS-601 | Configuration Item Analysis |
| OAS-901 | AI Prompt Standard |

---

# 19 Version Control

This standard shall follow semantic versioning.

- **Major Version** — Breaking methodological change.
- **Minor Version** — New capabilities.
- **Patch Version** — Editorial corrections.

---

# Appendix A — Analyst Code of Conduct

Analysts shall:

- Remain objective.
- Avoid confirmation bias.
- Preserve chronology.
- Preserve evidence integrity.
- Distinguish certainty from uncertainty.
- Document assumptions explicitly.
- Escalate unresolved ambiguity.

---

# Appendix B — Operational Analysis Principles

Every analysis should answer:

1. What evidence exists?
2. What does the evidence prove?
3. What remains unknown?
4. What additional evidence is required?
5. What operational risks exist?
6. What business risks exist?
7. What recommendations are supported by evidence?

---

# Appendix C — Standard Workflow (Operational Execution)

The analytical lifecycle (Section 6) is realised through the following operational workflow.

```text
Receive Evidence
        │
        ▼
Inventory Evidence
        │
        ▼
Extract Metadata
        │
        ▼
Validate Evidence
        │
        ▼
Analyse Record
        │
        ▼
Analyse Related Records
        │
        ▼
Correlate Findings
        │
        ▼
Assess Confidence
        │
        ▼
Produce Analysis
        │
        ▼
Executive Review
```

---

# Revision History

| Version | Date | Summary | Author | Reviewer |
|----------|------|---------|---------|----------|
| 0.1 | YYYY-MM-DD | Initial draft | | |
| 1.0 | 2026-07-23 | Promoted to Approved; corrected methodology hierarchy (§18); aligned metadata to Standard Metadata schema | Operations — OAS Working Group | Operations — Standards Governance Board |

---

# Future Revision Register

| ID | Status | Priority | Proposed Version | Enhancement |
|----|--------|----------|------------------|-------------|
| OAS000-001 | Proposed | Medium | 1.1 | Evidence Traceability Matrix (formal mapping of conclusions to evidence) |
| OAS000-002 | Proposed | Low | 1.1 | Worked example annex for each methodology |
| OAS000-003 | Proposed | Low | 2.0 | Author OAS-601 Configuration Item Analysis |
| OAS000-004 | Proposed | Low | 2.0 | Author OAS-901 AI Prompt Standard |

---

End of Standard
