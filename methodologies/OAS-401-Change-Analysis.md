---
document_id: OAS-401
title: Change Analysis Methodology
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

# OAS-401 Change Analysis Methodology

## Purpose

The Change Analysis Methodology establishes a structured, evidence-based approach for evaluating the planning, execution, governance, operational effectiveness, and outcomes of Change records.

The methodology supports both:

- Planned enhancements and new capabilities.
- Operational remediation resulting from Incidents or Problems.

The objective is to determine whether a Change achieved its intended outcome while maintaining service stability and adhering to organisational governance.

---

# Scope

This methodology applies to ServiceNow Change records including:

- Standard Changes
- Normal Changes
- Emergency Changes

It evaluates the Change itself rather than the organisational Change Management process.

---

# Guiding Principles

Change analysis shall:

- Be evidence based.
- Consider operational context.
- Evaluate planning and execution equally.
- Distinguish implementation success from business outcome.
- Identify opportunities for continual improvement.
- Preserve traceability to supporting evidence.

---

# Supported Change Intent

Changes should first be classified according to operational intent.

## 401A – Planned Enhancement

Examples include:

- New functionality
- Platform enhancement
- Infrastructure improvement
- Planned maintenance
- Technical debt reduction
- Service optimisation

These are typically implemented as **Normal Changes**.

---

## 401B – Operational Remediation

Changes introduced in response to operational events including:

- Incident remediation
- Major Incident recovery
- Problem corrective actions
- Preventive improvements
- Risk reduction

Operational remediation should be evaluated alongside related Incident and Problem records where available.

---

# Inputs

## Mandatory

- Change XML

---

## Optional Supporting Evidence

- Incident XML
- Major Incident XML
- Problem XML
- CAB notes
- Implementation plans
- Test evidence
- Validation evidence
- Rollback plan
- PIR documentation
- Vendor documentation
- Email (.eml)
- Timeline documents

---

# Required Evidence

Assess available evidence including:

- Change metadata
- Approval history
- Risk classification
- Change type
- Planned implementation window
- Actual implementation activities
- Validation activities
- Rollback planning
- Work notes
- Related records
- Closure information

Every evidence source listed above shall be classified using the Evidence States model defined in OAS-000 §8 — **Present**, **Referenced**, **Missing**, or **Not Applicable**. Unavailable evidence that may influence analytical confidence shall be documented explicitly.

---

# Analysis Methodology

## Phase 1 — Context

Establish:

- Business objective
- Technical objective
- Change intent
- Related operational events
- Service impact

---

## Phase 2 — Planning Integrity

Evaluate planning quality.

Assess:

- Scope clearly defined
- Success criteria documented
- Risk identified
- Testing completed
- Validation planned
- Rollback defined
- Communications planned
- Resource planning

Planning deficiencies should be identified separately from execution issues.

---

## Phase 3 — Risk Assessment

Evaluate whether the assigned Change Risk accurately reflected the implementation.

Approved organisational risk classifications:

- Low
- Medium
- High
- Significant

Assess:

- Risk identification
- Risk treatment
- Residual operational risk
- Actual implementation risk

Where risk appears inconsistent with implementation complexity or outcome, document the observation.

---

## Phase 4 — Change Classification

Verify the assigned Change Type.

Approved classifications:

- Standard
- Normal
- Emergency

Assess whether the selected Change Type appropriately reflected the nature and urgency of the implementation.

---

## Phase 5 — Implementation Assessment

Evaluate execution.

Assess:

- Planned activities completed
- Implementation followed approved plan
- Deviations recorded
- Technical issues encountered
- Operational impacts
- Stakeholder communication
- Schedule adherence

---

## Phase 6 — Rollback Symmetry

Evaluate the relationship between implementation planning and rollback planning.

Rollback planning should demonstrate a level of detail proportionate to the implementation plan.

Assess:

- Rollback documented
- Rollback validated
- Rollback decision criteria defined
- Recovery activities documented
- Dependencies identified

Where implementation planning is comprehensive but rollback planning is minimal, document the imbalance as an operational risk.

---

## Phase 7 — Recoverability Assessment

Evaluate organisational ability to recover from implementation failure.

Assess:

- Recovery procedures
- Service restoration approach
- Configuration recovery
- Data recovery
- Communication during recovery

Recoverability should be considered independently of implementation success.

---

## Phase 8 — Operational Validation

Evaluate post-implementation verification.

Assess:

- Technical validation
- Functional validation
- Service validation
- Monitoring
- Business confirmation
- Closure evidence

Successful implementation should not be assumed solely because the Change record was closed.

---

## Phase 9 — Success Classification

Use the approved organisational classifications:

- Successful
- Partially Successful
- Unsuccessful
- Unconfirmed

If evidence suggests a different outcome than the recorded classification, document this as a recommendation rather than altering the official classification.

---

## Phase 10 — Related Record Assessment

Where available, evaluate consistency with:

- OAS-101 Incident Analysis
- OAS-301 Problem Analysis

Confirm that:

- Corrective actions align with identified root causes.
- Preventive improvements address recurrence risks.
- Related records remain consistent.

---

# Findings

Identify:

- Planning strengths
- Planning weaknesses
- Governance observations
- Technical observations
- Operational observations
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

Confidence shall never be implied. Where evidence is limited or contradictory, record the affected findings as **Low** or **Unknown** and state the reason explicitly. The confidence assessment shall be reflected in the analysis outputs (OAS-000 §16).

---

# Recommendations

Recommendations should be evidence based and prioritised.

Typical recommendation categories include:

- Planning improvements
- Testing improvements
- CAB governance
- Risk management
- Rollback planning
- Validation improvements
- Documentation improvements
- Operational readiness

---

# Lessons Learned

Capture lessons that improve future Changes.

Lessons should distinguish:

- Planning
- Governance
- Technical implementation
- Validation
- Recoverability
- Operational communication

---

# Quality Assurance Checklist

Before completing the analysis verify:

- [ ] Change intent established
- [ ] Required evidence reviewed (and states classified)
- [ ] Planning assessed
- [ ] Risk evaluated
- [ ] Change Type confirmed
- [ ] Rollback symmetry evaluated
- [ ] Recoverability assessed
- [ ] Operational validation completed
- [ ] Success classification reviewed
- [ ] Related records considered
- [ ] Findings evidence based
- [ ] Confidence assigned to findings
- [ ] Recommendations supported by evidence

---

# AI Operating Standard

When analysing a Change:

1. Establish operational context.
2. Validate evidence completeness (classify Evidence States).
3. Assess planning before execution.
4. Evaluate implementation objectively.
5. Assess rollback independently.
6. Assess recoverability independently.
7. Validate operational outcomes.
8. Distinguish observations from findings.
9. Assign confidence to findings.
10. Produce evidence-based recommendations.
11. Identify lessons learned.

The AI shall not infer successful implementation solely from record closure and shall explicitly identify limitations where evidence is incomplete.

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
| OAS401-001 | Proposed | Medium | 1.1 | Change Success Indicators Framework |
| OAS401-002 | Proposed | Medium | 1.1 | CAB Decision Quality Assessment |
| OAS401-003 | Proposed | Low | 1.2 | Implementation Maturity Model |
| OAS401-004 | Proposed | Low | 1.2 | Change Metrics Guidance |

---

End of Standard
