# Task #02: Input Gateway & Multimodal Information Extraction

* **Thành viên phụ trách**: Thành viên 2 (NLP & Vision Lead)
* **Thư mục liên quan**: `backend/app/api/chat.py`, `backend/app/extraction/*`, `backend/app/context/master_context.py`
* **Mục tiêu**: Xử lý cổng vào `POST /api/chat/`, bóc tách thực thể claim từ văn bản hội thoại (🔴) và ảnh chứng từ hóa đơn (🟡), sau đó đóng gói thành Master Context Payload (🟢).

---

## 1. Yêu cầu chi tiết (Acceptance Criteria)

1. **Endpoint `POST /api/chat/`**:
   - Nhận payload dạng `multipart/form-data` hoặc `application/json` bao gồm: `session_id`, `message`, `receipt_file`, `claim_id`, `action`.
   - Lưu trữ trạng thái hội thoại và hồ sơ claim vào bộ nhớ đệm (`CHAT_SESSION_DB`).

2. **Module bóc tách thực thể ngôn ngữ tự nhiên (`entity_parser.py` - Cục Đỏ 🔴)**:
   - Dùng Regex / LLM Function Calling để nhận diện:
     - Số tiền yêu cầu (`claimed_amount`), ví dụ: "$45", "45 USD", "2,500,000 VND".
     - Đơn vị tiền tệ (`currency`).
     - Hạng mục chi phí (`expense_category`): Meals, Travel, Hotel, Equipment, Coworking, Personal.
     - Lời giải trình công tác (`description`).
   - Đóng gói chuẩn theo model `FormData`.

3. **Module bóc tách hóa đơn Vision/OCR (`ocr_receipt.py` - Cục Vàng 🟡)**:
   - Nhận diện tính hợp lệ và độ sắc nét của hóa đơn (`is_readable: bool`). Nếu ảnh mờ tại dòng tổng thanh toán, đặt `is_readable = False` và ghi chú `error_description`.
   - Trích xuất: `vendor_name`, `receipt_date`, `receipt_currency`, `total_amount`, `tax_amount`, `tip_amount`.
   - Trích xuất danh sách chi tiết các món (`line_items: List[LineItem]`), đặc biệt chú ý nhận diện đồ uống có cồn (bia, rượu, cocktails) để Agent xử lý ngoại lệ.

4. **Đóng gói Master Context (`master_context.py` - Cục Xanh Lá 🟢)**:
   - Hợp nhất dữ liệu Form + dữ liệu OCR + Thông tin hệ thống (`SystemContext`): ngày nộp đơn hiện tại, địa bàn nhân viên (US/Non-US), mã quản lý trực tiếp, hạn mức tháng hiện tại, phiên bản quy định (`FIN-EXP-001`).
   - Gắn thêm `user_answer` nếu đây là lượt phản hồi giải quyết Escalation.
