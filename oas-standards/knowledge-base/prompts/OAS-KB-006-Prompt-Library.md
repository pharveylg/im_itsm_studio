---
document_id: OAS-KB-006
title: Prompt Library
category: Knowledge Base
version: 1.0
status: Approved
owner: Operations
classification: Internal
parent: OAS-000
related:
  - OAS-000
  - OAS-101
  - OAS-201
  - OAS-301
  - OAS-401
review_cycle: Annual
---

# OAS-KB-006 Prompt Library

## Purpose

Copy-paste prompts for AI-assisted operational analysis, aligned to **OAS-000 §14** (AI
shall not invent evidence, infer unsupported conclusions, conceal uncertainty, modify
timestamps, or rewrite history) and the AI Operating Standard of each methodology.

**Every AI output must be reviewed and signed off by a human analyst.**

---

## 1. Evidence Manifest (all analyses)

```text
You are assisting an OAS operational analysis. Build an Evidence Manifest from the
artefacts I provide. For each artefact list: name, type, and state
(Present/Referenced/Missing/Not Applicable). Do not assume any artefact exists that I
have not supplied. List missing expected evidence as a gap. Output a Markdown table.
```

---

## 2. OAS-101 Incident Analysis

```text
Act as an OAS-101 Incident Analysis assistant. From the Incident XML and supporting
evidence I provide:
1. Establish operational context (service, CI, impact, priority, severity).
2. Reconstruct the timeline with source references; flag timestamp conflicts.
3. Assess operational response (ownership, assignment, escalation, coordination).
4. Assess impact (recorded vs actual).
5. Evaluate evidence quality (treat gaps as limitations, not failure).
6. Distinguish observations from findings; classify each finding
   (Fact/Observation/Inference/Hypothesis).
7. Assign confidence (High/Moderate/Low/Unknown) to each finding.
Do NOT infer root cause without evidence. State explicitly where evidence is incomplete.
```

---

## 3. OAS-201 Major Incident Communications

```text
Act as an OAS-201 Major Incident Communications assistant. From the Major Incident XML
and communications I provide:
1. Reconstruct the communication timeline.
2. Assess communication quality (accuracy, clarity, consistency, relevance, actionability).
3. Evaluate timeliness (initial, cadence, resolution, closure).
4. Assess stakeholder communications (ops, exec, customer, vendor).
5. Evaluate MIM handovers for continuity ONLY — do not judge individual MIMs.
6. Assign confidence to each finding.
Distinguish factual communications from inferred intent. Flag any gap in customer cadence.
```

---

## 4. OAS-301 Problem Analysis

```text
Act as an OAS-301 Problem Analysis assistant. From the Problem XML and evidence I provide:
1. Inventory evidence and classify states.
2. Inherit established facts from OAS-101 and narrative from OAS-201 if supplied.
3. Evaluate the investigation independently of its stated conclusions.
4. Assess Root Cause as Supported / Partially Supported / Not Supported / Unable to Determine.
5. Assess Known Error, Corrective (People/Process/Technology), and Preventive actions.
6. Assess risk of recurrence.
7. Assign confidence to every conclusion.
NEVER accept a documented conclusion as true solely because it is recorded. Explicitly
document uncertainty where evidence is incomplete.
```

---

## 5. OAS-401 Change Analysis

```text
Act as an OAS-401 Change Analysis assistant. From the Change XML and evidence I provide:
1. Establish context and intent (401A Planned / 401B Remediation).
2. Assess planning integrity and whether risk/type were appropriate.
3. Evaluate implementation vs approved plan; note recorded vs unrecorded deviations.
4. Assess rollback symmetry and recoverability independently.
5. Validate operational outcomes from evidence — do NOT assume success from closure.
6. Recommend a success classification (Successful/Partial/Unsuccessful/Unconfirmed) with
   rationale, without altering the official record.
7. Assign confidence to findings.
```

---

## 6. General Analysis Quality Gate

```text
Review the draft OAS analysis against OAS-000 §17. Confirm: evidence inventory complete
and states classified; timeline validated; facts separated from assumptions; confidence
assigned to every significant finding; evidence gaps recorded; recommendations
evidence-based; executive summary present; cross-references verified; human validation
recorded. List any unmet items.
```

---

*End of OAS-KB-006.*
