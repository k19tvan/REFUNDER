# Issue #02: Agent Arbitration Engine & Decision Router

- **Phụ trách**: Thành viên 2
- **File liên quan**:
  - [`backend/app/pipeline/decision.py`](file:///workspace/projects/REFUNDER/backend/app/pipeline/decision.py)
  - [`backend/app/api/refund.py`](file:///workspace/projects/REFUNDER/backend/app/api/refund.py)
  - [`policy.md`](file:///workspace/projects/REFUNDER/policy.md)
- **Vị trí**: Khối `Agent` và `Decision` trong [images/pipeline.png](file:///workspace/projects/REFUNDER/images/pipeline.png).

---

## 1. Yêu cầu kỹ thuật

### 1.1. Logic suy luận trọng tài (`decision.py`)
- **Hàm**: `arbitrate_claim(context: MasterContext) -> Decision`
- **Nhiệm vụ**:
  - Đối chiếu thông tin từ `context.form` và `context.receipt` với các điều khoản trong `policy.md`.
  - Phân loại quyết định thành 3 nhánh:
    - **`Approve`**: Chi phí đúng mục đích, đầy đủ hóa đơn hợp lệ, không có cồn, trong hạn mức cho phép.
    - **`Reject`**: Vi phạm điều khoản cấm tuyệt đối theo Điều 10 (thẻ quà tặng, rút tiền mặt, chi tiêu cá nhân).
    - **`Escalation`**: Phát sinh điểm nghi vấn hoặc vượt thẩm quyền cần con người xác nhận (hóa đơn mờ, tiền cồn, đơn hàng > $5,000).

### 1.2. Sinh câu hỏi định hướng (`question`)
- Khi rơi vào nhánh `Escalation`, Agent bắt buộc tạo câu hỏi cụ thể gửi đúng đối tượng:
  - **Hóa đơn bị mờ** (`receipt.is_readable = False`): Hỏi người nộp đơn để xác nhận lại số tiền chính xác.
  - **Có đồ uống có cồn** (dòng bia/rượu trong `line_items`): Hỏi Quản lý trực tiếp xem có duyệt ngoại lệ hay trừ khoản này.
  - **Chi phí lớn (> $5,000)**: Hỏi bộ phận Procurement về mã hợp đồng khung / PO phê duyệt trước.

### 1.3. Xử lý vòng lặp phản hồi (Re-arbitration)
- Khi `context.user_answer` có nội dung (người dùng gửi phản hồi trả lời câu hỏi):
  - Agent nạp câu trả lời vào bối cảnh để đánh giá lại hồ sơ.
  - Nếu câu trả lời giải tỏa được sự bất định: chuyển trạng thái sang **`Approve`** và cập nhật giải trình vào `reasoning`.

---

## 2. Đặc tả dữ liệu (Data Contracts)

```python
class DecisionType(str, Enum):
    APPROVE = "Approve"
    REJECT = "Reject"
    ESCALATION = "Escalation"

class Decision(BaseModel):
    claim_id: str
    status: DecisionType
    reasoning: str
    question: Optional[str] = None
    target_role: Optional[str] = None  # "requester" | "manager" | "procurement"
    policy_violations: List[str] = []
    confidence_score: float = 1.0
```

---

## 3. Tiêu chí nghiệm thu (Definition of Done)

- [ ] Phân luồng chính xác 3 nhánh: Approve, Reject, Escalation theo đúng quy chế `policy.md`.
- [ ] Khi Escalation, sinh câu hỏi rõ ràng, có gợi ý lựa chọn cụ thể, không hỏi chung chung.
- [ ] Xử lý chính xác vòng lặp `user_answer`: chuyển từ Escalation sang Approve khi người dùng giải trình hợp lệ.
- [ ] Trả về cấu trúc `Decision` chuẩn xác, kết nối thông suốt với endpoint `/api/refund`.
