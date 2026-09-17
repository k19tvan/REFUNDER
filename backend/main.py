import os
import uuid
from typing import Optional
from fastapi import FastAPI, File, Form, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from modules.agent import agent, RefundAgentState
import uvicorn

app = FastAPI(title="Refunder Backend")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

POLICY_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "documentation", "policy.md")
)

@app.get("/api/policy")
async def get_policy():
    """Endpoint trả về nội dung chính sách cho UI."""
    content = ""
    if os.path.exists(POLICY_PATH):
        with open(POLICY_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        alt_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "policy.md")
        )
        if os.path.exists(alt_path):
            with open(alt_path, "r", encoding="utf-8") as f:
                content = f.read()
        else:
            content = "# CHÍNH SÁCH CÔNG TÁC PHÍ (FIN-EXP-001)\n\nChính sách mặc định."

    
    return {
        "filename": "FIN-EXP-001.md",
        "content": content,
        "size": f"{len(content) / 1024:.1f} KB",
        "status": "ACTIVE"
    }


@app.post("/api/chat")
@app.post("/api/chat/")
async def chat_endpoint(
    request: Request,
    session_id: Optional[str] = Form(None),
    message: Optional[str] = Form(""),
    claim_id: Optional[str] = Form(None),
    action: Optional[str] = Form("MESSAGE"),
    receipt_file: Optional[UploadFile] = File(None)
):
    """
    Endpoint nhận input từ UI Chatbot và kích hoạt LangGraph Agent Workflow.
    """
    effective_session_id = session_id or f"sess_{uuid.uuid4().hex[:8]}"
    
    # Xử lý lưu tạm file upload nếu có
    saved_file_path = None
    if receipt_file:
        os.makedirs("/tmp/refunder_uploads", exist_ok=True)
        saved_file_path = f"/tmp/refunder_uploads/{effective_session_id}_{receipt_file.filename}"
        with open(saved_file_path, "wb") as f:
            f.write(await receipt_file.read())

    # Khởi tạo state gửi vào LangGraph
    input_state: RefundAgentState = {
        "session_id": effective_session_id,
        "claim_id": claim_id,
        "action": action or "MESSAGE",
        "current_message": message or "",
        "receipt_file_path": saved_file_path,
        "tool_calls": [],
        "dialogue_history": [{"role": "user", "content": message}] if message else []
    }

    # Invoke Agent với thread_id checkpointer
    config = {"configurable": {"thread_id": effective_session_id}}
    result = agent.invoke(input_state, config=config)

    # Đóng gói Response theo đúng Contract với Frontend UI
    return {
        "session_id": effective_session_id,
        "claim_id": result.get("claim_id"),
        "reply": result.get("reply", ""),
        "step_status": result.get("decision_status", "PROCESSING"),
        "pipeline_nodes": {
            "form_data": result.get("form_data"),
            "extracted_receipt": result.get("receipt_data"),
            "master_context": {
                "user_form": result.get("form_data"),
                "extracted_receipt": result.get("receipt_data"),
                "mismatches": result.get("mismatches", []),
                "missing_info": result.get("missing_info", []),
                "system_context": {
                    "current_date": "2026-09-15",
                    "employee_location": "US",
                    "manager_id": "MGR-2005",
                    "policy_version": "FIN-EXP-001"
                }
            },
            "tool_calls": result.get("tool_calls", []),
            "decision": {
                "decision_status": result.get("decision_status"),
                "reasoning_log": result.get("reply"),
                "policy_reference": ", ".join(result.get("policy_citations", [])) if result.get("policy_citations") else "Article 4 & FIN-EXP-001",
                "confidence_score": 0.95
            }
        }
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
