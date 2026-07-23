---
document_id: OAS-KB-002
title: Analysis Checklists
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

# OAS-KB-002 Analysis Checklists

## Purpose

Consolidated, copy-pasteable checklists derived from the Quality Assurance Checklists in
the OAS methodologies. Use the relevant checklist(s) before publishing any analysis. These
are implementation aids; the authoritative requirements remain in the methodologies.

---

## A. Evidence Manifest Checklist (all analyses — OAS-000 §15/§16)

- [ ] Primary record identified and attached
- [ ] Related records listed (Incidents, Problems, Changes, Major Incidents)
- [ ] Communications attached (.eml, SITREPs, bridge notes, chat exports)
- [ ] Supporting evidence attached (logs, monitoring, vendor RCA)
- [ ] Every evidence source classified: Present / Referenced / Missing / Not Applicable
- [ ] Missing evidence recorded with reason and confidence impact

---

## B. OAS-101 Incident Analysis Checklist

- [ ] Operational context established (service, CI, impact, priority, severity)
- [ ] Timeline reconstructed and timestamp conflicts reconciled
- [ ] Required evidence reviewed (states classified)
- [ ] Operational response assessed (ownership, assignment, escalation, coordination)
- [ ] Impact assessed (recorded vs actual)
- [ ] Evidence quality evaluated (treated as limitation, not failure)
- [ ] Related records considered (Problem / Change / Major Incident)
- [ ] Governance observations documented
- [ ] Findings supported by evidence and classified
- [ ] Confidence assigned to findings
- [ ] Recommendations evidence based and prioritised
- [ ] Lessons Learned documented

---

## C. OAS-201 Major Incident Communications Checklist

- [ ] Major Incident context established (impact, duration, stakeholders, objectives)
- [ ] Communication timeline reconstructed
- [ ] Required evidence reviewed (states classified)
- [ ] Communication quality assessed (accuracy, clarity, consistency, relevance, actionability)
- [ ] Timeliness evaluated (initial, cadence, resolution, closure)
- [ ] Stakeholder communications assessed (ops, exec, customer, vendor)
- [ ] MIM handovers reviewed for continuity only (not individual performance)
- [ ] Governance evaluated (audience ID, approvals, terminology, ownership, channels)
- [ ] Findings evidence based
- [ ] Confidence assigned to findings
- [ ] Recommendations supported by evidence
- [ ] Lessons for Communication documented

---

## D. OAS-301 Problem Analysis Checklist

- [ ] Evidence inventoried (states classified)
- [ ] Related analyses reviewed (OAS-101 / OAS-201)
- [ ] Root Cause assessed (Supported / Partially / Not / Unable)
- [ ] Known Error assessed (identified, documented, evidence, reuse likely)
- [ ] Corrective Actions assessed (People / Process / Technology; relevance, ownership, feasibility, traceability)
- [ ] Preventive Actions assessed (same P/P/T framework)
- [ ] SIR reviewed (if available)
- [ ] Related records correlated
- [ ] Investigation Quality rated (Excellent/Good/Adequate/Poor) with rationale
- [ ] Technical conclusions assessed (Fully/Partially/Insufficient/Contradicted)
- [ ] Risk of recurrence evaluated
- [ ] Confidence assigned to every conclusion
- [ ] Recommendations evidence based

---

## E. OAS-401 Change Analysis Checklist

- [ ] Change intent established (401A Planned / 401B Remediation)
- [ ] Required evidence reviewed (states classified)
- [ ] Planning assessed (scope, success criteria, risk, testing, validation, rollback, comms, resources)
- [ ] Risk evaluated and appropriateness judged (Low/Medium/High/Significant)
- [ ] Change Type confirmed appropriate (Standard/Normal/Emergency)
- [ ] Rollback symmetry evaluated (planning vs rollback detail)
- [ ] Recoverability assessed independently of success
- [ ] Operational validation completed (technical, functional, service, monitoring, business)
- [ ] Success classification reviewed (Successful/Partial/Unsuccessful/Unconfirmed)
- [ ] Related records considered (OAS-101 / OAS-301 consistency)
- [ ] Findings evidence based
- [ ] Confidence assigned to findings
- [ ] Recommendations supported by evidence

---

## F. Universal Publication Gate (OAS-000 §17)

- [ ] Evidence inventory complete and states classified
- [ ] Metadata extracted from primary record
- [ ] Timeline validated
- [ ] Facts separated from assumptions
- [ ] Confidence assigned to every significant finding
- [ ] Evidence gaps identified and recorded
- [ ] Recommendations evidence based
- [ ] Executive summary completed
- [ ] Cross-references verified
- [ ] Human validation recorded

---

*End of OAS-KB-002.*
