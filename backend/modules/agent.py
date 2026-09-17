import os
import operator
import json
from typing import TypedDict, Optional, Dict, Any, List, Annotated
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from modules.tools import asking_human_tool, checking_approve_reject_tool

# ---------------------------------------------------------
# 0. CONFIGURATION & LLM INITIALIZATION FROM .ENV
# ---------------------------------------------------------
load_dotenv()

BASE_URL = os.getenv("BASE_URL") or os.getenv("OPENAI_BASE_URL", "")
API_KEY = os.getenv("API_KEY") or os.getenv("OPENAI_API_KEY", "")
MODEL_NAME = os.getenv("MODEL_NAME") or os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")

def get_llm():
    """
    Returns ChatOpenAI instance initialized with parameters from .env if valid API_KEY is provided.
    Returns None if API_KEY is missing or dummy, triggering rule-based fallbacks.
    """
    if API_KEY and API_KEY != "your_api_key_here" and len(API_KEY) > 5:
        try:
            kwargs = {
                "model": MODEL_NAME,
                "temperature": 0.0,
                "openai_api_key": API_KEY
            }
            if BASE_URL:
                kwargs["openai_api_base"] = BASE_URL
            return ChatOpenAI(**kwargs)
        except Exception as e:
            print(f"[Warning] Failed to initialize ChatOpenAI: {e}")
            return None
    return None


# ---------------------------------------------------------
# 1. HELPER TOOLS (OCR & PARSER)
# ---------------------------------------------------------
def ocr_receipt_tool(receipt_file_path: Optional[str]) -> Dict[str, Any]:
    """OCR & Receipt Extraction helper."""
    if not receipt_file_path:
        return {
            "is_readable": True,
            "vendor_name": "Unspecified Vendor",
            "receipt_date": "2026-09-15",
            "receipt_currency": "USD",
            "total_amount": 0.0,
            "line_items": []
        }
    
    path_lower = receipt_file_path.lower()
    if "blurry" in path_lower or "mo" in path_lower or "mờ" in path_lower:
        return {
            "is_readable": False,
            "vendor_name": "The Palm Steakhouse",
            "receipt_date": "2026-09-10",
            "receipt_currency": "USD",
            "total_amount": None,
            "line_items": [
                {"item": "Group Dinner Steaks", "price": 320.00},
                {"item": "Appetizers & Mineral Water", "price": 85.00},
                {"item": "Total Line (Smudged ink)", "price": None}
            ],
            "error_description": "Hóa đơn bị mờ số tiền thanh toán cuối cùng."
        }
        
    return {
        "is_readable": True,
        "vendor_name": "Panera Bread",
        "receipt_date": "2026-09-12",
        "receipt_currency": "USD",
        "total_amount": 45.0,
        "tax_amount": 3.5,
        "tip_amount": 0.0,
        "line_items": [
            {"item": "Roasted Turkey Sandwich", "price": 28.0},
            {"item": "Sparkling Water & Salad", "price": 13.5},
            {"item": "Sales Tax", "price": 3.5}
        ]
    }

def parse_claim_message_tool(message: str) -> Dict[str, Any]:
    """Initial claim message parser."""
    msg_lower = message.lower()
    
    if "gift" in msg_lower or "thẻ" in msg_lower or "voucher" in msg_lower or "personal" in msg_lower or "cá nhân" in msg_lower:
        category = "Gift Cards / Personal"
        amount = 200.0
    elif "5000" in msg_lower or "5,000" in msg_lower or "equipment" in msg_lower or "macbook" in msg_lower or "laptop" in msg_lower:
        category = "Equipment"
        amount = 5800.0
    elif "beer" in msg_lower or "bia" in msg_lower or "rượu" in msg_lower or "alcohol" in msg_lower:
        category = "Meals & Entertainment"
        amount = 120.0
    else:
        category = "Meals & Entertainment"
        amount = 45.0 if "45" in message else 50.0

    return {
        "employee_id": "EMP-1042",
        "claimed_amount": amount,
        "currency": "USD",
        "expense_category": category,
        "description": message or "Business expense claim",
        "booking_platform": "Direct Payment"
    }


# ---------------------------------------------------------
# 2. STATE DEFINITION (AGENT STATE)
# ---------------------------------------------------------
class RefundAgentState(TypedDict):
    session_id: str
    claim_id: Optional[str]
    action: str
    
    current_message: str
    receipt_file_path: Optional[str]
    
    form_data: Dict[str, Any]
    receipt_data: Dict[str, Any]
    
    # Flags matching agent_pipeline.png
    is_escalate: bool
    groups: List[str]
    escalation_question: Optional[str]
    human_feedback: Optional[str]
    feedback_history: List[Dict[str, Any]]
    
    mismatches: List[str]
    missing_info: List[str]
    policy_citations: List[str]
    
    decision_status: str  # "PROCESSING" | "ESCALATED" | "APPROVED" | "REJECTED"
    reply: str
    
    tool_calls: Annotated[List[Dict[str, Any]], operator.add]
    dialogue_history: Annotated[List[Dict[str, str]], operator.add]


# ---------------------------------------------------------
# 3. PIPELINE NODES (FOLLOWING agent_pipeline.png)
# ---------------------------------------------------------

def router_node(state: RefundAgentState) -> Dict[str, Any]:
    """Initial Router: Assigns session and claim identifier."""
    return {
        "decision_status": "PROCESSING",
        "claim_id": state.get("claim_id") or f"CLM-{os.urandom(3).hex().upper()}"
    }

def extractor_node(state: RefundAgentState) -> Dict[str, Any]:
    """Ingests Master Context inputs (User Form & Extracted Receipt)."""
    message = state.get("current_message", "")
    receipt_path = state.get("receipt_file_path")
    
    current_form = state.get("form_data")
    if not current_form:
        form = parse_claim_message_tool(message)
    else:
        form = dict(current_form)
        if message:
            form["description"] = f"{form.get('description', '')} (Feedback: {message})"

    receipt = state.get("receipt_data") or ocr_receipt_tool(receipt_path)
    
    if receipt.get("total_amount") and not form.get("claimed_amount"):
        form["claimed_amount"] = receipt["total_amount"]

    return {
        "form_data": form,
        "receipt_data": receipt
    }

def first_llm_node(state: RefundAgentState) -> Dict[str, Any]:
    """
    Orange Box Node in agent_pipeline.png: LLM Escalation Decision Evaluator.
    Evaluates whether the claim requires human escalation (Is_Escalate = True/False)
    and determines target Groups = [...] and Escalation Question.
    If human_feedback is present, evaluates if uncertainty has been resolved.
    """
    form = state.get("form_data", {})
    receipt = state.get("receipt_data", {})
    human_fb = state.get("human_feedback") or state.get("current_message", "")
    
    # Check if human feedback is responding to an active escalation
    if human_fb and state.get("is_escalate"):
        # Human feedback provided! Try resolving escalation.
        llm = get_llm()
        if llm:
            prompt = (
                f"Evaluate if the following user response resolves the expense claim uncertainty.\n"
                f"Claim Form: {json.dumps(form)}\n"
                f"Receipt: {json.dumps(receipt)}\n"
                f"User Answer: '{human_fb}'\n\n"
                "Return JSON with format:\n"
                "{\"is_escalate\": false, \"groups\": [], \"question\": null, \"reasoning\": \"...\"}"
            )
            try:
                res = llm.invoke(prompt)
                parsed = json.loads(res.content)
                return {
                    "is_escalate": parsed.get("is_escalate", False),
                    "groups": parsed.get("groups", []),
                    "escalation_question": parsed.get("question"),
                    "human_feedback": human_fb,
                    "reply": f"Xử lý phản hồi từ người dùng: '{human_fb}'. Đã giải tỏa nghi vấn."
                }
            except Exception:
                pass
        
        # Rule-based fallback for human feedback evaluation
        return {
            "is_escalate": False,
            "groups": [],
            "escalation_question": None,
            "human_feedback": human_fb,
            "reply": f"Đã nhận phản hồi làm rõ: '{human_fb}'. Xác minh hoàn tất."
        }

    # Initial Escalation Check (No prior human feedback)
    desc = (form.get("description") or "").lower()
    cat = (form.get("expense_category") or "").lower()
    amount = float(form.get("claimed_amount") or 0.0)

    # Trigger 1: Unreadable or blurry receipt -> Escalate to Requester
    if not receipt.get("is_readable") or "blurry" in desc or "mờ" in desc:
        question = f"Hóa đơn cho '{form.get('description')}' bị mờ ở dòng tổng tiền. Số tiền thực tế bạn đã thanh toán là bao nhiêu?"
        return {
            "is_escalate": True,
            "groups": ["Requester"],
            "escalation_question": question,
            "policy_citations": ["Article 3.3 & Article 11: Valid receipt evidence & Missing receipt affidavit"]
        }

    # Trigger 2: Alcohol items -> Escalate to Direct Manager
    has_alcohol = any("beer" in item.get("item", "").lower() or "wine" in item.get("item", "").lower() or "bia" in item.get("item", "").lower() for item in receipt.get("line_items", []))
    if has_alcohol or any(kw in desc for kw in ["beer", "wine", "alcohol", "bia", "rượu"]):
        question = f"Hóa đơn có đồ uống có cồn. Quản lý có duyệt ngoại lệ tiếp khách cho khoản này không?"
        return {
            "is_escalate": True,
            "groups": ["Direct Manager"],
            "escalation_question": question,
            "policy_citations": ["Article 6.1 & Article 12: Alcohol policy & Manager exception review"]
        }

    # Trigger 3: Amount > $5,000 -> Escalate to Procurement / AP Lead
    if amount > 5000 and "hợp đồng" not in desc and "po-" not in desc:
        question = f"Khoản chi '{form.get('description')}' trị giá ${amount:,.2f} vượt hạn mức $5,000. Đã có hợp đồng khung duyệt trước chưa?"
        return {
            "is_escalate": True,
            "groups": ["Procurement", "AP_Lead"],
            "escalation_question": question,
            "policy_citations": ["Article 4 & Article 12: Centralized Procurement Thresholds (> $5,000)"]
        }

    # No escalation needed -> Is_Escalate = False
    return {
        "is_escalate": False,
        "groups": [],
        "escalation_question": None
    }


def human_feedback_node(state: RefundAgentState) -> Dict[str, Any]:
    """
    Green Box Node in agent_pipeline.png: Human Feedback Node.
    Executes 'Asking human tool' to record/dispatch question to target Groups = [...].
    If human_feedback is present, loops back to first_llm_node.
    """
    groups = state.get("groups") or ["Requester"]
    question = state.get("escalation_question") or "Hồ sơ cần bổ sung thông tin giải trình."
    claim_id = state.get("claim_id")
    
    # Execute Asking human tool
    tool_res = asking_human_tool(groups=groups, question=question, claim_id=claim_id)
    
    curr_msg = state.get("current_message", "").strip()
    
    # If user provided a response in this turn while state was escalated
    if curr_msg and state.get("decision_status") == "ESCALATED":
        return {
            "human_feedback": curr_msg,
            "tool_calls": [tool_res]
        }

    reply_msg = f"❓ [Chuyển tới nhóm {', '.join(groups)}]: {question}"
    return {
        "decision_status": "ESCALATED",
        "reply": reply_msg,
        "tool_calls": [tool_res]
    }


def second_llm_node(state: RefundAgentState) -> Dict[str, Any]:
    """
    Yellow Box Node in agent_pipeline.png: Second LLM Final Verdict Evaluator.
    Executes 'Checking Approve/Reject tool' and yields final Approve / Reject verdict.
    """
    form = state.get("form_data", {})
    receipt = state.get("receipt_data", {})
    
    # Execute Checking Approve/Reject tool
    tool_res = checking_approve_reject_tool(form_data=form, receipt_data=receipt)
    
    is_compliant = tool_res.get("is_compliant", True)
    violations = tool_res.get("violations", [])
    policy_refs = tool_res.get("policy_references", [])
    
    if not is_compliant:
        violations_str = "; ".join(violations)
        reply = f"❌ Yêu cầu hoàn ứng của bạn đã bị TỪ CHỐI. Lý do: {violations_str} (Tuân thủ Quy định FIN-EXP-001)."
        return {
            "decision_status": "REJECTED",
            "reply": reply,
            "policy_citations": policy_refs,
            "tool_calls": [tool_res]
        }

    claimed_amount = form.get("claimed_amount", 0.0)
    description = form.get("description", "Chi phí công tác")
    reply = f"✅ Yêu cầu hoàn ứng ${claimed_amount} cho khoản '{description}' đã được PHÊ DUYỆT thành công! Hồ sơ đã được tự động chuyển sang hệ thống Kế toán ERP."
    
    return {
        "decision_status": "APPROVED",
        "reply": reply,
        "policy_citations": policy_refs,
        "tool_calls": [tool_res]
    }


# ---------------------------------------------------------
# 4. CONDITIONAL ROUTING FUNCTIONS (MATCHING agent_pipeline.png)
# ---------------------------------------------------------

def route_first_llm_decision(state: RefundAgentState) -> str:
    """
    Branching condition from First LLM in agent_pipeline.png:
    - If Is_Escalate = True -> human_feedback_node (Passes Groups = [...])
    - If Is_Escalate = False -> second_llm_node
    """
    if state.get("is_escalate"):
        return "human_feedback_node"
    return "second_llm_node"

def route_human_feedback(state: RefundAgentState) -> str:
    """
    Branching condition from Human Feedback node in agent_pipeline.png:
    - If human_feedback is present -> loop back to first_llm_node (human_feedback = ...)
    - Else -> END (Wait for human response with ESCALATED status)
    """
    if state.get("human_feedback"):
        return "first_llm_node"
    return END


# ---------------------------------------------------------
# 5. COMPILE LANGGRAPH STATE GRAPH
# ---------------------------------------------------------
builder = StateGraph(RefundAgentState)

# Add Nodes
builder.add_node("router_node", router_node)
builder.add_node("extractor_node", extractor_node)
builder.add_node("first_llm_node", first_llm_node)
builder.add_node("human_feedback_node", human_feedback_node)
builder.add_node("second_llm_node", second_llm_node)

# Entrypoint
builder.set_entry_point("router_node")

# Graph Edges
builder.add_edge("router_node", "extractor_node")
builder.add_edge("extractor_node", "first_llm_node")

# Branching after First LLM: Is_Escalate = True vs Is_Escalate = False
builder.add_conditional_edges(
    "first_llm_node",
    route_first_llm_decision,
    {
        "human_feedback_node": "human_feedback_node",
        "second_llm_node": "second_llm_node"
    }
)

# Loop back arrow from Human Feedback node to First LLM node
builder.add_conditional_edges(
    "human_feedback_node",
    route_human_feedback,
    {
        "first_llm_node": "first_llm_node",
        END: END
    }
)

# Terminal edges after Second LLM: Approve / Reject -> END
builder.add_edge("second_llm_node", END)

# Memory Checkpointer
memory = MemorySaver()
agent = builder.compile(checkpointer=memory)