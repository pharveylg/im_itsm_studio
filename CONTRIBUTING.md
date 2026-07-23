# Contributing to the OAS Library

This document describes how to propose, review, and release changes to the Operational
Analysis Standard (OAS) library. All contribution activity is governed by **OAS-000**.

## 1. Principles

- **Governance before methodology.** No methodology may contradict OAS-000.
- **Evidence over opinion.** Standards must be defensible and internally consistent.
- **Small, reviewable changes.** Prefer focused pull/merge requests over large rewrites.
- **Version control everything.** Every change is traceable through revision history.

## 2. Roles

| Role | Responsibility |
|------|----------------|
| Author | Drafts or amends a standard; completes the Revision History entry. |
| Reviewer | Validates technical and methodological correctness against OAS-000. |
| Approver | Authorises publication; confirms the standard meets the quality bar. |
| Owner | Maintains the standard through its lifecycle (default: Operations). |

## 3. How to Contribute

1. **Create a branch** from `main` (e.g., `oas-101/incident-timeline-clarification`).
2. **Make the change** following the Standard Document Structure and the style guides
   under `style-guide/`.
3. **Update the document**:
   - Bump the version according to semantic versioning.
   - Add a row to the **Revision History** table.
   - Add or update the **Future Revision Register** if applicable.
4. **Self-check** using the document's Quality Assurance Checklist.
5. **Open a pull/merge request** describing the change, its rationale, and the evidence
   or review that supports it.
6. **Obtain review and approval** before merging to `main`.
7. **Update `CHANGELOG.md`** with the released version.

## 4. Versioning

| Bump | When |
|------|------|
| Major (x.0.0) | Breaking methodological change affecting how analysis is performed. |
| Minor (x.y.0) | New capability, section, or clarification that does not break method. |
| Patch (x.y.z) | Editorial correction, typo, or metadata fix. |

## 5. Cross-Referencing

- Reference other OAS standards by ID (e.g., `OAS-301`).
- Update `related:` front matter when dependencies change.
- The Knowledge Base (OAS-KB-*) is derived from the standards and must not redefine
  governance or methodology.

## 6. Quality Bar for Merge

- [ ] No contradiction of OAS-000.
- [ ] YAML front matter complete and valid.
- [ ] Revision History and Future Revision Register updated.
- [ ] Quality Assurance Checklist satisfied.
- [ ] CHANGELOG entry added.
- [ ] Cross-references verified.

## 7. Knowledge Base Contributions

The Knowledge Base is authored *after* the governing standards are frozen. Contributions
to `knowledge-base/` should cite the standard they implement (e.g., OAS-KB-002 implements
the QA checklists from OAS-101/201/301/401).

---

*End of Contributing guide.*
