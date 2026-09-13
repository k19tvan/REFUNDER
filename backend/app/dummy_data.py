"""
Centralized Dummy Data Repository for Refunder Backend.
Used to mock endpoint behaviors so the workflow can be tested immediately
before the real LLM agent and OCR pipeline are integrated by the team.
"""

DUMMY_EXTRACTED_RECEIPT = {
    "is_readable": True,
    "vendor_name": "Panera Bread / Business Lunch",
    "receipt_date": "2026-09-12",
    "receipt_currency": "USD",
    "total_amount": 45.0,
    "tax_amount": 3.5,
    "tip_amount": 0.0,
    "line_items": [
        {"item": "Roasted Turkey Sandwich", "price": 28.0},
        {"item": "Sparkling Water & Salad", "price": 13.5},
        {"item": "Sales Tax", "price": 3.5}
    ],
    "error_description": None
}

DUMMY_ALCOHOL_RECEIPT = {
    "is_readable": True,
    "vendor_name": "Gogi House Restaurant",
    "receipt_date": "2026-09-10",
    "receipt_currency": "VND",
    "total_amount": 3000000.0,
    "tax_amount": 250000.0,
    "tip_amount": 0.0,
    "line_items": [
        {"item": "Combo bò nướng cao cấp", "price": 2000000.0},
        {"item": "Bia Sapporo (Đồ uống có cồn)", "price": 500000.0},
        {"item": "Nước ngọt & Khăn lạnh", "price": 250000.0},
        {"item": "Thuế VAT 10%", "price": 250000.0}
    ],
    "error_description": None
}

DUMMY_DECISION_ESCALATE_ALCOHOL = {
    "decision_status": "ESCALATE",
    "reasoning_log": "Số tiền hóa đơn 3,000,000 VND (~$120.50). Phát hiện line item 'Bia Sapporo' trị giá 500,000 VND vi phạm Điều 6.1 & Điều 10.8 về đồ uống có cồn.",
    "escalation_target": "Direct Manager",
    "escalation_category": "NGOAI_QUY_DINH",
    "escalation_question": "Hóa đơn có 500.000₫ tiền Bia (đồ uống có cồn). Quản lý có đồng ý phê duyệt ngoại lệ tiếp khách cho khoản này không, hay yêu cầu trừ đi?",
    "policy_reference": "Article 6.1, Article 10.8 & Article 12: Alcohol prohibition & Manager exception review",
    "confidence_score": 0.98
}

DUMMY_DECISION_ESCALATE_BLURRY = {
    "decision_status": "ESCALATE",
    "reasoning_log": "Ảnh chụp hóa đơn bị mờ hoặc rách tại dòng tổng tiền cuối cùng. Không thể khẳng định số tiền chính xác.",
    "escalation_target": "Requester",
    "escalation_category": "THIEU_THONG_TIN",
    "escalation_question": "Hóa đơn bị mờ tại dòng tổng thanh toán. Số tiền thực tế bạn đã thanh toán là $450.00 hay $480.00?",
    "policy_reference": "Article 3.3 & Article 11: Valid receipt evidence & Missing receipt affidavit",
    "confidence_score": 0.97
}

DUMMY_DECISION_ESCALATE_HIGH_VALUE = {
    "decision_status": "ESCALATE",
    "reasoning_log": "Khoản mua thiết bị trị giá $5,800.00 vượt trần giao dịch đơn lẻ $5,000 và phải chuyển cho bộ phận Mua hàng tập trung.",
    "escalation_target": "Procurement",
    "escalation_category": "VUOT_THAM_QUYEN",
    "escalation_question": "Khoản mua sắm thiết bị $5,800.00 (> $5,000) vượt trần phê duyệt. Đơn này cần chuyển Procurement xử lý tập trung hay đã có hợp đồng khung?",
    "policy_reference": "Article 4, Article 9 & Article 12: Centralized Procurement Thresholds (> $5,000)",
    "confidence_score": 0.99
}

DUMMY_DECISION_APPROVE = {
    "decision_status": "APPROVE",
    "reasoning_log": "Khoản chi hợp lệ, có đầy đủ hóa đơn chứng từ, không có đồ uống có cồn, số tiền nằm trong hạn mức tiêu chuẩn.",
    "escalation_target": None,
    "escalation_category": "NONE",
    "escalation_question": None,
    "policy_reference": "Article 4 & Article 6.1: Standard expense allowances (Meals <= $100/day)",
    "confidence_score": 0.99
}

DUMMY_DECISION_REJECT = {
    "decision_status": "REJECT",
    "reasoning_log": "Khoản chi vi phạm Điều 4, Điều 10.1 & Điều 10.7 (Chính sách cấm hoàn ứng thẻ quà tặng Gift card, voucher, tiền mặt và chi tiêu mục đích cá nhân).",
    "escalation_target": "None (System Rejected)",
    "escalation_category": "NONE",
    "escalation_question": None,
    "policy_reference": "Article 4, Article 10.1 & Article 10.7: Strictly Non-Reimbursable Expenses",
    "confidence_score": 0.99
}

# In-memory storage for submitted claims
IN_MEMORY_CLAIMS_DB = {}

