from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import UploadFile

class LineItem(BaseModel):
    item: str = Field(..., description="Description of purchased item or service")
    price: float = Field(..., description="Price of the individual item")

class ExtractedReceipt(BaseModel):
    is_readable: bool = Field(default=True, description="Whether the receipt was legible")
    vendor_name: Optional[str] = Field(default=None, description="Merchant or store name")
    receipt_date: Optional[str] = Field(default=None, description="Transaction date on the receipt")
    receipt_currency: str = Field(default="USD", description="Currency detected on receipt")
    total_amount: Optional[float] = Field(default=None, description="Total amount printed on receipt")
    tax_amount: Optional[float] = Field(default=0.0, description="Extracted tax amount")
    tip_amount: Optional[float] = Field(default=0.0, description="Extracted tip amount")
    line_items: List[LineItem] = Field(default_factory=list, description="List of itemized purchases")
    error_description: Optional[str] = Field(default=None, description="Reason if receipt is unreadable")

async def extract_receipt_info(
    receipt_file: Optional[UploadFile] = None,
    description_hint: Optional[str] = None,
    has_receipt: bool = True
) -> ExtractedReceipt:
    """
    Extracts structured data from a physical receipt image or PDF file.
    Represents the INFORMATION EXTRACTION step (Yellow Circle) in the pipeline.

    Args:
        receipt_file (Optional[UploadFile]): Physical receipt document uploaded by the user.
        description_hint (Optional[str]): Text hint from the user form to assist OCR extraction.
        has_receipt (bool): Whether a receipt was provided with the submission.

    Returns:
        ExtractedReceipt: Structured receipt evidence extracted from the document.
    """
    # -------------------------------------------------------------------------
    # [TODO for Team]: Connect to Vision LLM (e.g., Gemini 1.5 Flash / GPT-4o)
    # or Document AI OCR service to perform real-world text extraction.
    # -------------------------------------------------------------------------

    fn = (receipt_file.filename if receipt_file else "").lower()
    hint = (description_hint or "").lower()

    if not has_receipt or "blurry" in fn or "mờ" in hint or "mo" in fn:
        return ExtractedReceipt(
            is_readable=False,
            vendor_name=None,
            receipt_date=None,
            receipt_currency="USD",
            total_amount=None,
            tax_amount=0.0,
            tip_amount=0.0,
            line_items=[],
            error_description="Receipt image is unreadable or blurry at the total amount."
        )

    if any(k in fn or k in hint for k in ["alcohol", "bia", "rượu", "wine", "beer"]):
        return ExtractedReceipt(
            is_readable=True,
            vendor_name="Gogi House Restaurant",
            receipt_date="2026-09-10",
            receipt_currency="USD",
            total_amount=120.0,
            tax_amount=10.0,
            tip_amount=0.0,
            line_items=[
                LineItem(item="Grilled Beef Set", price=95.0),
                LineItem(item="Sapporo Beer (Alcohol)", price=25.0)
            ],
            error_description=None
        )

    return ExtractedReceipt(
        is_readable=True,
        vendor_name="Panera Bread / Business Lunch",
        receipt_date="2026-09-12",
        receipt_currency="USD",
        total_amount=45.0,
        tax_amount=3.5,
        tip_amount=0.0,
        line_items=[
            LineItem(item="Roasted Turkey Sandwich", price=28.0),
            LineItem(item="Sparkling Water & Salad", price=13.5),
            LineItem(item="Sales Tax", price=3.5)
        ],
        error_description=None
    )

