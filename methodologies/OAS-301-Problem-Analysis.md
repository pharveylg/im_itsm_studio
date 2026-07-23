---
document_id: OAS-301
title: Problem Analysis Methodology
category: Analysis Methodology
version: 1.0
status: Approved
owner: Operations
classification: Internal
parent: OAS-000
related:
  - OAS-101
  - OAS-201
  - OAS-401
  - OAS-501
review_cycle: Annual
---

# OAS-301 Problem Analysis Methodology

## Purpose

This standard defines the methodology for analysing Problem investigations.

The purpose of OAS-301 is to evaluate the quality, completeness, and evidential strength of a Problem investigation rather than simply reviewing the Problem record.

OAS-301 provides an evidence-based framework for assessing:

- Investigation quality
- Root Cause determination
- Known Error documentation
- Corrective Actions
- Preventive Actions
- Risk of recurrence
- Investigation completeness

This methodology inherits all governance requirements defined in **OAS-000 Operational Analysis Standard**.

---

## Scope

This methodology applies to:

- Problem (PBI/PRB) records
- Root Cause Investigations
- Known Error investigations
- Service Improvement Reviews (SIR)
- Corrective and Preventive Action (CAPA) plans

OAS-301 complements:

- OAS-101 Incident Analysis
- OAS-201 Major Incident Communications

and provides investigation context for:

- OAS-401 Change Analysis
- OAS-501 Operational Knowledge Standard

Where Post Incident/Implementation Review (PIR) artefacts exist, they may be used as supporting evidence but are not a standalone OAS standard in Release 1.0.

---

## Analytical Responsibility

OAS-301 evaluates the investigation.

It does not assume that documented conclusions are correct.

The Problem record is treated as evidence.

Conclusions shall be assessed against all available evidence.

---

## Guiding Principles

Every Problem analysis shall:

- Remain evidence based.
- Distinguish evidence from conclusions.
- Assess investigation quality independently from technical conclusions.
- Identify unsupported conclusions.
- Preserve operational chronology established by previous OAS methodologies.
- Document uncertainty where evidence is insufficient.

### Burden of Proof Principle

Conclusions documented within a Problem investigation are not accepted solely because they are recorded.

Each significant conclusion shall be evaluated against the available evidence.

Where evidence is insufficient, contradictory, or unavailable, the analysis shall explicitly document:

- Evidence reviewed
- Supporting observations
- Contradictory observations
- Confidence
- Impact on the investigation

The objective of OAS-301 is to evaluate both the quality of the investigation and the strength of its conclusions.

---

## Inputs

### Mandatory

| Evidence | Purpose |
|----------|---------|
| Problem XML | Primary investigation record |

### Recommended

| Evidence | Purpose |
|----------|---------|
| Incident XML | Operational history |
| Major Incident XML | Major Incident context |
| OAS-101 Analysis | Established operational facts |
| OAS-201 Analysis | Communication and operational narrative |

### Optional

| Evidence | Purpose |
|----------|---------|
| Vendor RCA | External technical findings |
| Service Improvement Review (SIR) | Governance review |
| Known Error Record | Documented fault |
| Change XML | Related corrective implementation |
| Monitoring evidence | Technical validation |
| Logs | Technical evidence |
| Email (.eml) | Supporting communications |
| Teams Export | Investigation discussions |
| Analyst Notes | Supplementary evidence |

---

## Required Evidence

Each supplied evidence source shall be classified using the Evidence States model defined in OAS-000 §8.

| State | Meaning |
|---------|----------|
| Present | Available and analysed |
| Referenced | Mentioned but not supplied |
| Missing | Expected but unavailable |
| Not Applicable | Not required |

Evidence limitations shall be documented.

---

## Analysis Methodology

Every Problem investigation shall follow the analytical lifecycle below, then the assessment phases.

```text
Evidence Inventory
        │
        ▼
Problem Context
        │
        ▼
Evidence Assessment
        │
        ▼
Investigation Assessment
        │
        ▼
Root Cause Assessment
        │
        ▼
Known Error Assessment
        │
        ▼
Corrective Action Assessment
        │
        ▼
Preventive Action Assessment
        │
        ▼
Related Record Correlation
        │
        ▼
Investigation Quality Assessment
        │
        ▼
Technical Conclusion Assessment
        │
        ▼
Executive Summary
```

### Phase 1 — Problem Context

Document:

- Problem Number
- Title
- Current State
- Priority
- Assignment
- Business Service
- Configuration Items
- Related Incidents
- Related Major Incidents

Determine whether the Problem accurately reflects the operational issues identified in previous analyses.

---

### Phase 2 — Evidence Assessment

Inventory all available evidence.

For each evidence source evaluate:

- Relevance
- Completeness
- Correlation
- Reliability
- Contribution to the investigation

Evidence shall be assessed without assuming authority based on source.

---

### Phase 3 — Investigation Assessment

Evaluate the investigation itself.

Assessment areas include:

- Scope
- Investigation planning
- SME engagement
- Technical analysis
- Vendor engagement
- Supporting documentation
- Investigation traceability

Determine whether the investigation has been conducted with sufficient rigour.

---

### Phase 4 — Root Cause Assessment

Evaluate the stated Root Cause.

Determine whether it is:

- Supported
- Partially Supported
- Not Supported
- Unable to Determine

Document:

- Supporting evidence
- Contradictory evidence
- Evidence limitations
- Confidence

---

### Phase 5 — Known Error Assessment

Assess:

- Has a Known Error been identified?
- Is it adequately documented?
- Is supporting evidence available?
- Is the failure condition clearly described?
- Is the operational impact understood?
- Is future reuse likely?

---

### Phase 6 — Corrective Action Assessment

Corrective Actions shall be evaluated across three domains.

#### People

Evaluate:

- Skills
- Competencies
- Knowledge transfer
- Training
- Roles and responsibilities
- Resource capability

#### Process

Evaluate:

- Governance
- Procedures
- Operational controls
- Documentation
- Approvals
- Compliance

#### Technology

Evaluate:

- Infrastructure
- Applications
- Configuration
- Monitoring
- Automation
- Vendor products
- Platform improvements

For every Corrective Action assess:

- Relevance
- Ownership
- Feasibility
- Traceability
- Expected effectiveness

---

### Phase 7 — Preventive Action Assessment

Preventive Actions shall use the same People / Process / Technology framework.

Assess:

- Recurrence reduction
- Ownership
- Measurability
- Governance
- Sustainability
- Operational effectiveness

---

### Phase 8 — Service Improvement Review (SIR)

If SIR documentation is available evaluate:

- Evidence reviewed
- Decisions reached
- Executive Sponsor involvement
- Action ownership
- Governance outcomes
- Follow-up actions

If no SIR evidence is supplied:

Record as:

**Not Assessed**

---

### Phase 9 — Problem State Assessment

Adjust the analytical focus according to the Problem lifecycle state.

| State | Analytical Focus |
|---------|-----------------|
| New | Problem definition and evidence collection |
| In Progress | Investigation quality |
| Pending Review | Conclusion validation |
| Pending Preventive Action | Action assessment |
| Verification | Effectiveness validation |
| Closed | Final investigation assessment |

---

### Phase 10 — Related Record Correlation

Correlate findings with:

- Incidents
- Major Incidents
- Changes
- Vendor cases
- Known Errors
- Configuration Items
- Post Incident/Implementation Reviews (PIRs), where available

Identify:

- Supporting evidence
- Contradictory evidence
- Missing evidence
- New findings

---

### Phase 11 — Investigation Quality Assessment

Evaluate the investigation independently from technical conclusions.

| Area | Assessment |
|------|------------|
| Scope | |
| Evidence Collection | |
| Technical Analysis | |
| Documentation | |
| SME Engagement | |
| Governance | |
| Traceability | |

Overall Rating:

- Excellent
- Good
- Adequate
- Poor

Provide supporting rationale.

---

### Phase 12 — Technical Conclusion Assessment

Determine whether available evidence supports:

- Root Cause
- Known Error
- Corrective Actions
- Preventive Actions

Possible outcomes:

- Fully Supported
- Partially Supported
- Insufficient Evidence
- Contradicted by Evidence

Every conclusion shall reference supporting evidence.

---

### Phase 13 — Risk of Recurrence

Evaluate residual operational risk.

Consider:

- Outstanding technical issues
- Incomplete actions
- Governance gaps
- Monitoring gaps
- Vendor dependencies
- Operational risks

Document residual risk and rationale.

---

## Findings (Analyst Conclusion)

Summarise:

- Investigation completeness
- Root Cause support
- Known Error quality
- Corrective Action assessment
- Preventive Action assessment
- Outstanding evidence
- Residual risks
- Additional investigation required
- Overall confidence

The conclusion shall distinguish confirmed findings from evidence limitations.

---

## Confidence Assessment

Assign confidence to significant conclusions using the OAS-000 Confidence Model (§10):

| Rating | Description |
|---------|-------------|
| High | Supported by multiple evidence sources |
| Moderate | Supported by one authoritative evidence source |
| Low | Limited supporting evidence |
| Unknown | Insufficient evidence |

Confidence shall never be implied. Root Cause, Known Error, Corrective, and Preventive conclusions shall each carry an explicit confidence rating.

---

## Recommendations

Recommendations shall:

- Improve investigation quality.
- Improve governance.
- Improve Corrective Actions.
- Improve Preventive Actions.
- Improve operational resilience.

Recommendations shall be evidence based.

---

## Quality Assurance Checklist

Before finalising verify:

- [ ] Evidence inventoried (and states classified)
- [ ] Related analyses reviewed (OAS-101 / OAS-201)
- [ ] Root Cause assessed
- [ ] Known Error assessed
- [ ] Corrective Actions assessed
- [ ] Preventive Actions assessed
- [ ] SIR reviewed (if available)
- [ ] Related records correlated
- [ ] Confidence assigned
- [ ] Recommendations evidence-based

---

## AI Operating Standard

When analysing a Problem investigation:

1. Inventory all evidence (classify Evidence States).
2. Inherit established operational facts from OAS-101.
3. Inherit the operational narrative from OAS-201.
4. Evaluate the investigation independently.
5. Assess Root Cause against evidence.
6. Assess Known Error against evidence.
7. Assess Corrective and Preventive Actions.
8. Correlate related records.
9. Identify unsupported conclusions.
10. Assign confidence to conclusions.
11. Produce an evidence-based executive assessment.

Never assume documented conclusions are correct.

Never infer technical findings that are unsupported by evidence.

Explicitly document uncertainty where evidence is incomplete.

---

## Related Standards

- OAS-000 Operational Analysis Standard Governance
- OAS-101 Incident Analysis Methodology
- OAS-201 Major Incident Communications Methodology
- OAS-401 Change Analysis Methodology
- OAS-501 Operational Knowledge Standard

---

## Related Knowledge Base

- OAS-KB-001 Operational Knowledge Templates (planned)
- OAS-KB-002 Analysis Checklists (planned)

---

## Revision History

| Version | Date | Summary | Author | Reviewer |
|----------|------|---------|---------|----------|
| 1.0 | 2026-07-23 | Initial approved release (restructured to Standard Document Structure; cross-references corrected) | | |

---

## Future Revision Register

| ID | Status | Priority | Proposed Version | Enhancement |
|----|--------|----------|------------------|-------------|
| OAS301-001 | Proposed | Medium | 1.1 | Investigation Evidence Traceability Matrix (map conclusions to supporting evidence) |
| OAS301-002 | Proposed | Low | 1.1 | Standardised Root Cause Confidence Templates |
| OAS301-003 | Proposed | Low | 1.2 | PIR Integration Guidance (when OAS-601 is authorised) |

---

End of Standard
