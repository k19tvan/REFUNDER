# Task #05: Testcase Dataset & Automated Benchmark

* **Thành viên phụ trách**: Thành viên 5 (QA & Benchmark Lead)
* **Thư mục liên quan**: `testcase/*`, `testcase/run_benchmark.py`, `documentation/*`
* **Mục tiêu**: Xây dựng bộ dataset testcase đa phương thức chuẩn hóa và công cụ tự động đánh giá độ chính xác phán quyết của Chatbot qua endpoint `POST /api/chat/`.

---

## 1. Yêu cầu chi tiết (Acceptance Criteria)

1. **Bộ Testcase Dataset (`testcase/*.json`)**:
   Mỗi file testcase phải bao gồm:
   - `testcase_id`: Định danh kịch bản (ví dụ: `TC-01`, `TC-02`...)
   - `name`: Tên kịch bản
   - `category`: `"CHUAN_QUY_DINH"`, `"THIEU_THONG_TIN"`, `"NGOAI_QUY_DINH"`, `"VUOT_THAM_QUYEN"`, `"CAM_TUYET_DOI"`
   - `input`:
     - Tin nhắn mô tả tự nhiên của nhân viên
     - File ảnh hóa đơn mẫu tương ứng trong `testcase/images/`
     - System context (vị trí nhân viên, hạn mức còn lại)
   - `expected_agent_verdict`: Phán quyết kỳ vọng (`decision_status`, `escalation_target`, `policy_reference`)
   - `human_in_the_loop_resolution`: Câu trả lời giải trình mẫu và kết quả kỳ vọng sau vòng 2 (`final_decision: "APPROVE"`).

2. **Script Benchmark tự động (`run_benchmark.py`)**:
   - Gửi yêu cầu qua `POST /api/chat/`.
   - Đối chiếu output trả về với Ground Truth trong dataset:
     - Tỷ lệ khớp Decision Status (Accuracy %)
     - Tỷ lệ khớp Escalation Target & Escalation Category
     - Tỷ lệ trích xuất đúng số tiền (Extraction Precision)
   - Tự động thực hiện vòng lặp giải trình Escalation (Turn 2) để kiểm chứng tính năng tự động phê duyệt sau giải trình.
   - Xuất báo cáo tổng kết ra bảng Markdown / Terminal.
