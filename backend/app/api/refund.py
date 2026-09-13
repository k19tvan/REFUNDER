import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Request
from pydantic import BaseModel, Field

from ..pipeline import (
    FormData, parse_form_data,
    ExtractedReceipt, extract_receipt_info,
    MasterContext, build_master_context,
    Decision, arbitrate_claim
)

router = APIRouter(tags=["Refund Workflow Pipeline"])

IN_MEMORY_REFUND_DB: Dict[str, Dict[str, Any]] = {}

class RefundResponse(BaseModel):
    claim_id: str = Field(..., description="Unique claim identifier")
    status: str = Field(..., description="Approve, Reject, or Escalation")
    decision: Decision = Field(..., description="Final arbitration decision (Purple Circle)")
    extracted_receipt: ExtractedReceipt = Field(..., description="Extracted receipt evidence (Yellow Circle)")
    master_context: MasterContext = Field(..., description="Consolidated context (Green Circle)")

@router.post("/refund", response_model=RefundResponse)
@router.post("/refund/", response_model=RefundResponse)
async def process_refund(
    request: Request,
    form_data: Optional[str] = Form(None, description="Serialized JSON string of FormData (Red Circle)"),
    receipt_file: Optional[UploadFile] = File(None, description="Receipt image or PDF document"),
    answer: Optional[str] = Form(None, description="User answer resolving an escalation question")
):
    """
    Executes the end-to-end refund pipeline workflow:
    1. parse_form_data: Parses user form input (Red Circle).
    2. extract_receipt_info: Extracts receipt evidence via OCR (Yellow Circle).
    3. build_master_context: Combines Form, Receipt, and optional User Answer (Green Circle).
    4. arbitrate_claim: Evaluates context with the Agent to produce a Decision (Purple Circle).
    """
    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        try:
            body = await request.json()
            form_obj = parse_form_data(body)
            has_file = "blurry" not in (form_obj.description or "").lower() and "mờ" not in (form_obj.description or "").lower()
            user_ans = body.get("answer") or form_obj.answer
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {str(e)}")
    else:
        if not form_data:
            raise HTTPException(status_code=400, detail="Missing form_data in multipart request")
        try:
            form_obj = parse_form_data(form_data)
            has_file = receipt_file is not None
            user_ans = answer or form_obj.answer
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid form_data: {str(e)}")

    claim_id = form_obj.claim_id or f"CLM-{uuid.uuid4().hex[:8].upper()}"

    # Step 1: Extract receipt data (Yellow Circle 🟡)
    extracted = await extract_receipt_info(
        receipt_file=receipt_file if has_file else None,
        description_hint=form_obj.description,
        has_receipt=has_file
    )

    # Step 2: Combine into Master Context (Green Circle 🟢)
    master_context = build_master_context(
        form_data=form_obj,
        extracted_receipt=extracted,
        user_answer=user_ans
    )

    # Step 3: Agent Arbitration (Purple Circle 🟣)
    decision = await arbitrate_claim(master_context)
    decision.claim_id = claim_id

    # Persist claim state
    record = {
        "claim_id": claim_id,
        "status": decision.status.value,
        "decision": decision.model_dump(),
        "extracted_receipt": extracted.model_dump(),
        "master_context": master_context.model_dump()
    }
    IN_MEMORY_REFUND_DB[claim_id] = record

    return RefundResponse(
        claim_id=claim_id,
        status=decision.status.value,
        decision=decision,
        extracted_receipt=extracted,
        master_context=master_context
    )

@router.get("/refund/{claim_id}")
async def get_refund_claim(claim_id: str):
    """
    Retrieves the persisted claim status and execution details for an existing refund claim.
    """
    if claim_id not in IN_MEMORY_REFUND_DB:
        raise HTTPException(status_code=404, detail="Claim ID not found")
    return IN_MEMORY_REFUND_DB[claim_id]

