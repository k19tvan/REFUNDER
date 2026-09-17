# REFUNDER: Phân Chia Nhiệm Vụ Thành Viên (Kiến Trúc Chatbot Đa Phương Thức)

Sơ đồ luồng xử lý: [images/pipeline.png](file:///workspace/projects/REFUNDER/images/pipeline.png) & [images/agent_pipeline.png](file:///workspace/projects/REFUNDER/images/agent_pipeline.png)

---

## 1. Bảng phân công nhiệm vụ theo vai trò thành viên

| Mã Task | Thành viên phụ trách | Tên nhiệm vụ | File / Thư mục chính | Nhiệm vụ chính & Deliverables | Chi tiết |
|---|---|---|---|---|---|
| **#01** | **Thành viên 1 (Frontend Lead)** | **Chatbot Interface & Pipeline Inspector** | `frontend/src/components/chat/*`<br>`frontend/src/services/chatService.js`<br>`frontend/src/components/RefundRequest.jsx` | Xây dựng UI Chatbot hội thoại: bong bóng chat, đính kèm hóa đơn kéo thả, preset kịch bản, thẻ tương tác Escalation và bảng Telemetry hiển thị 4 payload màu thời gian thực. | [ISSUE_01_CHATBOT_FRONTEND.md](file:///workspace/projects/REFUNDER/issues/ISSUE_01_CHATBOT_FRONTEND.md) |
| **#02** | **Thành viên 2 (NLP & Vision)** | **Input Gateway & Information Extraction** | `backend/app/api/chat.py`<br>`backend/app/extraction/*`<br>`backend/app/context/master_context.py` | Xây dựng endpoint `POST /api/chat/`, NLP bóc tách thực thể số tiền/hạng mục từ tin nhắn (🔴), Vision OCR bóc tách hóa đơn (🟡), và đóng gói Master Context (🟢). | [ISSUE_02_EXTRACTION_NLP_VISION.md](file:///workspace/projects/REFUNDER/issues/ISSUE_02_EXTRACTION_NLP_VISION.md) |
| **#03** | **Thành viên 3 (Agent & Referee)** | **Agent Arbitration & State Machine** | `backend/app/agent/arbitrator.py`<br>`backend/app/models/decision.py`<br>`backend/app/agent/state_graph.py` | Xây dựng lõi LLM Arbitration (LangGraph/LangChain), đối chiếu quy định chính sách (`policy.md`), phân nhánh Approve/Reject/Escalate (🟣), điều phối vòng lặp Human-in-the-loop. | [ISSUE_03_AGENT_ARBITRATION.md](file:///workspace/projects/REFUNDER/issues/ISSUE_03_AGENT_ARBITRATION.md) |
| **#04** | **Thành viên 4 (MCP & Backend Tools)** | **MCP Tool Server & Integrations** | `backend/app/mcp/*`<br>`backend/run.py` | Xây dựng Model Context Protocol (MCP) server endpoints (`POST /mcp/...`): công cụ tìm kiếm quy định vector search, kiểm tra hạn mức ngân sách, đổi ngoại tệ, và cập nhật mock runner. | [ISSUE_04_MCP_TOOL_SERVER.md](file:///workspace/projects/REFUNDER/issues/ISSUE_04_MCP_TOOL_SERVER.md) |
| **#05** | **Thành viên 5 (QA & Benchmark)** | **Dataset Testcase & Automated Benchmark** | `testcase/*`<br>`testcase/run_benchmark.py`<br>`documentation/*` | Xây dựng bộ testcase đa lượt hoàn chỉnh (các trường hợp mờ, cấm gift card, cồn, vượt hạn mức) và script tự động benchmark tỷ lệ chính xác qua endpoint `POST /api/chat/`. | [ISSUE_05_BENCHMARK_DATASET.md](file:///workspace/projects/REFUNDER/issues/ISSUE_05_BENCHMARK_DATASET.md) |

---

## 2. Quy trình phối hợp đa tác tử (Agent Chaining Workflow)

```
[User Chat + Receipt] ──> [Thành viên 2: NLP & OCR Extraction]
                                     │
                                     ▼
                            [Master Context (🟢)]
                                     │
                                     ▼
                         [Thành viên 3: Agent Referee] <───> [Thành viên 4: MCP Tools (🔵)]
                                     │
                                     ▼
                          [Decision Payload (🟣)]
                         /           │           \
                 Approve           Reject      Escalate
                                                  │
                                                  ▼
                               [Thành viên 1: In-Chat Human Feedback]
                                                  │
                                                  ▼ (Lặp lại phản hồi)
                                       [Thành viên 3: Agent]
                                                  ▲
                                                  │ (Đánh giá chất lượng)
                                      [Thành viên 5: Benchmark]
```
