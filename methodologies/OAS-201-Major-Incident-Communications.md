---
document_id: OAS-201
title: Major Incident Communications Methodology
category: Analysis Methodology
version: 1.0
status: Approved
owner: Operations
classification: Internal
parent: OAS-000
related:
  - OAS-101
  - OAS-301
  - OAS-501
review_cycle: Annual
---

# OAS-201 Major Incident Communications Methodology

## Purpose

The Major Incident Communications Methodology establishes a structured, evidence-based approach for evaluating communications throughout the lifecycle of a Major Incident.

The methodology assesses the effectiveness, timeliness, consistency, clarity, and governance of communications provided to operational teams, stakeholders, customers, and executives.

This methodology evaluates **how the incident was communicated**, not how the technical incident was resolved.

Technical analysis remains within OAS-101 and OAS-301.

---

# Scope

This methodology applies to Major Incidents managed through ServiceNow or equivalent ITSM platforms.

It evaluates communications generated throughout the Major Incident lifecycle including:

- Operational updates
- Executive communications
- Customer notifications
- Vendor communications
- Major Incident bridge activities
- Major Incident Manager (MIM) handovers
- Timeline documentation

---

# Guiding Principles

Major Incident communications shall:

- Be evidence based.
- Maintain an accurate operational narrative.
- Support informed decision making.
- Provide appropriate stakeholder awareness.
- Balance technical accuracy with audience suitability.
- Remain timely, consistent, and actionable.

---

# Inputs

## Mandatory

- Major Incident XML

---

## Optional Supporting Evidence

- Situation Reports (SITREPs)
- Executive Updates (.eml)
- Customer Notifications (.eml)
- Vendor Communications
- Email (.eml)
- Teams Chat Exports
- Bridge Notes
- Timeline Documents

Where timeline documentation is unavailable, the Major Incident XML shall be used to reconstruct the operational timeline.

---

# Required Evidence

Review available evidence including:

- Major Incident metadata
- Timeline
- Work notes
- Communication records
- Stakeholder updates
- Email communications
- Bridge notes
- Teams conversations
- Vendor communications
- Related Incident references

Every evidence source listed above shall be classified using the Evidence States model defined in OAS-000 §8 — **Present**, **Referenced**, **Missing**, or **Not Applicable**. Unavailable evidence that may influence analytical confidence shall be recorded explicitly.

---

# Analysis Methodology

## Phase 1 — Context

Establish:

- Business impact
- Service impact
- Incident duration
- Stakeholder groups
- Communication objectives

---

## Phase 2 — Communication Timeline

Construct the communication timeline.

Assess:

- Initial notification
- Escalations
- Operational updates
- Executive updates
- Customer communications
- Resolution notification
- Closure communication

Timeline reconstruction shall use all available evidence.

---

## Phase 3 — Communication Quality

Assess:

- Accuracy
- Clarity
- Consistency
- Relevance
- Audience suitability
- Actionability

Distinguish confirmed information from assumptions.

---

## Phase 4 — Timeliness

Evaluate:

- Initial notification timing
- Update frequency
- Executive briefing cadence
- Customer notification timing
- Resolution communication timing

Assess whether communications supported effective operational awareness.

---

## Phase 5 — Stakeholder Communications

Evaluate communications provided to:

### Operational Teams

Assess:

- Technical clarity
- Actionability
- Coordination
- Escalation effectiveness

### Executives

Assess:

- Business impact
- Risk communication
- Decision support
- Clarity
- Appropriate technical abstraction

### Customers

Assess:

- Transparency
- Clarity
- Timeliness
- Expectation management

### Vendors

Where vendor communications are available evaluate:

- Escalation effectiveness
- Information exchange
- Coordination
- Follow-up

---

## Phase 6 — Major Incident Manager (MIM) Handovers

Where MIM handovers occurred, evaluate only the effectiveness of operational continuity.

Assess:

- Continuity of incident narrative
- Continuity of stakeholder awareness
- Preservation of key decisions
- Continuity of communication cadence

Do not assess individual MIM performance.

Actions performed by successive MIMs should be evaluated through subsequent communications and work notes rather than the handover event itself.

---

## Phase 7 — Communication Governance

Assess whether communications demonstrated appropriate governance.

Examples include:

- Audience identification
- Communication approvals where applicable
- Consistent terminology
- Clear ownership
- Appropriate communication channels

---

## Phase 8 — Communication Effectiveness

Evaluate overall effectiveness.

Consider:

- Stakeholder confidence
- Operational awareness
- Decision support
- Communication consistency
- Communication continuity

---

# Findings

Identify:

- Communication strengths
- Communication weaknesses
- Governance observations
- Risks
- Positive practices

Separate observations from conclusions.

---

# Confidence Assessment

Assign a confidence rating to every significant finding using the OAS-000 Confidence Model (§10):

| Rating | Description |
|--------|-------------|
| High | Supported by multiple independent evidence sources |
| Moderate | Supported by one authoritative source |
| Low | Limited supporting evidence |
| Unknown | Evidence unavailable |

Confidence shall never be implied. Where communication evidence is limited or contradictory, record the affected findings as **Low** or **Unknown** and state the reason explicitly. The confidence assessment shall be reflected in the analysis outputs (OAS-000 §16).

---

# Recommendations

Recommendations shall be evidence based.

Typical categories include:

- Notification improvements
- Stakeholder management
- Executive communications
- Customer communications
- Communication governance
- Timeline management
- Documentation improvements

---

# Lessons for Communication

Capture lessons that improve future Major Incident communications.

Lessons may include:

- Communication timing
- Audience targeting
- Update cadence
- Message consistency
- Escalation practices
- Executive engagement
- Customer engagement
- Communication governance

Lessons shall be specific, actionable, and supported by evidence.

---

# Quality Assurance Checklist

Before completing the analysis verify:

- [ ] Major Incident context established
- [ ] Timeline reconstructed
- [ ] Required evidence reviewed (and states classified)
- [ ] Communication quality assessed
- [ ] Timeliness evaluated
- [ ] Stakeholder communications assessed
- [ ] MIM handovers reviewed where applicable
- [ ] Governance evaluated
- [ ] Findings evidence based
- [ ] Confidence assigned to findings
- [ ] Recommendations supported by evidence
- [ ] Lessons for Communication documented

---

# AI Operating Standard

When analysing Major Incident communications:

1. Establish incident context.
2. Reconstruct the communication timeline.
3. Validate evidence completeness (classify Evidence States).
4. Assess communication quality.
5. Evaluate communication timeliness.
6. Assess stakeholder-specific communications.
7. Evaluate MIM handovers for continuity only.
8. Assess governance and communication effectiveness.
9. Assign confidence to findings.
10. Produce evidence-based findings.
11. Capture actionable Lessons for Communication.

The AI shall distinguish factual communications from inferred intent and explicitly identify where evidence is incomplete.

---

# Related Standards

- OAS-000 Operational Analysis Standard Governance
- OAS-101 Incident Analysis Methodology
- OAS-301 Problem Analysis Methodology
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
| OAS201-001 | Proposed | Medium | 1.1 | Communication Effectiveness Indicators |
| OAS201-002 | Proposed | Medium | 1.1 | Stakeholder Communication Matrix |
| OAS201-003 | Proposed | Low | 1.2 | Executive Communication Guidance |
| OAS201-004 | Proposed | Low | 1.2 | Communication Timeline Visualisation Standard |

---

End of Standard
