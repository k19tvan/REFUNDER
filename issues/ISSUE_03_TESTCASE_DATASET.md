# Issue #03: Testcase Dataset & Benchmark Suite

- **Phụ trách**: Lương Sĩ Nguyên
- **File liên quan**:
  - `testcase/*.json` (Bộ 15 kịch bản kiểm thử)
  - `testcase/images/` (Thư mục 15 ảnh hóa đơn tương ứng)
  - `testcase/run_benchmark.py` (Script chạy đánh giá tự động)
- **Vị trí**: Bộ công cụ kiểm thử độc lập cho toàn bộ pipeline từ input đến decision trong [images/pipeline.png](file:///workspace/projects/REFUNDER/images/pipeline.png).

---

## 1. Yêu cầu kỹ thuật

### 1.1. Xây dựng bộ 15 kịch bản kiểm thử (Test Matrix)

| Mã Ca | Kịch Bản | Đặc Điểm Hóa Đơn / Lời Khai | Kỳ Vọng Vòng 1 | Kỳ Vọng Sau Phản Hồi Vòng 2 |
|---|---|---|---|---|
| **TC-01** | Hóa đơn mờ tổng tiền | Ảnh mờ dòng tổng, khai $450 | `Escalation` (Hỏi Requester) | User xác nhận $450 ➔ `Approve` |
| **TC-02** | Bữa ăn thường quy | Hóa đơn Panera $45, không cồn | `Approve` | Không có vòng 2 |
| **TC-03** | Mua Gift card | Hóa đơn thẻ quà tặng $200 (Điều 10.7) | `Reject` | Không có vòng 2 |
| **TC-04** | Hóa đơn có bia rượu | Hóa đơn nhà hàng có bia Sapporo 500k | `Escalation` (Hỏi Manager) | Manager duyệt trừ bia ➔ `Approve` |
| **TC-05** | Mua sắm lớn > $5,000 | Hóa đơn thiết bị server $5,800 | `Escalation` (Hỏi Procurement) | Bổ sung mã PO hợp lệ ➔ `Approve` |
| **TC-06** | Nộp đơn trễ hạn > 90 ngày | Chi phí phát sinh cách đây 95 ngày | `Escalation` (Hỏi Manager) | Manager duyệt giải trình ➔ `Approve` |
| **TC-07** | Hóa đơn ngoại tệ | Hóa đơn ăn tối Tokyo (¥15,000 JPY) | `Approve` (Đổi tỷ giá sang USD) | Không có vòng 2 |
| **TC-08** | Chi tiêu cá nhân cuối tuần | Vé xem phim Chủ nhật không tiếp khách | `Reject` (Điều 10.1) | Không có vòng 2 |
| **TC-09** | Khách sạn vượt hạn mức | Khách sạn $380/đêm (> chuẩn $300/đêm) | `Escalation` (Hỏi Manager) | Manager duyệt ngoại lệ ➔ `Approve` |
| **TC-10** | Thiết bị điện tử cấm hoàn ứng | Mua iPad cá nhân $799 kê vào thiết bị | `Reject` (Điều 8.2) | Không có vòng 2 |
| **TC-11** | Tiền tip vượt trần 20% | Bữa ăn $100 nhưng tip $35 (35% > 20%) | `Escalation` (Hỏi Requester) | Điều chỉnh tip về 20% ➔ `Approve` |
| **TC-12** | Thất lạc hóa đơn có bản cam kết MRA | Taxi $40 mất hóa đơn, có kèm form MRA | `Escalation` (Hỏi AP Lead) | AP Lead chấp thuận MRA ➔ `Approve` |
| **TC-13** | Trùng lặp Coworking và Internet | Đã claim Coworking $650 lại nộp Internet $80 | `Reject` (Điều 7.2) | Không có vòng 2 |
| **TC-14** | Taxi sân bay hợp lệ | Taxi Uber đưa đón sân bay $85 (<= $150) | `Approve` | Không có vòng 2 |
| **TC-15** | Dấu hiệu chia nhỏ đơn (Anti-Structuring) | 2 hóa đơn cùng ngày cùng vendor $3,000 & $2,800 | `Escalation` (Chuyển Kiểm toán nội bộ) | Kiểm toán làm rõ hợp đồng ➔ Phán quyết |

### 1.2. Chuẩn bị ảnh hóa đơn (`testcase/images/`)
- Cung cấp 15 ảnh hóa đơn thật hoặc giả lập chất lượng cao tương ứng (`receipt_01.png` đến `receipt_15.png`).
- Đảm bảo các đặc trưng thị giác chuẩn xác (ảnh mờ, ảnh có dòng bia rượu, ảnh hóa đơn tiếng Nhật JPY, ảnh thẻ quà tặng...).

### 1.3. Cấu trúc JSON Testcase chuẩn
Mỗi ca lưu thành một file riêng biệt trong thư mục `testcase/` (`testcase_01.json` đến `testcase_15.json`):

```json
{
  "testcase_id": "TC-02",
  "name": "Bữa ăn công tác hợp lệ dưới $100",
  "policy_reference": {
    "article_number": "Article 4 & 6.1",
    "clause": "Mức chi tối đa $100/ngày/người cho ăn uống."
  },
  "input": {
    "form_data_payload": {
      "employee_name": "Alex Johnson",
      "employee_id": "EMP-1001",
      "department": "Engineering",
      "claimed_amount": 45.0,
      "currency": "USD",
      "expense_category": "meal",
      "expense_date": "2026-09-10"
    },
    "receipt_image_path": "testcase/images/receipt_02.png"
  },
  "expected_round_1": {
    "decision": "Approve",
    "should_have_question": false
  },
  "mock_human_resolution": null
}
```

### 1.4. Script Benchmark tự động (`testcase/run_benchmark.py`)
- Quét toàn bộ 15 file `testcase/testcase_*.json`.
- Gửi request đến `POST /api/refund`.
- Kiểm tra vòng 1: So sánh `decision` thực tế với kỳ vọng.
- Nếu ca có `mock_human_resolution`: gửi tiếp vòng 2 với `answer` và kiểm tra phán quyết cuối cùng.
- In bảng tổng kết độ chính xác (Accuracy %).

---

## 2. Tiêu chí nghiệm thu (Definition of Done)

- [ ] Đủ 15 file JSON testcase (`testcase_01.json` đến `testcase_15.json`) và 15 file ảnh tương ứng trong `testcase/images/`.
- [ ] Script `testcase/run_benchmark.py` chạy độc lập, tự động thực thi 15 ca và in kết quả trực quan.
- [ ] Toàn bộ dataset được version control trong repo, sẵn sàng làm benchmark nghiệm thu hệ thống.
