# Task #03: Agent Arbitration Engine & State Machine

* **Thành viên phụ trách**: Thành viên 3 (AI Agent & Referee Lead)
* **Thư mục liên quan**: `backend/app/agent/arbitrator.py`, `backend/app/models/decision.py`, `backend/app/agent/prompts.py`
* **Mục tiêu**: Xây dựng bộ não suy luận Agent Arbitration đối chiếu Master Context (🟢) với chính sách `policy.md`, gọi các công cụ MCP (🔵), và tạo Decision Payload (🟣) chia 3 nhánh: Approve, Reject, hoặc Escalation (kèm câu hỏi phản hồi).

---

## 1. Yêu cầu chi tiết (Acceptance Criteria)

1. **Phân loại nhánh phán quyết (Decision Router)**:
   - **`APPROVE`**: Khoản chi đúng hạn mức, danh mục được phép, hóa đơn đầy đủ và khớp với số tiền khai báo. Tự động sinh trạng thái chuyển sang ERP kế toán.
   - **`REJECT`**: Vi phạm điều khoản cấm tuyệt đối (Điều 10 & Điều 15: Thẻ quà tặng Gift Cards, voucher, tiền mặt cá nhân, cờ bạc). Trả về trích dẫn điều khoản chính sách chính xác.
   - **`ESCALATE`**:
     - *THIEU_THONG_TIN*: Hóa đơn mờ, nhòe số tiền, thiếu hóa đơn gốc. ➔ Chuyển câu hỏi cho Requester (Nhân viên).
     - *NGOAI_QUY_DINH*: Khoản chi có đồ uống có cồn, hoặc vượt tiêu chuẩn phòng khách sạn. ➔ Chuyển câu hỏi cho Direct Manager.
     - *VUOT_THAM_QUYEN*: Giao dịch đơn lẻ vượt $5,000. ➔ Chuyển câu hỏi xác nhận PO cho Procurement Lead.

2. **Vòng lặp phản hồi đa lượt (Human Feedback Loop)**:
   - Khi nhận được câu trả lời từ người dùng (`user_answer`), Agent kích hoạt lượt đánh giá thứ hai (Re-evaluation).
   - Áp dụng ngoại lệ quy định (Điều 11: Bản cam kết hóa đơn thất lạc / sao kê thẻ tín dụng) để phê duyệt hồ sơ nếu câu trả lời hợp lý.

3. **Cấu trúc Decision Payload chuẩn (🟣 Cục Tím)**:
   - `decision_status`: Enum (`"APPROVE"`, `"REJECT"`, `"ESCALATE"`)
   - `reasoning_log`: Giải thích ngắn gọn lý do đưa ra quyết định phục vụ kiểm toán.
   - `escalation_target`: `"Requester"`, `"Direct Manager"`, hoặc `"Procurement / AP_Lead"`.
   - `escalation_category`: `"THIEU_THONG_TIN"`, `"NGOAI_QUY_DINH"`, hoặc `"VUOT_THAM_QUYEN"`.
   - `escalation_question`: Câu hỏi cụ thể đặt ra cho con người.
   - `policy_reference`: Điều khoản chính sách áp dụng (ví dụ: *"Article 4 & Article 6.1: Standard meal allowances"*).
   - `confidence_score`: Điểm độ tin cậy của mô hình (0.0 đến 1.0).
