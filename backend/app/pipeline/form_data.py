from typing import Optional, Any
from pydantic import BaseModel, Field

class FormData(BaseModel):
    employee_id: str = Field(..., description="Employee identifier (e.g., EMP-1001)")
    claimed_amount: float = Field(..., description="Monetary amount requested for reimbursement")
    currency: str = Field(default="USD", description="Currency ISO code")
    expense_category: str = Field(..., description="Category: Meals, Travel, Equipment, Hotel, Personal")
    description: str = Field(..., description="Business purpose or expense justification")
    expense_date: Optional[str] = Field(default=None, description="Date of transaction (YYYY-MM-DD)")
    booking_platform: Optional[str] = Field(default="Direct Payment", description="Booking platform")
    days_since_expense: Optional[int] = Field(default=1, description="Days elapsed since expense incurred")
    approver_id: Optional[str] = Field(default=None, description="Manager ID for approval routing")
    claim_id: Optional[str] = Field(default=None, description="Claim identifier if continuing an existing claim")
    answer: Optional[str] = Field(default=None, description="User answer responding to an escalation question")

def parse_form_data(raw_form: Any) -> FormData:
    """
    Parses and validates incoming user claim data into a structured FormData model.
    Represents the Form (Red Circle) in the pipeline architecture.

    Args:
        raw_form (Any): Raw JSON string or dictionary representing user claim inputs.

    Returns:
        FormData: Validated domain model representing the red circle (Form) in the pipeline.
    """
    # -------------------------------------------------------------------------
    # [TODO for Team]: Add custom validation, currency sanitization,
    # or employee profile verification here.
    # -------------------------------------------------------------------------

    if isinstance(raw_form, str):
        import json
        data = json.loads(raw_form)
    elif isinstance(raw_form, dict):
        data = raw_form
    else:
        raise ValueError("Invalid form input format. Expected JSON string or dictionary.")

    return FormData(**data)

