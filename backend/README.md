# Refunder Backend Service

REST API backend skeleton for the **Refunder (The Escalation Referee)** system.

All endpoints are scaffolded with data contracts matching the 4 data circles (🔴 Form Data, 🟡 Extracted Receipt, 🟢 Master Context, 🟣 Decision Payload), currently wired with **dummy responses** so you and your team can test the entire workflow, frontend integration, and end-to-end routing immediately before implementing the actual LLM Agent and Vision OCR models.

---

## 📁 Directory Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point, CORS configuration, route inclusion
│   ├── config.py            # Port, host, and allowed CORS origins
│   ├── dummy_data.py        # Centralized mock payloads for all pipeline stages
│   ├── models/              # Pydantic Schemas matching the 4 data payload circles
│   │   ├── form_data.py     # 🔴 CỤC ĐỎ: Form Data Payload (User input)
│   │   ├── ocr_receipt.py   # 🟡 CỤC VÀNG: Extracted Receipt Payload (Vision output)
│   │   ├── master_context.py# 🟢 CỤC XANH LÁ: Master Context (Form + Receipt + System)
│   │   ├── decision.py      # 🟣 CỤC TÍM: Decision Payload (APPROVE / REJECT / ESCALATE)
│   │   └── resolution.py    # Human-in-the-Loop Feedback Payload
│   └── routers/             # Endpoint handlers
│       ├── claims.py        # POST /api/v1/claims/submit & /resolve
│       ├── ocr.py           # POST /api/v1/ocr/extract
│       ├── agent.py         # POST /api/v1/agent/arbitrate
│       ├── policy.py        # GET /api/v1/policy & POST /import
│       └── verify.py        # GET /api/v1/verify/escalation (90s Fast Check)
├── run.py                   # Universal runner (FastAPI/Uvicorn or zero-dependency fallback)
├── requirements.txt         # fastapi, uvicorn, pydantic, python-multipart
└── Dockerfile               # Production container definition
```

---

## 🚀 How to Run

### Option 1: Standard FastAPI (Recommended for Development)
```bash
cd backend
pip install -r requirements.txt
python run.py
# Server will start on http://localhost:8000
# Interactive Swagger docs: http://localhost:8000/docs
```

### Option 2: Zero-Dependency Fallback
If `uvicorn` or `fastapi` is not yet installed in your environment, `python run.py` will automatically fall back to the built-in HTTP mock server serving the exact same endpoints and CORS headers on port `8000`.

```bash
cd backend
python run.py
```

### Option 3: Docker
```bash
cd backend
docker build -t refunder-backend .
docker run -p 8000:8000 refunder-backend
```

---

## 📡 API Endpoints & Dummy Behaviors

| Step | Endpoint | Method | Input Payload | Output / Dummy Behavior |
|---|---|---|---|---|
| **1. Full Pipeline** | `/api/v1/claims/submit` | `POST` | `multipart/form-data`: `form_data` (🔴 JSON) + `receipt_file` | Returns `claim_id`, `extracted_receipt` (🟡) and `verdict` (🟣) |
| **2. OCR Module** | `/api/v1/ocr/extract` | `POST` | `multipart/form-data`: `receipt_image` | Returns 🟡 Extracted Receipt (`vendor_name`, `line_items`, etc.) |
| **3. Agent Arbitrate**| `/api/v1/agent/arbitrate` | `POST` | `application/json`: 🟢 Master Context | Returns 🟣 Decision (`APPROVE`, `REJECT`, or `ESCALATE`) |
| **4. Human Feedback** | `/api/v1/claims/{id}/resolve`| `POST` | `application/json`: `{ responder_role, answer_notes }` | Settles claim, updates audit trail, routes to ERP |
| **5. 90s Benchmark**  | `/api/v1/verify/escalation` | `GET` | None | Returns official 5-case benchmark with `status: "PASS"` |
| **6. Policy**         | `/api/v1/policy` | `GET` | None | Returns active markdown regulations (FIN-EXP-001) |
| **6. Policy Import**  | `/api/v1/policy/import` | `POST` | `{ filename, content }` | Saves/indexes updated policy document |

---

## 🛠️ Where to Implement Real Logic Later

1. **OCR / Vision Extraction**:
   - File: `app/routers/ocr.py`
   - Replace the dummy extraction with Google Gemini Vision API, GPT-4o, or Document AI.
2. **Referee Agent & Tool Calling**:
   - File: `app/routers/agent.py`
   - Replace the dummy routing logic with your LangChain / LlamaIndex / Agentic prompt pipeline calling policy search tools and currency conversion.
3. **Database Integration**:
   - Replace `IN_MEMORY_CLAIMS_DB` in `app/dummy_data.py` with PostgreSQL, MongoDB, or SQLite.

