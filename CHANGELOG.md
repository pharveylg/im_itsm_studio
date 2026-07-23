# Changelog

All notable changes to the OAS library are recorded here. The library as a whole follows
semantic versioning: *Major* = breaking methodological change, *Minor* = new capability,
*Patch* = editorial correction.

## [1.1.0] — 2026-07-23

### Added
- Elaborated all six standards (OAS-000, OAS-101, OAS-201, OAS-301, OAS-401, OAS-501) for
  professional depth and comprehensiveness:
  - Expanded guiding principles with rationale and examples (OAS-000).
  - Added Definitions sections, per-phase assessment guidance (indicators of strength/
    weakness, common pitfalls), illustrative worked examples, and anti-patterns to each
    methodology.
  - Added glossaries and expanded lifecycle/QA detail to governance standards.
- No methodological break; this is a Minor version (clarification and depth).

### Changed
- Bumped each standard from 1.0 to 1.1.
- Updated library release to 1.1.0 in README.

---

## [1.0.0] — 2026-07-23

### Added
- **OAS-000** Operational Analysis Standard — Governance (Approved).
- **OAS-101** Incident Analysis Methodology (Approved).
- **OAS-201** Major Incident Communications Methodology (Approved).
- **OAS-301** Problem Analysis Methodology (Approved).
- **OAS-401** Change Analysis Methodology (Approved).
- **OAS-501** Operational Knowledge Standard (Approved).
- Top-level `README.md`, `LICENSE`, `CONTRIBUTING.md`, and the structured repository
  layout (governance, methodologies, knowledge-base, assets, style-guide).

### Changed
- Promoted OAS-000 from Draft (0.1) to Approved (1.0) and aligned its status with the
  library status table.
- Corrected OAS-000 §18 Methodology Hierarchy: OAS-301 → Problem Analysis, OAS-401 →
  Change Analysis, OAS-501 → Operational Knowledge Standard; removed non-existent
  OAS-601/OAS-901 from the approved set (recorded as future candidates).
- Corrected OAS-301 cross-references ("OAS-501 Vendor Analysis" → "OAS-501 Operational
  Knowledge Standard"; removed OAS-601 Post Incident Review references).
- Normalised YAML front matter across all documents to the Standard Metadata schema.
- Extended OAS-101, OAS-201, and OAS-401 to inherit OAS-000's Evidence States and
  Confidence Model for consistency with OAS-301.

### Notes
- Knowledge Base (OAS-KB-001 … OAS-KB-006) is planned and not yet authored; references are
  forward pointers.
- Style guides are seeded as DRAFT placeholders pending ratification.

---

## Template for future releases

## [x.y.z] — YYYY-MM-DD
### Added
### Changed
### Deprecated
### Removed
### Fixed
