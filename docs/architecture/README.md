# Healthcare Access Guidance & Operations Platform — Architecture Documentation

> **Stage 1 Architecture Freeze (v2.1)**  
> **Academic Capstone Notice**: This repository contains the complete codebase for a 2nd-year Application Programming (AP) and Data Engineering (DE) capstone project. It is an **educational, safe, simulated prototype** demonstrating administrative public guidance mechanisms and simulated hospital operational workflows.

---

## 1. Executive Architecture Overview

The **Healthcare Access Guidance & Operations Platform** is an integrated full-stack prototype engineered to address two complementary administrative challenges in healthcare coordination:

1. **Anonymous Citizen Healthcare Access Guidance**: A public-facing, privacy-preserving guidance engine that directs citizens to official statutory healthcare access channels using controlled categorical inputs and synthetic demonstration packages, without capturing personal identifiers or performing clinical triage.
2. **Hospital Operations Coordination Console**: An internal administrative console for hospital operational personnel to track Outpatient Department (OPD) queue flow, physical bed states, inpatient admissions, and dispensary inventory across hospital departments.
3. **Data Engineering & Operational Telemetry Pipeline**: Decoupled Python ETL pipelines that periodically extract operational transactions and compute non-PII operational rollups and hierarchical municipal snapshots (department, hospital, city levels) with theoretical queuing benchmarks (Kendall's M/M/c model).

```
+----------------------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER (apps/web)                                   |
|   Citizen Guidance Workflow (Controlled Dropdowns)  |  Staff Operations Console (OPD, Beds, Inv)   |
+----------------------------------------------------------------------------------------------------+
                                                   | REST API (HTTP / JSON)
                                                   v
+----------------------------------------------------------------------------------------------------+
|                                   APPLICATION GATEWAY (apps/api)                                   |
|   Helmet Security | CORS | Strict Zod Unknown-Key Rejection | requireAdmin Bearer Auth Boundary     |
|   Deterministic State Machines (Guidance, OPD Token, Bed State, Inpatient Admission)               |
|   Service Layer: Guidance, OPD, Beds, Admissions, Inventory, M/M/c Analytics Engine                |
+----------------------------------------------------------------------------------------------------+
                                                   | PostgreSQL Protocol
                                                   v
+----------------------------------------------------------------------------------------------------+
|                               DATABASE STORAGE ENGINE (PostgreSQL 14+)                             |
|   17-Table Relational Schema | Composite Foreign Keys | Append-Only PL/pgSQL Immutability Triggers |
+----------------------------------------------------------------------------------------------------+
                                                   ^
                                                   | Periodic Batch Extraction & Upsert (psycopg2)
+----------------------------------------------------------------------------------------------------+
|                             BATCH ETL & TELEMETRY PIPELINE (etl/ Python)                           |
|   transform_events.py (Guidance Metrics)  |  aggregate_city_snapshot.py (Department/Hospital/City) |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Architecture Documentation Index

This directory provides the authoritative Stage 1 architecture documentation. Each document addresses a specific architectural facet:

| Document | Description | Focus Areas |
| :--- | :--- | :--- |
| **[tech-stack.md](./tech-stack.md)** | **Technology Stack & Justification** | React 18, Vite 5, Tailwind CSS, Node.js, Express 4, Zod, PostgreSQL 14+, Python 3.12, pandas, Jest, Supertest. Architectural rationales, dependencies, and deployment topology. |
| **[er-diagram.md](./er-diagram.md)** | **17-Table Entity-Relationship Diagram** | Complete GitHub-compatible Mermaid ER diagram encompassing all 17 tables, exact column types, primary keys, foreign keys, cardinality notations, and trigger defenses. |
| **[dfd-level-0.md](./dfd-level-0.md)** | **System Context Diagram (DFD Level 0)** | High-level system boundary, external human and automated entities (Citizen, Staff Operator, Administrator, ETL Runner), and data flows. |
| **[dfd-level-1.md](./dfd-level-1.md)** | **Detailed Data Flow Diagram (DFD Level 1)** | Subsystem decomposition into 6 core processes (P1–P6), 17 data stores (D1–D17), cross-process communication, and audit boundaries. |
| **[system-architecture.md](./system-architecture.md)** | **End-to-End System Architecture** | Detailed component architecture, multi-tier request pipeline, state machine transitions, database trigger mechanics, M/M/c Erlang-C engine, and city snapshot flow. |

---

## 3. Core Architectural Principles & Safety Boundaries

The platform's architecture is strictly governed by six foundational engineering tenets:

### 3.1 Zero Clinical Triage & Zero Medical Diagnosis
The system is strictly administrative and informational. It accepts **zero symptom inputs**, performs no medical assessment or risk scoring, and issues no diagnostic or prescription outputs. Medical emergencies and clinical questions are immediately routed to statutory emergency channels.

### 3.2 Zero Personally Identifiable Information (PII)
The database schema contains **no fields** for citizen names, government identification numbers (e.g., Aadhaar, ABHA ID), telephone numbers, residential addresses, or medical records. Session tracking is backed by ephemeral UUIDs. Inpatient admissions and OPD tokens operate purely on administrative tracking numbers (e.g., `TKN-GEN-001`, `ADM-2026-001`) with zero patient demographics.

### 3.3 Strict Unknown-Key Rejection & Controlled Inputs
All inbound HTTP payloads pass through strict Zod validators configured with unknown-key rejection (`.strict()`). The public guidance module restricts input selection to allowlisted dropdown enums (`DEMO_ALPHA`, `DEMO_BETA`, `DEMO_GAMMA`, `NO_MATCH_DEMO`), structurally preventing SQL injection, free-text prompt injections, or unstructured PII submission.

### 3.4 Database-Enforced Append-Only Immutability
Audit ledgers (`guidance_event` and `inventory_transaction`) are protected by native PostgreSQL PL/pgSQL triggers (`BEFORE UPDATE OR DELETE`) that raise exceptions on any mutation attempt. Audit trails cannot be altered or truncated via the application layer.

### 3.5 Deterministic State Machines
System lifecycles are modeled as strict finite state machines:
- **Guidance Session**: 7 states (`GUIDANCE_STARTED` &rarr; `SERVICE_SEARCHED` &rarr; `PUBLIC_REFERENCE_FOUND` / `PUBLIC_REFERENCE_NOT_FOUND` &rarr; `OFFICIAL_VERIFICATION_ROUTE_SHOWN` / `SUPPORT_ROUTE_SHOWN` &rarr; `GUIDANCE_COMPLETED`).
- **Bed Lifecycle**: 5 states (`AVAILABLE`, `RESERVED`, `OCCUPIED`, `CLEANING`, `OUT_OF_SERVICE`) enforced by trigger `trg_validate_bed_state_transition`.
- **OPD Queue Token**: 5 states (`WAITING`, `CALLED`, `IN_SERVICE`, `COMPLETED`, `CANCELLED`).
- **Inpatient Admission**: 7 states (`ADMISSION_REQUESTED`, `PENDING_REVIEW`, `BED_ASSIGNED`, `ADMISSION_CONFIRMED`, `ADMITTED`, `DISCHARGED`, `CANCELLED`).

### 3.6 Synthetic Demonstration Data Governance
All catalogue items (`DEMO-ALPHA-001`), hospitals, departments, beds, inventory items, and city-level metrics are synthetic demonstration data reviewed by the student engineering team. The system displays explicit disclaimer banners and carries `is_simulated = TRUE` flags across all operational tables. It does **not** claim live integration with government schemes (such as Ayushman Bharat / PM-JAY) or live hospital Information Systems (HIS).

---

## 4. Implemented vs. Planned Feature Matrix

To maintain rigorous academic and engineering honesty, the following matrix delineates operational features implemented in the current codebase from planned future capabilities:

| Functional Area | Implemented in Current Codebase (Stage 1 / v2.1) | Planned / Out of Scope for Stage 1 |
| :--- | :--- | :--- |
| **Citizen Guidance** | • Controlled category dropdown search<br>• Synthetic reference package catalog (`DEMO-ALPHA-001` to `DEMO-GAMMA-003`)<br>• Generic statutory route cards<br>• Ephemeral UUID session tracking<br>• Deterministic 7-state guidance state machine | • Live government portal API integration<br>• Real-time eligibility checking<br>• Multilingual localization (Hindi, Marathi, etc.) |
| **Hospital Operations** | • Multi-facility registry (3 synthetic hospitals: LNJP, GTB, DDU)<br>• 10 hospital departments with consultation counters<br>• OPD queue token generation, calling, and service tracking<br>• Bed state machine with transition trigger (19 monitored beds)<br>• Inpatient admission lifecycle and bed assignment validation<br>• Dispensary inventory stock tracking & append-only transaction ledger | • Live HL7 / FHIR Electronic Health Record (EHR) sync<br>• Biometric patient identification<br>• Barcode scanner hardware integration<br>• Pharmacy billing and financial accounting |
| **Queue Analytics** | • Real-time queue metrics (waiting, serving, completed counts)<br>• Historical average wait/service duration calculations<br>• Theoretical Kendall M/M/c (Erlang-C) analytical queue modeling engine | • Real-time WebSocket streaming (currently REST polling)<br>• Predictive machine learning queue forecasting |
| **Batch ETL & Snapshots** | • Python ETL event rollup (`transform_events.py` into `analytics_summary`)<br>• Multi-level municipal snapshot aggregator (`aggregate_city_snapshot.py` into `city_aggregate_snapshot`)<br>• Hierarchical DEPARTMENT, HOSPITAL, CITY rollups with idempotent upserts<br>• Public REST endpoints (`GET /api/city/overview`, `GET /api/city/snapshots`) | • Distributed Apache Spark / Airflow execution<br>• Real-time Kafka event streaming |
| **Security & Auth** | • `requireAdmin` Bearer token middleware on `/api/admin/*`<br>• `requireStaff` operational authorization on queue/bed/admission/inventory mutations<br>• Production bypass prohibition (`NODE_ENV=production`)<br>• In-memory IP rate limiting (`X-RateLimit-*`)<br>• Helmet security headers, CORS origin controls<br>• Unknown-key payload rejection via Zod | • OIDC / OAuth2 enterprise SSO provider integration<br>• Dynamic database-backed user management |
| **Testing & CI** | • 150 backend integration tests across 9 suites (Jest + Supertest)<br>• 13 frontend operational tests (Node `--test`)<br>• 15 Python ETL unit and integration tests (unittest)<br>• Clean Vite production build (1542 modules transformed)<br>• Automated multi-table seeding script (`scripts/seed_demo_data.sh`) | • Automated End-to-End browser tests (Playwright/Cypress)<br>• Performance load testing (k6/JMeter) |
