---
document_id: OAS-KB-003
title: Report Templates
category: Knowledge Base
version: 1.0
status: Approved
owner: Operations
classification: Internal
parent: OAS-000
related:
  - OAS-000
  - OAS-KB-002
review_cycle: Annual
---

# OAS-KB-003 Report Templates

## Purpose

Standard templates for the required analysis outputs defined in **OAS-000 §16**. Use these
to produce consistent, comparable analysis reports across all methodologies.

---

## 1. Analysis Report (Master Template)

```markdown
# <Record Type> Analysis — <Record ID>

## Evidence Manifest
<Primary record, related records, comms, supporting evidence; state of each.>

## Timeline
<Reconstructed chronology with source references.>

## Current State
<Where the service/record stands now.>

## Operational Findings
<What happened operationally; classified Fact/Observation/Inference/Hypothesis.>

## Business Findings
<Business impact and risk.>

## Evidence Matrix
<Conclusion → Evidence → Confidence.>

## Confidence Assessment
<Overall and per-finding ratings.>

## Outstanding Questions
<What remains unknown.>

## Recommendations
<Evidence-based actions; prioritised.>

## Next Required Evidence
<What would close the gaps.>

## Executive Summary
<Decision-grade summary for leadership.>
```

---

## 2. Executive Summary Template

```markdown
## Executive Summary

**Record:** <ID> — <Title>
**Analysed by:** <Analyst>  **Date:** <YYYY-MM-DD>
**Classification:** <High|Moderate|Low|Unknown> overall confidence

**What happened:** <1–3 sentences, evidence-based.>
**Impact:** <Business + technical impact.>
**How it was handled:** <Strength/weakness in response.>
**Key risks:** <Residual risks.>
**Top recommendations:** <3–5 bullets, prioritised.>
**Outstanding:** <Key unknowns.>
```

---

## 3. Evidence Manifest Template

```markdown
## Evidence Manifest

| # | Artefact | Type | State | Notes |
|---|----------|------|-------|-------|
| 1 | INC0012345.xml | Primary Record | Present | |
| 2 | PRB000789.xml | Related Record | Present | Root cause context |
| 3 | Update1.eml | Communication | Present | Customer update |
| 4 | Vendor RCA | Vendor Record | Referenced | Promised, not supplied |
| 5 | App logs | Monitoring/Logs | Missing | Retained only 7 days |

State legend: Present | Referenced | Missing | Not Applicable
```

---

## 4. Evidence Matrix Template

```markdown
## Evidence Matrix

| # | Conclusion | Classification | Supporting Evidence | Confidence |
|---|-----------|----------------|---------------------|------------|
| C1 | Root cause = bad deploy CHG001122 | Inference | Deploy time ≈ fault onset; error signature | High |
| C2 | Escalation delayed 40 min | Fact | Work notes; SITREP timestamps | High |
| C3 | Customer comms adequate | Hypothesis | No customer survey; gap in cadence | Low |
```

---

## 5. Confidence Assessment Template

```markdown
## Confidence Assessment

| Rating | Definition | Used for |
|--------|------------|----------|
| High | Multiple independent sources | Causal conclusions |
| Moderate | One authoritative source | Single-record observations |
| Low | Limited evidence | Partial support |
| Unknown | Evidence unavailable | Gaps |

**Per-finding confidence:**
- C1 Root cause: High
- C2 Escalation delay: High
- C3 Customer comms: Low

**Overall confidence:** High for response; Moderate for causality.
```

---

## Related Assets

- OAS-000 §16 (required outputs)
- OAS-KB-002 Analysis Checklists
- OAS-KB-004 Operational Examples

---

*End of OAS-KB-003.*
