from typing import Optional
from pydantic import BaseModel, Field
from .form_data import FormData
from .ocr_receipt import ExtractedReceipt

class SystemContext(BaseModel):
    current_date: str = Field(default="2026-09-13", description="Current execution date")
    employee_location: str = Field(default="US", description="Location of employee")
    manager_id: str = Field(default="MGR-2001", description="Assigned supervisor")
    policy_version: str = Field(default="FIN-EXP-001", description="Active policy version")

class MasterContext(BaseModel):
    user_form: FormData = Field(..., description="User form data (Red Circle)")
    extracted_receipt: ExtractedReceipt = Field(..., description="Extracted receipt data (Yellow Circle)")
    system_context: SystemContext = Field(default_factory=SystemContext, description="System metadata and policies")
    user_answer: Optional[str] = Field(default=None, description="User answer resolving previous escalation question")

def build_master_context(
    form_data: FormData,
    extracted_receipt: ExtractedReceipt,
    user_answer: Optional[str] = None
) -> MasterContext:
    """
    Combines User Form (Red Circle) and Extracted Receipt (Yellow Circle) into Master Context (Green Circle).
    Also attaches the User Answer if the user is responding to an Escalation Question.

    Args:
        form_data (FormData): The parsed user claim inputs.
        extracted_receipt (ExtractedReceipt): The OCR/Vision extracted receipt data.
        user_answer (Optional[str]): Answer provided by the user if this claim was escalated.

    Returns:
        MasterContext: Consolidated context (Green Circle) ready for the Agent.
    """
    # -------------------------------------------------------------------------
    # [TODO for Team]: Add business enrichment here (e.g., fetch employee grade,
    # remaining quarterly budget, currency conversion, policy rules from Vector DB).
    # -------------------------------------------------------------------------

    effective_answer = user_answer or form_data.answer

    return MasterContext(
        user_form=form_data,
        extracted_receipt=extracted_receipt,
        system_context=SystemContext(
            current_date="2026-09-13",
            employee_location="US",
            manager_id=form_data.approver_id or "MGR-2001",
            policy_version="FIN-EXP-001"
        ),
        user_answer=effective_answer
    )

