# Source-Verification Gate Specification

**Project:** Healthcare Access Guidance Prototype  
**Phase:** Phase 2 Source-Verification Preparation (Gate for Phase 3 Entry)  
**Status:** Mandatory Pre-Condition Gate  
**Scope:** Defines strict audit requirements before any official government or public reference data may be ingested.  

---

> ### CRITICAL POLICY: ZERO UNVERIFIED DATA INGESTION
> **No official government data, hospital master data, or external package lists may be ingested into this repository during Phase 1 or Phase 2.**  
> The entire prototype operates strictly on student-generated synthetic demonstration records. Transition to Phase 3 (Source-Verified Ingestion) requires 100% satisfaction of all 13 gating conditions defined below.

---

## 1. The 13 Mandatory Gate Conditions

Before any external or official public reference dataset can be imported into PostgreSQL or the ETL pipeline, the student team must satisfy each of the following conditions:

1. **Official Public Source URL**: The source document must originate from an authoritative statutory domain (e.g., official `.gov.in` domain, National Health Authority, or state health department). Third-party scrapers, aggregator blogs, and secondary repositories are strictly disqualified.
2. **Verified Publisher & Document Title**: The official publisher (e.g., National Health Authority, Ministry of Health and Family Welfare) and formal document title (e.g., *Health Benefit Package 2.2 Master Document*) must be documented and verified against public gazettes or portal releases.
3. **Verified Version & Publication Date**: The precise document release version, revision number, and official gazette/publication date must be established. Ambiguous or undated releases are rejected.
4. **Publicly Accessible Format**: The document must be available in a verifiable public format: PDF, official spreadsheet (XLSX/CSV), structured HTML, or open government API endpoint. Proprietary or gated formats are rejected.
5. **Documented Data Dictionary**: A comprehensive data dictionary must define every column, field type, nullability constraint, and business meaning before ingestion.
6. **Field-Level Schema Mapping**: A 1:1 mapping must map source attributes directly into the relational tables (`source_document`, `package_reference`). Synthesized columns (such as synthetic foreign keys) must be clearly segregated from verbatim source attributes.
7. **Source Locator for Every Record**: Every ingested record must have a granular provenance locator: page number, section number, table identifier, and row index in the original public document.
8. **Cryptographic SHA-256 Hash**: The raw downloaded file must have its SHA-256 hash computed and recorded immediately upon acquisition. Any discrepancy between downloaded copies and recorded hashes immediately invalidates the ingestion run.
9. **Import-Run Relational Audit Metadata**: Every import must generate a formal `source_import_run` audit record documenting the import execution timestamp, executing script, row counts, and error ledger.
10. **Two-Person Manual Review**: Every record proposed for production display must undergo dual-signoff manual review by the student capstone team to verify that text conforms to non-clinical, non-promotional standards.
11. **Explicit List of Prohibited Fields**: Any fields in the source document relating to clinical diagnostic criteria, patient admission requirements, hospital tariffs, copay formulas, clinician specialties, or reimbursement rules must be explicitly flagged as **PROHIBITED FROM DISPLAY** and excluded from user-facing views.
12. **Mandatory Non-Eligibility / Non-Coverage Boundary Clause**: Every ingested record must be tagged with mandatory boilerplate clarifying that public package data do not constitute coverage determination, pre-authorization, hospital bed availability, cashless admission guarantee, or legal entitlement.
13. **Deterministic Fallback & Parser Failure Protocol**: A documented fallback plan must govern scenarios where official source files are corrupted, structurally altered, or unparseable. The fallback must default to the controlled synthetic recovery route (`PUBLIC_REFERENCE_NOT_FOUND` / `SUPPORT_ROUTE_SHOWN`) rather than emitting partial or unverified records.

---

## 2. Standardized Source-Audit Template

Every candidate external data source must be evaluated using this audit table:

| Field | Value |
|---|---|
| **Source ID** | *(e.g., SRC-NHA-HBP-2022-V22)* |
| **Official publisher** | *(e.g., National Health Authority, Government of India)* |
| **Document title** | *(e.g., National Health Benefit Package 2.2)* |
| **Official URL** | *(e.g., https://pmjay.gov.in/sites/default/files/...)* |
| **Format** | *(PDF / XLSX / CSV / Web API)* |
| **Version/publication date** | *(e.g., Version 2.2, Published November 2022)* |
| **Access date** | *(YYYY-MM-DD)* |
| **SHA-256 file hash** | *(64-character hexadecimal SHA-256 string)* |
| **Fields available** | *(Comma-separated list of raw fields in source)* |
| **Fields suitable for display** | *(Specialty category, procedure name, package code)* |
| **Fields prohibited from display** | *(Tariff amounts, pre-auth clinical notes, surgical criteria)* |
| **Source locator method** | *(Page number + Table name + Row number)* |
| **Data limitations** | *(Static reference list; does not reflect live hospital empaneled status)* |
| **Approved prototype use** | *(Simulated administrative reference routing demonstration only)* |
| **Gate decision** | **PASS / FAIL / NEEDS REVIEW** |

---

## 3. Prohibited Fields & Disqualification Criteria

A candidate source document is **DISQUALIFIED** if:
- It requires collecting personal health records, patient identifiers, or login credentials to access.
- It conflates administrative package listings with individual patient clinical eligibility.
- It cannot be verified against an official `.gov.in` statutory release.
- It contains proprietary commercial pricing without public gazette authorization.

---

## 4. Phase 3 Ingestion Readiness Checklist

- [ ] Candidate source identified from statutory `.gov.in` domain.
- [ ] SHA-256 hash verified by dual team members.
- [ ] Data dictionary drafted and reviewed against schema constraints.
- [ ] Field-level transformation script tested in isolated staging container.
- [ ] Prohibited fields stripped prior to database persistence.
- [ ] Fallback parser exception handlers verified with 100% test coverage.
- [ ] Gate decision signed off as **PASS** in project documentation.
