# Project Status Report & Phase Evolution

**Project:** Healthcare Access Guidance Prototype  
**Academic Context:** 2nd-Year Application Programming & Data Engineering Capstone  
**Current Milestone:** Phase 2 Implementation Ready for Local Verification  
**Baseline Git Tag:** `v0.1-synthetic-vertical-slice` (Phase 1)  
**Proposed Tag:** `v0.2-phase-2-validation` (Pending Local Team Execution & Verification Log Recording)  

---

> ### Academic Integrity & Real-World Claims Disclaimer
> **This prototype does NOT claim to solve a proven real-world healthcare gap.**  
> It is an academic engineering demonstration designed to investigate whether administrative, non-clinical healthcare navigation can be safely modeled using deterministic state machines, append-only telemetry, controlled categorical lookups, and clear boundary disclosures. Any future deployment to real patient communities would require extensive institutional ethics approvals, statutory government partnerships, and external clinical certification.
>
> **Verification Status**: Phase 2 implementation is ready for local verification. Formal completion and tagging as `v0.2-phase-2-validation` occur only after our capstone team executes the test suites, completes the local verification log with actual local outputs, and conducts at least 3 usability sessions with zero participant misunderstandings.

---

## 1. What Phase 1 Proved

Phase 1 established the technical baseline for an educational synthetic healthcare guidance vertical slice:
1. **Relational Data Foundation**: A 7-table PostgreSQL schema (`source_document`, `source_import_run`, `package_reference`, `guidance_session`, `guidance_event`, `data_quality_issue`, `analytics_summary`).
2. **Deterministic State Machine**: A 7-state guidance workflow (`GUIDANCE_STARTED`, `SERVICE_SEARCHED`, `PUBLIC_REFERENCE_FOUND`, `PUBLIC_REFERENCE_NOT_FOUND`, `OFFICIAL_VERIFICATION_ROUTE_SHOWN`, `SUPPORT_ROUTE_SHOWN`, `GUIDANCE_COMPLETED`).
3. **Database-Enforced Immutability**: PostgreSQL trigger (`trg_prevent_guidance_event_mutation`) guaranteeing that the `guidance_event` audit ledger is strictly append-only (rejecting `UPDATE` and `DELETE`).
4. **Strict Safety Validation**: Per-endpoint Zod schemas rejecting unknown keys (`.strict()`), free-text clinical queries, and prohibited identifiers (`aadhaar`, `phone`, `abha_id`).
5. **Synthetic Reference Catalog**: A seed dataset containing 3 neutral fictional demonstration records (`DEMO-ALPHA-001`, `DEMO-BETA-002`, `DEMO-GAMMA-003`).
6. **Data Engineering Aggregation**: A Python batch ETL service (`etl/transform_events.py`) computing non-PII metrics from event streams.
7. **Interactive User Interface**: A state-based React frontend operating on port 5173 connected to Express on port 5001.
8. **Automated Testing Baseline**: 16/16 Jest/Supertest backend tests passing.

---

## 2. What Phase 2 Validates

Phase 2 evaluated whether the synthetic slice is understandable, safe, measurable, and structurally ready for a prospective future official-data phase without introducing clinical features:

1. **End-to-End Workflow Verification**:
   - Both canonical workflows (Found path via `DEMO_ALPHA` and Recovery/No-Match path via `NO_MATCH_DEMO`) verified end-to-end.
   - Out-of-order state transitions (e.g. `GUIDANCE_STARTED` &rarr; `GUIDANCE_COMPLETED`) verified to return HTTP 409.
   - Prohibited identity and clinical attributes (`aadhaar`, `phone`, `name`, `abha_id`, `diagnosis`, `triage_score`, `prescription`) verified to return HTTP 400.
2. **Admin Route Authorization Boundary**:
   - `requireAdmin` middleware implemented across all `/api/admin/*` endpoints.
   - Explicit local demonstration bypass (`ALLOW_UNAUTHENTICATED_ADMIN_DEMO=true`) clearly restricted to local academic review.
   - In non-bypass mode, unauthenticated access returns HTTP 401, non-admin users return HTTP 403, and authorized admin tokens return HTTP 200.
3. **Usability & Comprehension Validation Framework**:
   - Formal test plan ([usability_test_plan.md](file:///Users/ishikajain/healthcare-access-guidance-capstone/docs/usability_test_plan.md)) established for 3–5 non-technical participants using four synthetic scenarios.
   - Unbiased evaluation findings log ([usability_findings.md](file:///Users/ishikajain/healthcare-access-guidance-capstone/docs/usability_findings.md)) initialized in a blank state to prevent fabrication.
4. **Source-Verification Gate**:
   - 13 non-negotiable audit conditions documented in [source_verification_gate.md](file:///Users/ishikajain/healthcare-access-guidance-capstone/docs/source_verification_gate.md) before any real government data may be ingested.
5. **Expanded Test Suite**:
   - Backend test suite expanded from 16 to 23 passing tests covering authorization states, invalid tokens, and prohibited payload rejections.

---

## 3. What Remains Unresolved

The following limitations are intentionally preserved and remain unresolved at the conclusion of Phase 2:
1. **Zero Official Government Data**: The prototype continues to use fictional demonstration packages. No real PM-JAY/NHA benefit package records have been ingested.
2. **Unexecuted Usability Sessions**: The usability test plan and ledger are defined; actual sessions with 3–5 non-technical participants must be conducted and logged by the capstone team during in-person evaluation.
3. **Absence of User Authentication**: User registration, login, and identity management are deliberately omitted to maintain the zero-PII/anonymous session policy.
4. **Static Support Routing**: Support desk numbers and official URLs are generic static references and do not represent verified, real-time hospital desk availability.

---

## 4. What Phase 3 Would Require

A prospective Phase 3 (Source-Verified Ingestion & Controlled Pilot) would strictly require:
1. **Full Gate Signoff**: Formal verification of all 13 conditions in [source_verification_gate.md](file:///Users/ishikajain/healthcare-access-guidance-capstone/docs/source_verification_gate.md).
2. **Authoritative Government Source**: Acquisition of a statutory public document from an official `.gov.in` domain with recorded SHA-256 hash.
3. **Field Extraction Audit**: Two-person manual signoff that extracted fields exclude clinical diagnostic criteria, symptom triage, and personal admission rules, and that any published statutory reference amounts include source provenance, version/date, and the mandatory non-cost disclaimer.
4. **Usability Protocol Ratification**: Completion of at least 3 participant sessions with zero misunderstandings regarding eligibility, coverage, diagnosis, availability, or legal status (or documented copy revisions and clean retests).
5. **Production Authentication**: Replacement of mock tokens with production-grade JWT/OIDC identity providers before disabling the local demonstration bypass.
6. **Independent Ethics Review**: Faculty oversight approval before conducting any user studies outside peer capstone evaluators.
