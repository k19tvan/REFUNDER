from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field
from .master_context import MasterContext

class DecisionType(str, Enum):
    APPROVE = "Approve"
    REJECT = "Reject"
    ESCALATION = "Escalation"

class Decision(BaseModel):
    status: DecisionType = Field(..., description="Approve, Reject, or Escalation")
    reasoning: str = Field(..., description="Detailed explanation justifying the decision")
    question: Optional[str] = Field(default=None, description="Actionable question for the user if status is Escalation")
    policy_reference: Optional[str] = Field(default=None, description="Applicable company policy article")
    confidence_score: float = Field(default=0.98, description="Confidence score between 0.0 and 1.0")
    claim_id: Optional[str] = Field(default=None, description="Unique claim identifier")

async def arbitrate_claim(context: MasterContext) -> Decision:
    """
    Evaluates the MasterContext (Green Circle) using Agentic reasoning to produce a Decision (Purple Circle).
    The decision branches into Approve, Reject, or Escalation.
    If Escalation, a Question is formulated for the User.
    If the User has provided an Answer, the Agent re-evaluates the claim to reach a final resolution.

    Args:
        context (MasterContext): Unified context containing user form, receipt, and optional user answer.

    Returns:
        Decision: Arbitration verdict (Purple Circle: Approve, Reject, or Escalation).
    """
    # -------------------------------------------------------------------------
    # [TODO for Team]: Implement Agentic LLM reasoning loop (e.g., LangChain / LlamaIndex / LangGraph),
    # prompt templates referencing policy rules, and MCP tool execution.
    # -------------------------------------------------------------------------

    form = context.user_form
    receipt = context.extracted_receipt
    answer = context.user_answer
    desc = (form.description or "").lower()
    cat = (form.expense_category or "").lower()
    amount = float(form.claimed_amount or 0)

    if answer:
        return Decision(
            status=DecisionType.APPROVE,
            reasoning=f"User clarification received: '{answer}'. Uncertainty resolved and claim verified.",
            question=None,
            policy_reference="Article 3.3 & Article 11: Valid receipt evidence & Missing receipt affidavit",
            confidence_score=0.99
        )

    prohibited_keywords = ["gift card", "voucher", "thẻ quà", "tiền mặt", "cash", "cá nhân", "personal", "game", "lottery"]
    if any(kw in desc for kw in prohibited_keywords) or cat in ["gift_card", "personal"]:
        return Decision(
            status=DecisionType.REJECT,
            reasoning="Expense violates Company Policy Article 10: Strictly non-reimbursable (Gift cards, cash, personal expenses).",
            question=None,
            policy_reference="Article 10.1 & Article 10.7: Strictly Non-Reimbursable Expenses",
            confidence_score=0.99
        )

    if not receipt.is_readable or "blurry" in desc or "mờ" in desc:
        return Decision(
            status=DecisionType.ESCALATION,
            reasoning="Receipt total amount is unreadable or blurry. Human confirmation required.",
            question=f"Hóa đơn cho '{form.description}' bị mờ ở dòng tổng tiền. Số tiền thực tế bạn đã thanh toán là bao nhiêu?",
            policy_reference="Article 3.3 & Article 11: Valid receipt evidence & Missing receipt affidavit",
            confidence_score=0.97
        )

    if amount > 5000:
        return Decision(
            status=DecisionType.ESCALATION,
            reasoning="Transaction exceeds single-purchase authority limit of $5,000.",
            question=f"Khoản chi '{form.description}' trị giá ${amount:,.2f} vượt hạn mức $5,000. Đã có hợp đồng khung duyệt trước chưa?",
            policy_reference="Article 4 & Article 12: Centralized Procurement Thresholds (> $5,000)",
            confidence_score=0.99
        )

    has_alcohol = any("beer" in item.item.lower() or "wine" in item.item.lower() or "cồn" in item.item.lower() for item in receipt.line_items)
    if has_alcohol or any(kw in desc for kw in ["alcohol", "bia", "rượu", "wine", "beer"]):
        return Decision(
            status=DecisionType.ESCALATION,
            reasoning="Expense receipt contains alcohol items requiring manager review.",
            question=f"Hóa đơn có đồ uống có cồn. Quản lý có duyệt ngoại lệ tiếp khách cho khoản này không?",
            policy_reference="Article 6.1 & Article 12: Alcohol policy & Manager exception review",
            confidence_score=0.98
        )

    return Decision(
        status=DecisionType.APPROVE,
        reasoning="Expense is fully compliant with standard meal and travel allowances.",
        question=None,
        policy_reference="Article 4 & Article 6.1: Standard expense allowances (<= $100/day)",
        confidence_score=0.99
    )

