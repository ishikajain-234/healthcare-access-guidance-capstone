# Usability and Comprehension Validation Test Plan

**Project:** Healthcare Access Guidance Prototype  
**Phase:** Phase 2 Usability & Comprehension Evaluation  
**Status:** Approved for Local Academic Demonstration Only  
**Target Group:** 3–5 Non-Technical Participants (Academic / Peer Evaluators)  

---

> ### Mandatory Ethical & Methodological Disclosure
> **This test plan is NOT clinical research, NOT patient research, and NOT a representative or clinical user study.**  
> It is an academic evaluation protocol designed solely to assess whether non-technical readers accurately comprehend:
> 1. That the prototype uses **fictional, synthetic demonstration data** only.
> 2. That the system performs **zero medical diagnosis, symptom triage, or treatment recommendation**.
> 3. That the system does **not determine, evaluate, or guarantee scheme eligibility, coverage, approval, or cashless hospital care**.
> 4. That a "no-match" outcome represents an **academic prototype seed limitation**, not a refusal of statutory healthcare access.
> 5. That all formal confirmation must occur **through authorized statutory channels outside this software**.
>
> **Zero Personal Data Collection**: No participant names, phone numbers, health histories, Aadhaar numbers, ABHA IDs, or demographic profiles may be collected, recorded, or requested during any session.

---

## 1. Participant Instructions & Script

Facilitators must read the following script aloud to each participant verbatim prior to beginning the session:

> *"This is a fictional student prototype using synthetic data. It is not connected to any hospital or government system. Please use it as if you were exploring public healthcare reference information."*

The facilitator must ensure the participant clicks the mandatory safety acknowledgment checkbox on the Landing Page before initiating an anonymous session.

---

## 2. Evaluation Scenarios

Facilitators must guide participants through four sequential synthetic scenarios:

### Scenario 1: Synthetic Found Path
* **Prompt to Participant**: *"Choose Demo service category alpha and follow the workflow."*
* **Workflow Steps**:
  1. From the Landing Page, check the safety disclosure box and click **Start Anonymous Guidance Session**.
  2. In the controlled dropdown, select **Simulated Demo Category Alpha**.
  3. Click **Look Up Reference Guidance**.
  4. Review the synthetic reference card displayed (`DEMO-ALPHA-001`).
  5. Click **View Official Information & Support Route**.
  6. Review the static generic informational route card.
  7. Click **Acknowledge Guidance & Finish**.
* **Observed Focus**: Does the user recognize that the reference item is simulated and does not grant pre-authorization?

---

### Scenario 2: Prototype Data-Limitation Recovery Path (No-Match)
* **Prompt to Participant**: *"Choose No matching demo category and follow the workflow."*
* **Workflow Steps**:
  1. Click **Start New Anonymous Demonstration Session** or navigate to category selection.
  2. Select **Simulated Unmatched Category Demo** (`NO_MATCH_DEMO`).
  3. Click **Look Up Reference Guidance**.
  4. Observe the prototype scope notice explaining that the 3-record seed catalog has no match.
  5. Click **View Official Information & Help Route**.
  6. Review the official support channels and acknowledge completion.
* **Observed Focus**: Does the user understand that no-match indicates an academic database seed boundary, rather than public healthcare unavailability?

---

### Scenario 3: Safety & Non-Eligibility Comprehension
* **Prompt to Participant**: *"Does this tool tell you whether you are eligible for a scheme?"*
* **Observed Focus**: Does the user recognize that the prototype lacks eligibility logic and cannot approve or reject scheme participation?

---

### Scenario 4: Recovery Comprehension
* **Prompt to Participant**: *"If no matching record appears, what does the app say you should do next?"*
* **Observed Focus**: Does the user identify the informational directive to consult authorized hospital helpdesks and statutory scheme helplines?

---

## 3. Post-Task Comprehension Interview Questions

Facilitators must ask the following structured questions immediately following scenario execution:

1. **What do you think this application does?**
2. **Did you understand that the data are simulated?**
3. **Did the application diagnose anything or recommend treatment?**
4. **Did it tell you whether you are eligible?**
5. **Did it guarantee cashless treatment?**
6. **What did you do after selecting a category?**
7. **If no result appeared, what did the app tell you?**
8. **Did “no matching record” mean that support is unavailable?**
9. **What was unclear or confusing?**
10. **What wording would you change?**

---

## 4. Usability Completion Criteria & Passing Standards

To validate the prototype for Phase 2 completion:
1. **Minimum Sample Size**: At least **3 completed participant sessions** must be conducted and logged.
2. **Zero Misunderstanding Requirement**: It is mandatory that **no participant** misunderstands the prototype as an eligibility, coverage, diagnosis, availability, or legal-status system.
3. **Core Comprehension Dimensions**: Every participant must accurately understand:
   - **Synthetic Data**: All categories, codes, and items are simulated test data.
   - **Zero Clinical Triage**: The tool does not diagnose conditions, interpret symptoms, or recommend treatment.
   - **Zero Eligibility Adjudication**: The tool cannot evaluate or confirm scheme eligibility or coverage.
   - **Prototype Limitation**: A "no-match" outcome reflects an academic database scope boundary, not public support unavailability.
   - **External Official Action**: All confirmations and claims must occur through official statutory channels outside this tool.
4. **Mandatory Retesting on Ambiguity**: If any participant exhibits misunderstanding regarding eligibility, coverage, clinical triage, hospital bed/treatment availability, or legal entitlement, the capstone team must:
   - Document the specific misunderstanding in `docs/usability_findings.md`.
   - Formulate and implement required UI copy and layout modifications.
   - Retest with new participants until a clean run of at least 3 sessions with zero misunderstandings is achieved.

---

## 5. Execution Protocol & Safeguards

- **Facilitator Demeanor**: Neutral, non-leading observation. Facilitators must not answer prompts in ways that prime participants toward affirmative answers.
- **Recording Medium**: Observers note qualitative feedback into [usability_findings.md](file:///Users/ishikajain/healthcare-access-guidance-capstone/docs/usability_findings.md).
- **Prohibited Data**: If any participant attempts to enter personal details, names, or real symptoms, the session must be halted immediately.
