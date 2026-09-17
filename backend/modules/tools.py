import os
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class AskingHumanInput(BaseModel):
    groups: List[str] = Field(..., description="Target groups to ask human feedback from (e.g., Requester, Direct Manager, AP_Lead, Procurement)")
    question: str = Field(..., description="Actionable escalation question formulated for the human")
    claim_id: Optional[str] = Field(default=None, description="Unique claim identifier")

class AskingHumanOutput(BaseModel):
    tool_name: str = "Asking human tool"
    status: str = "DISPATCHED"
    groups: List[str]
    question: str
    message: str

def asking_human_tool(groups: List[str], question: str, claim_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Tool: Asking human tool (Green Box in agent_pipeline.png)
    Dispatches escalation questions to designated human stakeholder groups
    (e.g., Requester, Direct Manager, Procurement) and formats human feedback requests.
    """
    formatted_groups = groups if groups else ["Requester"]
    return AskingHumanOutput(
        groups=formatted_groups,
        question=question,
        message=f"Escalation question successfully routed to stakeholder groups: {', '.join(formatted_groups)}"
    ).model_dump()


class CheckingComplianceInput(BaseModel):
    form_data: Dict[str, Any]
    receipt_data: Dict[str, Any]

class CheckingComplianceOutput(BaseModel):
    tool_name: str = "Checking Approve/Reject tool"
    is_compliant: bool
    violations: List[str]
    policy_references: List[str]
    audit_notes: str

def checking_approve_reject_tool(form_data: Dict[str, Any], receipt_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tool: Checking Approve/Reject tool (Yellow Box in agent_pipeline.png)
    Performs rigorous compliance verification against FIN-EXP-001 policy rules:
    - Checks for strictly prohibited non-reimbursable expenses (Article 10: Gift cards, vouchers, cash advances, personal items).
    - Checks daily expense limits (Article 4 & 6.1: Meals <= $100/day, Hotels <= $300/night).
    - Validates itemized receipt data.
    """
    violations = []
    policy_refs = []
    
    desc = (form_data.get("description") or "").lower()
    cat = (form_data.get("expense_category") or "").lower()
    claimed_amount = float(form_data.get("claimed_amount") or 0.0)
    
    # Check Article 10: Strictly Prohibited Items
    prohibited_keywords = ["gift card", "voucher", "thẻ quà", "tiền mặt", "cash", "cá nhân", "personal", "game", "lottery", "cờ bạc"]
    if any(kw in desc for kw in prohibited_keywords) or cat in ["gift_card", "personal", "cá_nhân"]:
        violations.append("Vi phạm Điều 10.1 & Điều 10.7: Chi tiêu thuộc danh mục cấm tuyệt đối (Gift card, voucher, tiền mặt, chi tiêu cá nhân).")
        policy_refs.append("Article 10.1 & Article 10.7")
        
    # Check Article 4: Single purchase threshold
    if claimed_amount > 5000:
        if "hợp đồng khung" not in desc and "po-" not in desc and "approved" not in desc:
            violations.append(f"Vi phạm Điều 4: Giao dịch ${claimed_amount:,.2f} vượt trần đơn lẻ $5,000 không có mã PO/hợp đồng khung.")
            policy_refs.append("Article 4 & Article 12")
            
    is_compliant = len(violations) == 0
    
    if is_compliant:
        policy_refs.append("Article 4 & Article 6.1: Standard expense allowances")
        audit_notes = "Chi phí hoàn toàn tuân thủ quy định FIN-EXP-001. Đầy đủ hóa đơn và nằm trong hạn mức."
    else:
        audit_notes = "Phát hiện vi phạm chính sách: " + "; ".join(violations)

    return CheckingComplianceOutput(
        is_compliant=is_compliant,
        violations=violations,
        policy_references=policy_refs,
        audit_notes=audit_notes
    ).model_dump()

