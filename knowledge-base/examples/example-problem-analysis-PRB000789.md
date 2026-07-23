# Problem Analysis — PRB000789

> Illustrative example for **OAS-301**. Uses OAS-KB-003 report templates.

## Evidence Manifest

| # | Artefact | Type | State | Notes |
|---|----------|------|-------|-------|
| 1 | PRB000789.xml | Primary Record | Present | Intermittent checkout 500s |
| 2 | INC0012345.xml | Related Incident | Present | Triggering incident |
| 3 | CHG001122.xml | Related Change | Present | Corrective action |
| 4 | app-logs.zip | Logs | Present | Pool saturation |
| 5 | APM export | Monitoring | Present | Thread contention |
| 6 | Vendor RCA | Vendor | Referenced | Not supplied |

## Problem Context

- **Title:** Intermittent checkout 500 errors.
- **State:** Closed (verification complete).
- **Priority:** 1.
- **CIs:** ordersvc, paymentsvc.
- **Related:** INC0012345, CHG001122.

## Investigation Assessment

Scope clear; SME (App team) engaged; technical analysis rigorous (logs + APM correlated).
Traceability good. **Rating: Good.**

## Root Cause Assessment

**Stated cause:** Connection pool exhaustion after config change removed pool limit.
**Support:** Logs show pool saturation; APM shows thread contention; CHG001122 removed the
limit at the fault onset.
**Verdict:** **Supported.** Confidence: **High.**

## Known Error Assessment

Known Error documented with workaround (scale pool temporarily). Workaround untested under
load → **Moderate** quality. Future reuse likely (symptom is distinctive).

## Corrective Action Assessment (P/P/T)

- **People:** Runbook updated for NOC (Relevant, Owned).
- **Process:** Pre-deploy config review added (Relevant, Owned).
- **Technology:** Rolled back CHG001122; permanent config fix deployed (Relevant,
  Traceable, Expected effectiveness High).

## Preventive Action Assessment

- **Technology:** Pre-deploy validation gate (addresses recurrence; Measurable).
- **Process:** Config-change guardrail in CAB (Sustainable).
- **People:** Training on pool sizing (Owned).

## Technical Conclusion Assessment

Root Cause: **Fully Supported.** Corrective: **Fully Supported.** Preventive: **Partially
Supported** (gate not yet implemented).

## Risk of Recurrence

**Medium** residual until the validation gate is implemented. Vendor dependency low.

## Findings (Analyst Conclusion)

Investigation well conducted; corrective actions strong; preventive action and Known Error
validation are the gaps. Overall confidence **High** for cause, **Moderate** for
completeness.

## Confidence Assessment

| Conclusion | Confidence |
|-----------|------------|
| Root cause = pool exhaustion | High |
| Corrective actions effective | High |
| Preventive action complete | Moderate (not implemented) |
| Known Error reusable | Moderate (workaround untested) |

## Recommendations

| ID | Recommendation | Category | Priority |
|----|----------------|----------|----------|
| R1 | Implement pre-deploy validation gate | Preventive | High |
| R2 | Load-test the Known Error workaround | Known Error | Medium |

## Next Required Evidence

- Vendor RCA (referenced).
- Post-gate implementation evidence.

## Executive Summary

**PRB000789** root cause (connection-pool exhaustion from a config change) is well
supported by logs and APM. Corrective actions are strong and traceable; the main gaps are
an unimplemented preventive gate and an untested Known Error workaround. Recurrence risk:
**Medium** until the gate ships. Confidence: **High** for cause, **Moderate** for
completeness.

---

*End of example.*
