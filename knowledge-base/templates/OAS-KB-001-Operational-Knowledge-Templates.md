---
document_id: OAS-KB-001
title: Operational Knowledge Templates
category: Knowledge Base
version: 1.0
status: Approved
owner: Operations
classification: Internal
parent: OAS-501
related:
  - OAS-501
  - OAS-KB-002
review_cycle: Annual
---

# OAS-KB-001 Operational Knowledge Templates

## Purpose

Reusable templates for operational knowledge artefacts, derived from the structure and
quality requirements defined in **OAS-501 Operational Knowledge Standard**. Use these
templates when authoring Knowledge Articles, Runbooks, Known Error Articles, and Work
Instructions so that all operational documentation is consistent and complete.

## How to use

1. Copy the relevant template below into your authoring environment.
2. Replace every `<placeholder>` with real content.
3. Apply the OAS-501 Quality Assurance Checklist (OAS-KB-002) before requesting review.
4. Keep the YAML front matter for traceability.

---

## 1. Knowledge Article Template

```markdown
---
document_id: KA-XXXXXX
title: <Clear, searchable title>
category: Knowledge Article
version: 1.0
status: Draft
owner: <Team/Person>
classification: Internal
parent: OAS-501
related:
  - <OAS-ID or record ID>
review_cycle: Annual
---

# <Title>

## Purpose
<Why this article exists and what problem it solves.>

## Scope
<What it covers and, importantly, what it does NOT cover.>

## Intended Audience
<Who should use this article.>

## Prerequisites
- <Access, permissions, environment state>

## Assumptions
- <Conditions assumed to be true.>

## Procedure
1. <Step>
2. <Step>

## Validation
- <How to confirm success.>

## Rollback / Recovery
- <What to do if it fails.>

## References
- <OAS-501, related records, other KAs>

## Revision History
| Version | Date | Summary | Author | Reviewer |
```

---

## 2. Runbook Template

```markdown
# <Service> Runbook — <Procedure Name>

## Purpose
<Operational outcome this runbook achieves.>

## Scope
<Systems, environments, and boundaries.>

## Intended Audience
<e.g., NOC Tier 2, Platform Engineering.>

## Prerequisites
- <Required access, tooling, maintenance window.>

## Assumptions
- <e.g., drain complete, no in-flight transactions.>

## Procedure
1. <Numbered, sequential, copy-pasteable steps.>
2. ...

## Validation
- <Health check, metric, or command confirming success.>

## Rollback / Recovery
- <Exact recovery steps if a step fails.>

## Escalation
- <Who to call and when.>

## References
- <OAS-501, KA-XXXXXX>

## Revision History
| Version | Date | Summary |
```

---

## 3. Known Error Article Template

```markdown
# Known Error — <Symptom in few words>

## Status
<Open | Workaround Available | Resolved>

## Symptom
<What users/operators observe.>

## Configuration Items Affected
- <CI list>

## Root Cause
<Underlying cause once known; link to Problem record.>

## Workaround
<Steps to mitigate impact until resolved.>

## Permanent Fix
<Change/Action reference that removes the cause.>

## Evidence
- <Logs, vendor statements, monitoring — per OAS-000 Evidence Hierarchy.>

## Confidence
<High | Moderate | Low | Unknown>

## References
- PRB000789, CHG001122

## Revision History
| Version | Date | Summary |
```

---

## 4. Work Instruction Template

```markdown
# Work Instruction — <Task Name>

## Purpose
<Single, specific task this instruction covers.>

## Intended Audience
<Role expected to perform it.>

## Prerequisites
- <Permissions, tools, state.>

## Procedure
1. <Action>
2. <Action>

## Validation
- <Expected result.>

## Notes / Warnings
- <Safety or operational warnings.>

## References
- <OAS-501>

## Revision History
| Version | Date | Summary |
```

---

## Related Standards and Assets

- OAS-501 Operational Knowledge Standard (governs these templates)
- OAS-KB-002 Analysis Checklists (QA before publication)
- OAS-KB-003 Report Templates (analysis outputs)

---

*End of OAS-KB-001.*
