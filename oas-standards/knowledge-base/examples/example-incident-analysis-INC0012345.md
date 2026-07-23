# Incident Analysis — INC0012345

> Illustrative example for **OAS-101**. Uses OAS-KB-003 report templates.

## Evidence Manifest

| # | Artefact | Type | State | Notes |
|---|----------|------|-------|-------|
| 1 | INC0012345.xml | Primary Record | Present | Checkout 500 errors |
| 2 | CHG001122.xml | Related Record | Present | Deploy at 02:30 |
| 3 | Update1.eml / Update2.eml | Communication | Present | Customer + exec updates |
| 4 | app-logs.zip | Monitoring/Logs | Present | Pool exhaustion signature |
| 5 | Vendor RCA | Vendor Record | Referenced | Promised, not supplied |

## Timeline

| Time | Event | Source |
|------|-------|--------|
| 02:14 | Incident opened (alert) | `sys_created_on` |
| 02:15 | Detection | Monitoring alert |
| 02:16 | Assigned to NOC | Assignment history |
| 02:40 | Reassigned to App team (rationale noted) | Work notes |
| 02:55 | Major Incident declared | State transition |
| 03:30 | Workaround deployed (restore) | Work notes |
| 05:10 | Root cause fixed via CHG001122 | Change record |
| 06:00 | Incident closed | Closure info |

No timestamp conflicts identified.

## Current State

Service restored; root cause remediated; Known Error published.

## Operational Findings

- **F1 (Fact):** Checkout returned 500 errors from 02:14.
- **F2 (Observation):** One reassignment (NOC→App) with documented rationale.
- **F3 (Inference):** Major Incident declared 41 min after opening — escalation slower than customer impact warranted.
- **F4 (Fact):** Workaround achieved restoration at 03:30; full resolution at 05:10.

## Business Findings

Customer-facing checkout degradation for ~3 hours; revenue impact during peak; two
customer notifications sent (03:10, 06:45).

## Evidence Matrix

| # | Conclusion | Classification | Evidence | Confidence |
|---|-----------|----------------|----------|------------|
| C1 | Fault caused by CHG001122 | Inference | Deploy time ≈ fault onset; log signature | High |
| C2 | Escalation delayed | Fact | Work notes + SITREP | High |
| C3 | Customer comms adequate | Hypothesis | No survey; cadence gap 03:10→06:45 | Low |

## Confidence Assessment

High for response and causality; **Low** for customer-comms adequacy (no direct evidence).

## Outstanding Questions

- Was the 40-minute escalation delay within policy?
- Did the customer-comms cadence meet the SLA?

## Recommendations

| ID | Recommendation | Category | Priority |
|----|----------------|----------|----------|
| R1 | Auto-declare Major Incident when checkout error rate > 5% | Monitoring | High |
| R2 | Link CHG001122 to INC0012345 at deployment | Governance | Medium |

## Next Required Evidence

- Vendor RCA (referenced, not supplied)
- Customer communication SLA definition

## Executive Summary

**INC0012345** caused ~3 hours of checkout degradation after a 02:30 deployment
(CHG001122). Response was operationally sound with a clear owner and timely workaround,
but Major Incident escalation lagged customer impact by ~40 minutes. Confidence: **High**
for cause and response; **Low** for customer-comms adequacy pending SLA evidence. Top
actions: automated SEV declaration and deployment-to-incident linkage.

---

*End of example.*
