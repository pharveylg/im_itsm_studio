---
document_id: OAS-501
title: Operational Knowledge Standard
category: Governance Standard
version: 1.1
status: Approved
owner: Operations
classification: Internal
parent: OAS-000
related:
  - OAS-KB-001
review_cycle: Annual
---

# OAS-501 Operational Knowledge Standard

## Purpose

The Operational Knowledge Standard establishes the governance, lifecycle, and quality requirements for operational documentation produced or maintained within the Operational Analysis Standard (OAS) framework.

Its purpose is to ensure operational knowledge is:

- **Accurate** — technically correct for the supported environment.
- **Complete** — sufficient to complete the intended activity.
- **Contextual** — clear about when and when not to use it.
- **Consistent** — uniform terminology, format, and structure.
- **Unambiguous** — a single clear interpretation.
- **Maintainable** — kept current with minimal friction.
- **Suitable for operational execution** — usable by the intended audience without the author present.

This standard complements existing organisational Knowledge Management practices and defines the expected quality and governance requirements for operational knowledge.

---

## Scope

This standard applies to operational documentation including, but not limited to:

- Knowledge Articles
- Standard Operating Procedures (SOPs)
- Runbooks
- Methods of Procedure (MOPs)
- Work Instructions
- Known Error Articles
- Troubleshooting Guides
- Operational Procedures
- Support Documentation
- Team Playbooks

**In scope:** documentation quality and lifecycle.

**Out of scope:** the Knowledge Management process itself, platform configuration, and content authoring tooling.

---

## Principles

Operational knowledge shall:

- Support safe and repeatable execution.
- Be written for the intended operational audience.
- Remain technically accurate.
- Be reviewed periodically.
- Be maintained throughout its lifecycle.
- Follow the approved organisational documentation style guide.

---

## Part A — Governance

# Operational Knowledge Lifecycle

```mermaid
flowchart LR
  D[Draft] --> TR[Technical Review]
  TR --> AP[Approval]
  AP --> PU[Published]
  PU --> MA[Maintenance]
  MA --> RT[Retired]
  RT --> AR[Archived]
```

All operational documentation shall progress through the following lifecycle.

```text
Draft → Technical Review → Approval → Published → Maintenance → Retired → Archived
```

Each stage shall have clearly defined ownership and completion criteria before progressing to the next lifecycle stage.

---

# Lifecycle Stages

## Draft

**Purpose:** Initial creation of operational knowledge.

**Minimum requirements:**

- Author identified
- Purpose defined
- Scope documented
- Initial technical content created

**Good practice:** Draft in a branch or draft workspace; do not publish until review is complete.

---

## Technical Review

**Purpose:** Verify technical correctness.

**Review activities:**

- Technical accuracy against the live environment
- Operational suitability for the intended audience
- Completeness of the procedure
- Consistency with related documents
- Clarity of instructions

**Exit criteria:** Reviewer confirms the document is technically correct and suitable, or returns it to Draft with specific changes.

---

## Approval

**Purpose:** Authorise publication.

Approval confirms that:

- Technical review has been completed.
- Required standards (including this standard and OAS-000) have been met.
- The document is suitable for operational use.

Approval is recorded with name, date, and version.

---

## Published

**Purpose:** Make the document available for operational use.

Published documents become the current operational reference. Only one version should be current for a given topic.

---

## Maintenance

**Purpose:** Maintain technical accuracy throughout the document lifecycle.

**Triggers:**

- Periodic review date reached
- Product or service change
- Process change
- Identified inaccuracy
- Incident revealing a documentation gap

Maintenance produces a new version with a revision note.

---

## Retired

**Purpose:** Withdraw the document from operational use.

Retired documents shall no longer be referenced during operational activities. They remain available for historical audit until archived.

---

## Archived

**Purpose:** Maintain historical reference.

Archived documents shall clearly indicate that they are no longer operationally current (e.g., "Archived — superseded by KB00xxxx").

---

# Ownership

Each operational document shall identify:

- **Document Owner** — accountable for the document's continued fitness.
- **Author** — created the content.
- **Technical Reviewer** — validated correctness.
- **Approver** — authorised publication.
- **Current Version**
- **Last Review Date**
- **Next Review Date**

Ownership shall remain current throughout the document lifecycle. Orphaned documents (no owner) shall be flagged in review.

---

# Version Management

Operational documentation shall maintain revision history.

Each revision shall record:

- Version Number
- Revision Date
- Summary of Changes
- Author
- Approver

Historical versions shall be retained where organisational policy requires. Versioning follows the same semantic model as OAS-000 (Major / Minor / Patch).

---

# Review Requirements

Operational documentation shall be reviewed when:

- Major service changes occur.
- Product functionality changes.
- Operational processes change.
- Significant incidents identify documentation deficiencies.
- Technical inaccuracies are identified.
- Scheduled review dates are reached.

Review frequency should reflect the operational importance of the document (e.g., a runbook for a tier-1 service reviewed quarterly; a low-traffic guide annually).

---

## Part B — Technical Standard

# Standard Document Structure

Operational documentation should follow a consistent structure.

**Recommended sections:**

1. Title
2. Purpose
3. Scope
4. Intended Audience
5. Prerequisites
6. Assumptions
7. Procedure
8. Validation
9. Rollback or Recovery (where applicable)
10. References
11. Revision History

Additional sections may be included where operationally justified (e.g., "Safety Warnings", "Escalation").

**Example skeleton:**

```markdown
# Restart the Order Processing Service

## Purpose
Describe why an operator would perform this procedure.

## Scope
Which services/environments this applies to.

## Intended Audience
Who is expected to execute it (e.g., NOC Tier 2).

## Prerequisites
- Access to the orchestration console
- Maintenance window confirmed

## Assumptions
- No in-flight transactions; drain completed

## Procedure
1. ...
2. ...

## Validation
- Health endpoint returns 200
- Queue depth stable

## Rollback / Recovery
- If step 3 fails, revert via ...

## References
- OAS-501, Runbook template KB-...

## Revision History
| Version | Date | Summary |
```

---

# Context

Operational documentation shall provide sufficient context for the intended audience.

Readers should understand:

- What the document covers.
- Why the procedure exists.
- When it should be used.
- When it should **not** be used.
- Assumptions.
- Prerequisites.

Context shall minimise operational uncertainty. A procedure without context is a hazard: it will be used in the wrong situation.

---

# Technical Accuracy

Technical content shall accurately reflect the supported environment.

Examples of what must be accurate:

- Commands and their expected output
- Configuration values and paths
- URLs and system names
- Product versions
- Screenshots (dated and environment-tagged)
- Procedures

**Anti-pattern:** A runbook referencing a deprecated command because no one updated it after a platform upgrade. Accuracy is a maintenance obligation, not a one-time state.

---

# Clarity

Operational documentation shall be written using clear and precise language.

Documentation shall:

- Avoid ambiguous terminology ("maybe restart", "if needed").
- Avoid assumptions regarding reader knowledge.
- Define acronyms where necessary.
- Use consistent terminology.
- Use sequential, numbered instructions for procedures.

**Good:** "Stop the service using `systemctl stop ordersvc`."  
**Poor:** "Turn off the orders service somehow."

Instructions shall be sufficiently detailed to allow repeatable execution by a competent operator unfamiliar with the specific system.

---

# Completeness

Operational documentation shall contain sufficient information to complete the intended activity.

Where applicable include:

- Prerequisites
- Required permissions
- Expected outcomes
- Validation steps
- Recovery or rollback procedures
- Troubleshooting guidance
- References

**Rule:** Incomplete procedures shall not be approved for operational use. A procedure that cannot be completed safely from the document alone is not complete.

---

# Consistency

Operational documentation shall maintain consistency across the organisation.

Consistency includes:

- Terminology (same term, same meaning everywhere)
- Formatting (headings, tables, code blocks)
- Naming conventions (services, environments)
- Numbering
- Date and time formats (ISO 8601 — `YYYY-MM-DD`, `HH:MM TZ`)
- References (always by ID)

Consistency reduces cognitive load and the chance of operator error during stress.

---

# Operational Usability

Operational documentation should be executable by its intended audience without requiring knowledge from the original author.

Documentation should support:

- **Repeatability** — same result each time.
- **Predictability** — operator knows what to expect at each step.
- **Safe execution** — risks are flagged; unsafe steps are called out.
- **Operational confidence** — the operator trusts the document.

Where specialist knowledge is required, this shall be explicitly stated (e.g., "Requires DBA involvement").

---

# Maintainability

Operational documentation shall remain maintainable throughout its lifecycle.

Documentation should minimise:

- Obsolete references
- Duplicate information (link instead of copy)
- Product-specific assumptions that age badly
- Hardcoded values where a parameter would do

Maintainability supports long-term operational accuracy and reduces review cost.

---

# Quality Assurance Checklist

Before publication verify:

- [ ] Purpose defined
- [ ] Scope defined (including when not to use)
- [ ] Intended audience identified
- [ ] Context provided
- [ ] Procedure complete and sequenced
- [ ] Validation documented
- [ ] Recovery or rollback documented (where applicable)
- [ ] Technical review completed and signed
- [ ] Approval completed and recorded
- [ ] Version updated
- [ ] Review dates recorded
- [ ] References valid (no broken links/IDs)

---

# AI Operating Standard

When reviewing operational documentation:

1. Verify document purpose and scope.
2. Confirm lifecycle status.
3. Validate ownership and version information.
4. Review technical accuracy against the described environment.
5. Assess clarity and consistency.
6. Verify completeness of operational procedures.
7. Confirm validation and recovery information where applicable.
8. Identify ambiguous, obsolete, or incomplete content.
9. Recommend improvements supported by evidence.

AI-assisted reviews shall preserve technical accuracy, distinguish observations from recommendations, and avoid introducing unsupported assumptions.

---

# Related Standards

- OAS-000 Operational Analysis Standard Governance

---

# Related Knowledge Base

- OAS-KB-001 Operational Knowledge Templates (planned — derives from this standard)

---

# Revision History

| Version | Date | Summary | Author | Reviewer |
|----------|------|---------|---------|----------|
| 1.0 | 2026-07-23 | Initial approved release | | |
| 1.1 | 2026-07-23 | Elaborated for comprehensiveness: lifecycle-stage criteria, document-structure example, clarity/accuracy anti-patterns, expanded QA checklist | | |

---

# Future Revision Register

| ID | Status | Priority | Proposed Version | Enhancement |
|----|--------|----------|------------------|-------------|
| OAS501-001 | Proposed | Medium | 1.2 | Knowledge Quality Assessment Framework |
| OAS501-002 | Proposed | Medium | 1.2 | Operational Knowledge Traceability Model |
| OAS501-003 | Proposed | Low | 2.0 | Knowledge Maturity Model |
| OAS501-004 | Proposed | Low | 2.0 | Standardised Knowledge Templates |

---

End of Standard
