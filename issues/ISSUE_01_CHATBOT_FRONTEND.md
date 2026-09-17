# Task #01: Chatbot Interface & Pipeline Telemetry Inspector

* **Thành viên phụ trách**: Thành viên 1 (Frontend Lead / Fullstack)
* **Thư mục liên quan**: `frontend/src/components/chat/*`, `frontend/src/services/chatService.js`, `frontend/src/App.jsx`
* **Mục tiêu**: Thay thế form nhập liệu tĩnh cũ ở tab "Refund Request" bằng giao diện Chatbot hội thoại thông minh kết hợp bảng giám sát pipeline thời gian thực.

---

## 1. Yêu cầu chi tiết (Acceptance Criteria)

1. **Khung hội thoại Chatbot (`ChatContainer.jsx`, `ChatMessageList.jsx`)**:
   - Hiển thị thông điệp chào mừng và hướng dẫn nhân viên.
   - Tin nhắn phân biệt rõ ràng giữa Nhân viên (Avatar, màu accent, căn phải) và Refunder AI Referee (Avatar, viền glassmorphic, căn trái).
   - Hiển thị huy hiệu phán quyết (`APPROVE`, `REJECT`, `ESCALATE`) kèm accordion mở rộng chi tiết các bước xử lý (OCR ➔ Master Context ➔ MCP Tools ➔ Reasoning).

2. **Hộp soạn tin & Tải chứng từ (`ChatComposer.jsx`)**:
   - Khung nhập tin nhắn tự nhiên (hỗ trợ Enter gửi tin, Shift+Enter xuống dòng).
   - Nút đính kèm & kéo thả ảnh hóa đơn / hóa đơn PDF với xem trước (thumbnail preview) và nút gỡ bỏ.
   - Dãy nút kịch bản nhanh (Quick-load Scenarios):
     - Routine Lunch ($45)
     - Blurry Receipt ($450)
     - Prohibited Gift Card ($200)
     - Alcohol Expense ($120)
     - High Value Hardware ($5,800)

3. **Thẻ tương tác Escalation trong tin nhắn (`EscalationCard.jsx`)**:
   - Khi Agent trả về trạng thái `ESCALATE`, hiển thị câu hỏi `escalation_question` ngay dưới tin nhắn của bot.
   - Cung cấp các nút gợi ý câu trả lời nhanh (ví dụ: *"Confirm actual total is $450.00"*).
   - Ô nhập giải trình tự do và nút gửi câu trả lời trở lại phiên chat qua `POST /api/chat/`.

4. **Bảng giám sát luồng thời gian thực (`PipelineInspector.jsx`)**:
   - Cột bên phải hiển thị trạng thái 4 nút dữ liệu khớp với `pipeline.png`:
     - 🔴 **Form Data Payload**
     - 🟡 **Extracted Receipt Payload**
     - 🟢 **Master Context Payload**
     - 🔵 **MCP Tools Execution Trace**
     - 🟣 **Decision Payload**
   - Hỗ trợ chuyển đổi giữa chế độ trực quan (Visual Nodes) và JSON nguyên bản (Raw JSON).
