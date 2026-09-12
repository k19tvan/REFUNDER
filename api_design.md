# API Design - Refunder System

This document specifies the REST API contracts supporting the **Refunder** autonomous governance & arbitration dashboard. It covers policy management, single refund request evaluation, and diagnostic testcase suite evaluations.

---

## 1. Summary of Architecture & Tabs

The system is organized into **4 top navigation tabs**:

| Tab | Role / Purpose | API Endpoint(s) |
|---|---|---|
| **1. Introduction** | System overview, mission, and scope | Static client view |
| **2. Company Policy** | View, edit, and import markdown corporate regulations | `GET /api/policy`<br>`POST /api/policy/import` |
| **3. Refund Request** | Submit an individual claim form + receipt image for evaluation | `POST /api/claims/evaluate` |
| **4. Evaluate Testcase** | Custom testcase bars (starts with 0, add bars below) to audit referee decisions | `GET /api/testcases`<br>`POST /api/claims/evaluate`<br>`POST /api/testcases/evaluate-batch` |

---

## 2. Detailed API Specifications

### 2.1. Company Policy Endpoints

#### `GET /api/policy`
Retrieves the currently loaded active policy document and its metadata.

- **Method**: `GET`
- **Headers**: `Accept: application/json`
- **Response (`200 OK`)**:
```json
{
  "filename": "policy.md",
  "content": "# COMPANY EXPENSE AND TRAVEL POLICY\n\n## Article 1: General Provisions...",
  "size": "19.3 KB",
  "imported_at": "2026-09-12T15:00:00Z"
}
```

#### `POST /api/policy/import`
Uploads a new markdown policy document or saves edits made directly in the UI.

- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "filename": "policy_v2.md",
  "content": "# REVISED EXPENSE POLICY\n\n..."
}
```
- **Response (`200 OK`)**:
```json
{
  "status": "SUCCESS",
  "message": "Policy document successfully imported and indexed into arbitration engine.",
  "filename": "policy_v2.md",
  "updated_at": "2026-09-12T15:30:00Z"
}
```

---

### 2.2. Refund Request Evaluation

#### `POST /api/claims/evaluate`
Primary evaluation endpoint used by both the **Refund Request** tab and individual **Testcase Bars**. Evaluates a claim against the active policy and physical receipt evidence.

- **Method**: `POST`
- **Content-Type**: `application/json` or `multipart/form-data`
- **Request Body**:
```json
{
  "employee_name": "Alex Johnson",
  "employee_id": "EMP-1001",
  "approver_id": "MGR-2001",
  "category": "meal",
  "amount": 120.00,
  "description": "Lunch with client partner to review deliverables",
  "days_since_expense": 3,
  "has_receipt": true,
  "receipt_image": "data:image/png;base64,..." 
}
```

#### Response Scenarios:

##### Case A: Automatic Approval (`APPROVE`)
When the claim strictly complies with policy limits, valid receipt proof is present, and no exceptions or authority conflicts are detected.

```json
{
  "claim_id": "CLM-2026-9101",
  "decision": "APPROVE",
  "target_role": "System Automated (ERP Accounting)",
  "uncertainty_category": "NONE",
  "escalation_question": null,
  "reason": "The claim is fully compliant, receipt verified, and well within standard policy limits.",
  "policy_reference": "Article 5: Standard expense limits (e.g. Individual meals ≤ $120/day)",
  "confidence_score": 0.99
}
```

##### Case B: Human Escalation (`ESCALATE`)
When the claim exhibits uncertainty (perceptual blur, missing information, or policy threshold exceedance) that requires human arbitration.

```json
{
  "claim_id": "CLM-2026-9102",
  "decision": "ESCALATE",
  "target_role": "Direct Manager",
  "uncertainty_category": "POLICY_EXCEPTION",
  "escalation_question": "The expense 'Project celebration dinner' ($320.00) contains alcoholic beverages (wine). Does the manager approve this as an authorized business entertainment exception?",
  "reason": "The expense includes alcoholic beverages requiring exception review per Article 8.4 and Article 19.",
  "policy_reference": "Article 8.4 & Article 19: Business meals & out-of-policy exceptions",
  "confidence_score": 0.95
}
```

---

### 2.3. Evaluate Testcase Suite

#### `GET /api/testcases`
Retrieves pre-defined benchmark test cases (if any exist in the environment). Defaults to empty if none are preset.

- **Method**: `GET`
- **Response (`200 OK`)**:
```json
{
  "total": 0,
  "testcases": []
}
```

#### `POST /api/testcases/evaluate-batch`
Runs an evaluation pass over a batch of configured test cases.

- **Method**: `POST`
- **Request Body**:
```json
{
  "testcases": [
    {
      "id": "TC-01",
      "employee_name": "Sarah Connor",
      "employee_id": "EMP-304",
      "amount": 45.00,
      "category": "meal",
      "description": "Lunch meeting with contractor",
      "days_since_expense": 2,
      "has_receipt": true
    }
  ]
}
```
- **Response (`200 OK`)**:
```json
{
  "batch_id": "BATCH-2026-001",
  "total_evaluated": 1,
  "results": [
    {
      "id": "TC-01",
      "decision": "APPROVE",
      "target_role": "System Automated (ERP Accounting)",
      "reason": "Standard compliant claim within daily limit",
      "policy_reference": "Article 5"
    }
  ]
}
```

---

## 3. Decision Matrix & Routing Rules

The referee agent classifies each claim into a structured resolution:

| Trigger Condition | Decision | Uncertainty Category | Target Escalation Role | Policy Ref |
|---|---|---|---|---|
| Compliant, receipt valid, ≤ daily limits | `APPROVE` | `NONE` | `System Automated (ERP Accounting)` | Article 5 |
| Blurry, folded, or unreadable receipt | `ESCALATE` | `UNCERTAIN_FACTS` (Perceptual) | `Employee / Accounts Payable` | Article 3.4 |
| Single purchase > $5,000 | `ESCALATE` | `AUTHORITY_LIMIT` (Conflict) | `Procurement Department` | Article 4.4, Article 13 |
| Alcohol / gift cards / exception items | `ESCALATE` | `POLICY_EXCEPTION` | `Direct Manager` | Article 8.4, Article 19 |
| Submitted > 30 days overdue | `ESCALATE` | `POLICY_EXCEPTION` | `Direct Manager` | Article 3.5 |
| Requester == Approver (self-approval) | `ESCALATE` | `AUTHORITY_LIMIT` | `Direct Manager / HR` | Article 3.6, Article 17 |
