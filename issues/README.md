# REFUNDER: Phân chia nhiệm vụ dự án

Sơ đồ luồng xử lý: [images/pipeline.png](file:///workspace/projects/REFUNDER/images/pipeline.png)

---

## 1. Bảng phân công nhiệm vụ

| Task ID | Tên nhiệm vụ | File phụ trách | Nhiệm vụ chính | Chi tiết |
|---|---|---|---|---|
| **#01** | **Input & Information Extraction** | `backend/app/pipeline/form_data.py`<br>`backend/app/pipeline/ocr_receipt.py`<br>`backend/app/pipeline/master_context.py` | Parse form, OCR trích xuất hóa đơn, đóng gói `MasterContext`. | [ISSUE_01_INPUT_EXTRACTION.md](file:///workspace/projects/REFUNDER/issues/ISSUE_01_INPUT_EXTRACTION.md) |
| **#02** | **Agent Arbitration Engine** | `backend/app/pipeline/decision.py`<br>`backend/app/api/refund.py` | LLM suy luận theo `policy.md`, ra quyết định (Approve / Reject / Escalate), xử lý vòng lặp phản hồi. | [ISSUE_02_AGENT_ARBITRATION.md](file:///workspace/projects/REFUNDER/issues/ISSUE_02_AGENT_ARBITRATION.md) |
| **#03** | **Testcase Dataset & Benchmark** | `testcase/*.json`<br>`testcase/images/`<br>`testcase/run_benchmark.py` | Tạo bộ testcase (form, ảnh hóa đơn, ground truth) và script benchmark tự động. | [ISSUE_03_TESTCASE_DATASET.md](file:///workspace/projects/REFUNDER/issues/ISSUE_03_TESTCASE_DATASET.md) |
| **#04** | **MCP Tool Server** | `backend/app/pipeline/tools.py`<br>`backend/mcp_server/` | Xây dựng MCP Server: policy search, đổi ngoại tệ, kiểm tra ngân sách, xác thực hợp đồng PO. | [ISSUE_04_MCP_TOOL_SERVER.md](file:///workspace/projects/REFUNDER/issues/ISSUE_04_MCP_TOOL_SERVER.md) |

---

## 2. Quy trình phối hợp

```
[Task 1: Form & OCR] ──> [MasterContext] ──> [Task 2: Agent] <──> [Task 4: MCP Tools]
                                                   │
                                                   ▼
                                              [Decision]
                                                   ▲
                                                   │ (Đánh giá)
                                          [Task 3: Benchmark]
```

1. **Task 1** và **Task 4** triển khai độc lập theo hợp đồng dữ liệu đã định nghĩa.
2. **Task 2** nhận `MasterContext` từ Task 1 và gọi tools từ Task 4 để ra phán quyết.
3. **Task 3** kiểm thử chất lượng toàn hệ thống qua endpoint `/api/refund`.
