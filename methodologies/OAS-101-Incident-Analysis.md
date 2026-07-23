---
document_id: OAS-101
title: Incident Analysis Methodology
category: Analysis Methodology
version: 1.0
status: Approved
owner: Operations
classification: Internal
parent: OAS-000
related:
  - OAS-201
  - OAS-301
  - OAS-401
  - OAS-501
review_cycle: Annual
---

# OAS-101 Incident Analysis Methodology

## Purpose

The Incident Analysis Methodology establishes a structured, evidence-based approach for analysing operational incidents to determine what occurred, how the incident was managed, the operational impact, and opportunities for continual improvement.

The methodology evaluates the operational response to an incident using documented evidence while preserving traceability between observations, findings, and recommendations.

This methodology focuses on **incident management**.

It does not perform detailed Root Cause Analysis (OAS-301), evaluate Major Incident communications (OAS-201), or assess Change implementation quality (OAS-401).

---

# Scope

This methodology applies to ServiceNow Incident records and equivalent ITSM Incident records.

The methodology evaluates:

- Incident chronology
- Operational response
- Service restoration
- Impact assessment
- Governance observations
- Evidence quality
- Operational findings
- Recommendations
- Lessons learned

Where related records exist, they may be used to enrich the analysis but shall not replace the Incident record as the primary evidence source.

---

# Guiding Principles

Incident analysis shall:

- Be evidence based.
- Preserve chronological accuracy.
- Evaluate operational actions objectively.
- Distinguish observations from conclusions.
- Clearly identify evidence limitations.
- Produce practical recommendations for continual improvement.

---

# Inputs

## Mandatory

- Incident XML

---

## Optional Supporting Evidence

- Problem XML
- Change XML
- Major Incident XML
- Email (.eml)
- Timeline documents
- Bridge notes
- Teams chat exports
- Vendor communications
- Knowledge articles
- Supporting work notes

---

# Required Evidence

Review available evidence including:

- Incident metadata
- Assignment history
- Work notes
- State transitions
- Impact and urgency
- Priority
- Configuration Items
- Service information
- Resolution details
- Closure information
- Related records

Every evidence source listed above shall be classified using the Evidence States model defined in OAS-000 §8 — **Present**, **Referenced**, **Missing**, or **Not Applicable**. Unavailable evidence that may influence analytical confidence shall be recorded explicitly rather than assumed.

---

# Analysis Methodology

## Phase 1 — Incident Context

Establish:

- Business service affected
- Configuration Item(s)
- Business impact
- Technical impact
- Priority
- Severity
- Users or services affected

Confirm the operational context before assessing response activities.

---

## Phase 2 — Timeline Reconstruction

Reconstruct the incident timeline using available evidence.

Include:

- Detection
- Logging
- Assignment
- Escalation
- Investigation
- Mitigation
- Restoration
- Resolution
- Closure

Chronology shall be evidence based.

Where timestamps conflict, identify the discrepancy.

---

## Phase 3 — Operational Response

Evaluate the effectiveness of the operational response.

Assess:

- Ownership
- Assignment progression
- Escalation
- Investigation activities
- Coordination
- Technical actions
- Service restoration activities

The objective is to determine how effectively the incident was managed rather than whether the technical solution was correct.

---

## Phase 4 — Impact Assessment

Assess:

- Business impact
- Service impact
- Customer impact
- Duration
- Scope
- Operational disruption

Confirm whether recorded impact accurately reflects available evidence.

---

## Phase 5 — Evidence Quality

Evaluate the quality of the Incident record.

Assess:

- Completeness
- Chronological consistency
- Work note quality
- Technical detail
- Resolution documentation
- Closure documentation

Incomplete documentation shall be identified as an evidence limitation rather than interpreted as operational failure.

---

## Phase 6 — Related Record Assessment

Where available, evaluate related records for consistency.

### Problem

Confirm whether:

- Root cause investigation exists.
- Problem references align with the Incident.

### Change

Confirm whether:

- Incident resulted from a Change.
- Corrective Change implemented.
- Related Change references are consistent.

### Major Incident

Where the Incident formed part of a Major Incident:

Confirm consistency between Incident chronology and Major Incident records.

Detailed communications assessment remains within OAS-201.

---

## Phase 7 — Governance Observations

Assess governance-related observations including:

- Assignment practices
- Escalation practices
- Documentation quality
- Ownership
- Record maintenance
- Operational compliance

Do not assess process compliance beyond the available evidence.

---

# Findings

Identify:

- Operational strengths
- Operational weaknesses
- Governance observations
- Risks
- Positive practices

Separate factual observations from analytical conclusions.

---

# Confidence Assessment

Assign a confidence rating to every significant finding using the OAS-000 Confidence Model (§10):

| Rating | Description |
|--------|-------------|
| High | Supported by multiple independent evidence sources |
| Moderate | Supported by one authoritative source |
| Low | Limited supporting evidence |
| Unknown | Evidence unavailable |

Confidence shall never be implied. Where evidence is limited or contradictory, record the affected findings as **Low** or **Unknown** and state the reason explicitly. The confidence assessment shall be reflected in the analysis outputs (OAS-000 §16).

---

# Recommendations

Recommendations shall be:

- Evidence based
- Practical
- Actionable
- Prioritised where appropriate

Typical categories include:

- Operational improvements
- Documentation improvements
- Escalation improvements
- Monitoring improvements
- Knowledge improvements
- Automation opportunities

Where recommendations require Root Cause Analysis or Change implementation, reference OAS-301 or OAS-401 respectively.

---

# Lessons Learned

Capture lessons that improve future Incident Management.

Lessons may include:

- Detection
- Triage
- Investigation
- Escalation
- Restoration
- Coordination
- Documentation
- Operational governance

Lessons shall be supported by evidence and written to improve future operational performance.

---

# Quality Assurance Checklist

Before completing the analysis verify:

- [ ] Operational context established
- [ ] Timeline reconstructed
- [ ] Required evidence reviewed (and states classified)
- [ ] Operational response assessed
- [ ] Impact assessed
- [ ] Evidence quality evaluated
- [ ] Related records considered where available
- [ ] Governance observations documented
- [ ] Findings supported by evidence
- [ ] Confidence assigned to findings
- [ ] Recommendations evidence based
- [ ] Lessons Learned documented

---

# AI Operating Standard

When analysing an Incident:

1. Establish operational context.
2. Reconstruct the incident timeline.
3. Validate evidence completeness (classify Evidence States).
4. Assess operational response.
5. Evaluate business and technical impact.
6. Assess documentation quality.
7. Consider related records where available.
8. Distinguish observations from findings.
9. Assign confidence to findings.
10. Produce evidence-based recommendations.
11. Capture actionable Lessons Learned.

The AI shall not infer root cause without supporting evidence and shall explicitly identify where evidence is incomplete or unavailable.

---

# Related Standards

- OAS-000 Operational Analysis Standard Governance
- OAS-201 Major Incident Communications Methodology
- OAS-301 Problem Analysis Methodology
- OAS-401 Change Analysis Methodology
- OAS-501 Operational Knowledge Standard

---

# Related Knowledge Base

- OAS-KB-001 Operational Knowledge Templates (planned)
- OAS-KB-002 Analysis Checklists (planned)

---

# Revision History

| Version | Date | Summary | Author | Reviewer |
|----------|------|---------|---------|----------|
| 1.0 | 2026-07-23 | Initial approved release | | |

---

# Future Revision Register

| ID | Status | Priority | Proposed Version | Enhancement |
|----|--------|----------|------------------|-------------|
| OAS101-001 | Proposed | Medium | 1.1 | Incident Detection Assessment Framework |
| OAS101-002 | Proposed | Medium | 1.1 | Incident Documentation Quality Guidance |
| OAS101-003 | Proposed | Low | 1.2 | Operational Readiness Assessment |
| OAS101-004 | Proposed | Low | 1.2 | Incident Timeline Visualisation Standard |

---

End of Standard
