# Change Analysis — CHG001122

> Illustrative example for **OAS-401**. Uses OAS-KB-003 report templates.

## Evidence Manifest

| # | Artefact | Type | State | Notes |
|---|----------|------|-------|-------|
| 1 | CHG001122.xml | Primary Record | Present | Deploy ordersvc v4.2 |
| 2 | INC0012345.xml | Related Incident | Present | Triggered outage |
| 3 | PRB000789.xml | Related Problem | Present | Corrective context |
| 4 | CAB notes | Governance | Present | Approval record |
| 5 | Validation evidence | Test/Monitor | Present | Health checks passed post-fix |

## Context

- **Intent:** 401B Operational Remediation (resolves INC0012345 / PRB000789).
- **Business objective:** Restore stable checkout.
- **Technical objective:** Deploy pool-limit fix.
- **Service impact:** Customer-facing; required maintenance window.

## Planning Integrity

- Scope defined; success criteria documented (error rate < 0.1%).
- Risk identified but **recorded as Medium** — under-classified for a customer-facing
  change with no tested rollback.
- Testing: unit + staging passed; production rollback **not** validated.
- Rollback: one line ("rollback if needed") — asymmetric with a 12-step plan.

## Risk Assessment

Recorded **Medium**; actual implementation risk was **High** given customer impact and
missing rollback validation. **Finding:** risk under-classified.

## Change Classification

**Normal** change — appropriate (novel fix, needed CAB approval).

## Implementation Assessment

Deployed 02:30; incident began 02:40 (causality supported, Moderate). Deviations: none
recorded (good). Schedule adhered.

## Rollback Symmetry

**Asymmetric.** Comprehensive implementation plan vs minimal rollback. Documented as an
operational risk.

## Recoverability

Recovery achieved via workaround + permanent fix; however, formal recoverability was not
validated pre-change. Assessed **independently** as Moderate.

## Operational Validation

Health checks passed post-fix; error rate returned to < 0.1%; business confirmed.
Successful outcome supported by evidence.

## Success Classification

Recorded **Successful**; evidence agrees. No change to official classification needed.

## Findings

- **Strengths:** Clear intent; traceable to incident; outcome validated.
- **Weaknesses:** Risk under-classified; rollback asymmetric; recovery unvalidated.
- **Risk:** Future similar changes inherit the same rollback gap.

## Confidence Assessment

| Finding | Confidence |
|---------|------------|
| Outcome successful | High |
| Causality to INC0012345 | Moderate |
| Risk under-classified | High |
| Rollback gap | High |

## Recommendations

| ID | Recommendation | Category | Priority |
|----|----------------|----------|----------|
| R1 | Require validated rollback for all customer-facing changes | Rollback | High |
| R2 | Reclassify risk using customer-impact rubric | Risk | Medium |

## Lessons Learned

- Planning: risk rubric must include customer impact.
- Recoverability: validate recovery before, not after.
- Governance: CAB should challenge absent rollback validation.

## Executive Summary

**CHG001122** achieved its outcome (stable checkout restored, validated), but planning,
risk classification, and rollback symmetry were weak: a customer-facing change shipped
with an unvalidated, one-line rollback. Confidence: **High** for outcome, **Moderate** for
causality. Top action: mandate validated rollback for customer-facing changes.

---

*End of example.*
