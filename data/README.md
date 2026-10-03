# Data Directory Documentation

This directory contains the synthetic seed data utilized by the prototype.

## Synthetic Demonstration Dataset (`synthetic_reference_records.json`)
* **Publisher:** `CAPSTONE_STUDENT_TEAM`
* **Version:** `demo-v0.1`
* **Purpose:** Provides 3 fictional, safe demonstration packages mapped to the controlled categories `DEMO_ALPHA`, `DEMO_BETA`, and `DEMO_GAMMA`.
* **Exclusions:**
  * Contains no pricing or monetary amounts.
  * Contains no official government links.
  * Contains no patient, doctor, or hospital identities.
  * All records carry `is_simulated_reference = true` and `data_status = 'SYNTHETIC_DEMO'`.
