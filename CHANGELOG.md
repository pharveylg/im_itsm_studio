# Changelog

All notable changes to the OAS library are recorded here. The library as a whole follows
semantic versioning: *Major* = breaking methodological change, *Minor* = new capability,
*Patch* = editorial correction.

## [1.2.2] — 2026-07-23

### Added
- Presentation deck (Major Incident showcase) through the OAS-201 lens, covering all
  standards and the Knowledge Base:
  - `presentation/oas-major-incident-deck.html` — reveal.js + Mermaid (web-presentable).
  - `presentation/oas-major-incident-deck.pptx` — native PowerPoint (18 slides).
- Build script: `build_deck.py`.

### Changed
- Bumped library release to 1.2.2 (supplementary asset; no standards change).

---

## [1.2.1] — 2026-07-23

### Added
- Relationship visuals across the library:
  - OAS-000: evidence hierarchy, analysis lifecycle, record relationships, methodology hierarchy.
  - OAS-101 / OAS-201 / OAS-301 / OAS-401: methodology phase flows, related-record maps,
    stakeholder/handover (201), corrective/preventive P/P/T (301), change intent (401).
  - OAS-501: knowledge lifecycle.
  - knowledge-base/README.md: derived-from map; KB-005: evidence-hierarchy visual.
  - README.md: framework architecture (Mermaid + SVG) and ITIL/ServiceNow relationship.
- Static SVG architecture export at `assets/diagrams/oas-architecture.svg` for viewers
  without Mermaid support.

### Changed
- Bumped library release to 1.2.1 (documentation enhancement; no method change).

---

## [1.2.0] — 2026-07-23

### Added
- Authored the Knowledge Base (OAS-KB-001 … OAS-KB-006), derived from the frozen standards:
  - OAS-KB-001 Operational Knowledge Templates (from OAS-501)
  - OAS-KB-002 Analysis Checklists (from OAS-000/101/201/301/401 QA checklists)
  - OAS-KB-003 Report Templates (from OAS-000 §16 outputs)
  - OAS-KB-004 Operational Examples (full worked Incident/Problem/Change analyses)
  - OAS-KB-005 Reference Guides (evidence hierarchy, confidence, normative language, ServiceNow mapping, glossary)
  - OAS-KB-006 Prompt Library (AI-assisted analysis prompts aligned to OAS-000 §14)
- Updated standards' "(planned)" Knowledge Base references to reflect availability.

### Changed
- Bumped library release to 1.2.0 (Knowledge Base is a new library capability; standards remain at 1.1).

---

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
