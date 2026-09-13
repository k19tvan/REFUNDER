# Issue #01: Input Processing, OCR Extraction & MasterContext Preparation

- **Phụ trách**: Thành viên 1
- **File liên quan**:
  - [`backend/app/pipeline/form_data.py`](file:///workspace/projects/REFUNDER/backend/app/pipeline/form_data.py)
  - [`backend/app/pipeline/ocr_receipt.py`](file:///workspace/projects/REFUNDER/backend/app/pipeline/ocr_receipt.py)
  - [`backend/app/pipeline/master_context.py`](file:///workspace/projects/REFUNDER/backend/app/pipeline/master_context.py)
- **Vị trí**: Khối `INPUT` và `Master Context` trong [images/pipeline.png](file:///workspace/projects/REFUNDER/images/pipeline.png).

---

## 1. Yêu cầu kỹ thuật

### 1.1. Parse dữ liệu Form (`form_data.py`)
- **Hàm**: `parse_form_data(raw_form: Any) -> FormData`
- **Nhiệm vụ**:
  - Parse dữ liệu từ JSON string hoặc dictionary.
  - Validate dữ liệu: `claimed_amount > 0`, định dạng ngày tháng hợp lệ, đầy đủ trường bắt buộc.
  - Tiếp nhận các trường `claim_id` và `answer` khi người dùng gửi phản hồi bổ sung cho ca Escalation.

### 1.2. OCR trích xuất hóa đơn (`ocr_receipt.py`)
- **Hàm**: `extract_receipt_info(receipt_file: Any, description_hint: Optional[str] = None, has_receipt: bool = True) -> ExtractedReceipt`
- **Nhiệm vụ**:
  - Tích hợp Vision LLM (Gemini 1.5 Flash / GPT-4o-mini) hoặc OCR engine để đọc ảnh hóa đơn.
  - Bóc tách các trường: `vendor_name`, `receipt_date`, `total_amount`, `tax_amount`, `tip_amount`, `line_items` (danh sách từng món).
  - Đánh giá chất lượng ảnh: đặt `is_readable = False` kèm `error_description` nếu ảnh bị mờ, nhòe tổng tiền hoặc mất góc.
  - Nếu `has_receipt = False`, trả về model trắng và cờ cảnh báo thiếu hóa đơn.

### 1.3. Tổng hợp MasterContext (`master_context.py`)
- **Hàm**: `build_master_context(form_data: FormData, extracted_receipt: ExtractedReceipt, user_answer: Optional[str] = None) -> MasterContext`
- **Nhiệm vụ**:
  - Hợp nhất dữ liệu khai báo (`FormData`) và dữ liệu bóc tách từ chứng từ (`ExtractedReceipt`).
  - Gắn kèm thông tin ngữ cảnh hệ thống: thời gian hiện tại, hạn mức phòng ban, phiên bản quy chế áp dụng.
  - Đính kèm `user_answer` nếu hồ sơ đang trong luồng tái thẩm định sau Escalation.

---

## 2. Đặc tả dữ liệu (Data Contracts)

```python
class FormData(BaseModel):
    employee_name: str
    employee_id: str
    department: str
    claimed_amount: float
    currency: str = "USD"
    expense_category: str
    expense_date: str
    description: Optional[str] = None
    claim_id: Optional[str] = None
    answer: Optional[str] = None

class ExtractedReceipt(BaseModel):
    is_readable: bool
    vendor_name: Optional[str] = None
    receipt_date: Optional[str] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = "USD"
    tax_amount: Optional[float] = None
    tip_amount: Optional[float] = None
    line_items: List[Dict[str, Any]] = []
    error_description: Optional[str] = None

class MasterContext(BaseModel):
    claim_id: str
    form: FormData
    receipt: ExtractedReceipt
    user_answer: Optional[str] = None
    system_context: Dict[str, Any] = {}
```

---

## 3. Tiêu chí nghiệm thu (Definition of Done)

- [ ] `parse_form_data` parse và validate thành công cả dữ liệu hợp lệ lẫn payload lỗi.
- [ ] `extract_receipt_info` trích xuất chính xác thông tin từ ảnh mẫu trong `testcase/images/`.
- [ ] Nhận diện đúng ảnh mờ / nhòe (`is_readable = False`).
- [ ] `build_master_context` xuất ra đối tượng `MasterContext` đầy đủ trường, tương thích hoàn toàn với Task #02.
