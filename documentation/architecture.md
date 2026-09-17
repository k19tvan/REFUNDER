# REFUNDER: Tài Liệu Thiết Kế Kiến Trúc & Sắp Xếp Module (Architecture Specification)

Tài liệu đặc tả toàn diện kiến trúc hệ thống **REFUNDER (Autonomous Governance & Escalation Referee)** theo thiết kế Chatbot hội thoại đa phương thức (Multimodal Conversational AI).

---

## 1. Sơ Đồ Phân Tầng Kiến Trúc (Layered Architecture)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND PRESENTATION LAYER                      │
│                                                                         │
│  [Navbar] ──── [Introduction] ──── [Company Policy] ──── [Refund Chatbot]│
│                                                                 │       │
│                ┌────────────────────────────────────────────────▼─────┐ │
│                │            ChatContainer.jsx                         │ │
│                │  ┌───────────────────────┐ ┌──────────────────────┐  │ │
│                │  │  ChatMessageList.jsx  │ │ PipelineInspector.jsx│  │ │
│                │  │  (EscalationCard.jsx) │ │ (🔴 🟡 🟢 🔵 🟣)     │  │ │
│                │  ├───────────────────────┤ └──────────────────────┘  │ │
│                │  │   ChatComposer.jsx    │                           │ │
│                │  └───────────────────────┘                           │ │
│                └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP (POST /api/chat/)
┌────────────────────────────────────▼────────────────────────────────────┐
│                         BACKEND GATEWAY & API                           │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ backend/app/api/chat.py: POST /api/chat/ (Multipart/JSON)          │  │
│  │ backend/app/api/refund.py: POST /api/refund/ (Legacy Compatibility)│  │
│  │ backend/app/api/policy.py: GET & POST /api/policy                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    CORE PROCESSING & PIPELINE ENGINES                   │
│                                                                         │
│  [1. Extraction Module (🟡 + 🔴)]                                        │
│     ├── ocr_receipt.py: Multimodal Vision OCR bóc tách hóa đơn          │
│     └── entity_parser.py: Bóc tách thực thể từ tin nhắn tự nhiên        │
│                                                                         │
│  [2. Context Aggregation Module (🟢)]                                   │
│     └── master_context.py: Hợp nhất Lời khai + Hóa đơn + System Context │
│                                                                         │
│  [3. Agent Arbitration Engine (🟣)]                                     │
│     ├── arbitrator.py: Trọng tài suy luận theo policy.md                │
│     └── state_graph.py: Quản lý trạng thái đa lượt & Human-in-the-loop  │
│                                                                         │
│  [4. MCP Tools & Integration Layer (🔵)]                                │
│     ├── mcp/tools.py: Tools tìm kiếm quy định, kiểm tra ngân sách       │
│     └── mcp/router.py: Model Context Protocol Server (POST /mcp/...)    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Bố Cục Thư Mục Tái Cấu Trúc (Folder Structure)

```
REFUNDER/
├── backend/
│   ├── app/
│   │   ├── api/                    # API Route Handlers
│   │   │   ├── chat.py             # Endpoint /api/chat/ chính cho chatbot
│   │   │   ├── refund.py           # Endpoint /api/refund tương thích
│   │   │   └── policy.py           # Endpoint tài liệu quy định
│   │   ├── agent/                  # Trọng tài Agent Arbitration
│   │   │   ├── arbitrator.py       # Phán quyết Approve/Reject/Escalate
│   │   │   ├── prompts.py          # Grounding prompt theo policy.md
│   │   │   └── state_graph.py      # Vòng lặp Human-in-the-loop
│   │   ├── extraction/             # Bóc tách thông tin
│   │   │   ├── ocr_receipt.py      # Bóc tách hóa đơn bằng Vision (🟡)
│   │   │   └── entity_parser.py    # Trích xuất số tiền, mục đích từ chat (🔴)
│   │   ├── context/                # Tổng hợp bối cảnh
│   │   │   └── master_context.py   # Ghép thành Master Context Payload (🟢)
│   │   ├── mcp/                    # Model Context Protocol
│   │   │   └── tools.py            # External tools (🔵)
│   │   ├── models/                 # Pydantic Schemas
│   │   │   ├── chat.py             # ChatRequest, ChatResponse, PipelineNodes
│   │   │   └── ...
│   │   ├── core/                   # Cấu hình & Quản lý Session
│   │   │   ├── config.py
│   │   │   └── session.py
│   │   └── main.py                 # FastAPI Application Factory
│   └── run.py                      # Server runner tự động fallback
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/               # Giao diện Chatbot
│   │   │   │   ├── ChatContainer.jsx        # Shell chứa Chat + Inspector
│   │   │   │   ├── ChatMessageList.jsx      # Luồng tin nhắn & Accordion bước
│   │   │   │   ├── ChatComposer.jsx         # Nhập tin nhắn & Đính kèm hóa đơn
│   │   │   │   ├── EscalationCard.jsx       # Card trả lời câu hỏi Escalation
│   │   │   │   └── PipelineInspector.jsx    # Bảng hiển thị 4 payload màu
│   │   │   ├── RefundRequest.jsx   # Wrapper render ChatContainer
│   │   │   ├── CompanyPolicy.jsx   # Xem & sửa quy định chính sách
│   │   │   ├── Introduction.jsx    # Giới thiệu hệ thống
│   │   │   └── Navbar.jsx          # Thanh điều hướng
│   │   ├── services/
│   │   │   ├── chatService.js      # Giao tiếp POST /api/chat/ + offline simulator
│   │   │   └── api.js              # Giao tiếp chính sách
│   │   ├── App.jsx
│   │   └── index.css
│   └── ...
├── documentation/
│   ├── architecture.md             # Tài liệu này
│   ├── policy.md                   # Quy định công tác phí chuẩn (FIN-EXP-001)
│   └── user_flow.md                # Luồng tương tác chi tiết
├── issues/
│   ├── README.md                   # Bảng phân công 5 thành viên
│   ├── ISSUE_01_CHATBOT_FRONTEND.md
│   ├── ISSUE_02_EXTRACTION_NLP_VISION.md
│   ├── ISSUE_03_AGENT_ARBITRATION.md
│   ├── ISSUE_04_MCP_TOOL_SERVER.md
│   └── ISSUE_05_BENCHMARK_DATASET.md
└── testcase/
```
