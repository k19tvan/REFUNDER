# Issue #04: Model Context Protocol (MCP) Tool Server

- **Phụ trách**: Thành viên 4
- **File liên quan**:
  - [`backend/app/pipeline/tools.py`](file:///workspace/projects/REFUNDER/backend/app/pipeline/tools.py) (Client điều phối Tool Call)
  - `backend/mcp_server/` (Server triển khai chuẩn MCP)
- **Vị trí**: Khối `Tools` và liên kết `Tools Call` với `Agent` trong [images/pipeline.png](file:///workspace/projects/REFUNDER/images/pipeline.png).

---

## 1. Yêu cầu kỹ thuật

### 1.1. Danh mục 4 Tools cần xây dựng

#### Tool 1: `policy_search`
- **Mục đích**: Tra cứu ngữ nghĩa hoặc từ khóa trong [policy.md](file:///workspace/projects/REFUNDER/policy.md).
- **Input**: `query: str`, `top_k: int = 3`
- **Output**:
  ```json
  {
    "articles": [
      {
        "article_number": "Article 6.1",
        "title": "Chi phí ăn uống và tiếp khách",
        "clause": "Mức chi tối đa $100/người/ngày. Đồ uống có cồn bị nghiêm cấm trừ khi có ngoại lệ."
      }
    ]
  }
  ```

#### Tool 2: `currency_converter`
- **Mục đích**: Quy đổi ngoại tệ (VND, EUR, JPY...) sang USD theo tỷ giá ngày chi tiêu.
- **Input**: `amount: float`, `from_currency: str`, `to_currency: str = "USD"`, `date: Optional[str]`
- **Output**:
  ```json
  {
    "original_amount": 3000000.0,
    "converted_amount": 120.50,
    "rate": 0.00004017,
    "currency": "USD"
  }
  ```

#### Tool 3: `budget_lookup`
- **Mục đích**: Kiểm tra hạn mức ngân sách còn lại của phòng ban / nhân viên.
- **Input**: `department: str`, `employee_id: str`
- **Output**:
  ```json
  {
    "allocated_budget": 50000.0,
    "remaining_budget": 14250.0,
    "status": "HEALTHY"
  }
  ```

#### Tool 4: `contract_verifier`
- **Mục đích**: Xác thực mã PO / hợp đồng khung cho các khoản chi lớn (> $5,000).
- **Input**: `po_number: str`
- **Output**:
  ```json
  {
    "is_valid": true,
    "po_number": "PO-2026-X99",
    "vendor": "Dell Enterprise",
    "cap_amount": 10000.0,
    "status": "APPROVED"
  }
  ```

### 1.2. MCP Server & Client (`tools.py`)
- Dựng server chạy độc lập (chuẩn Model Context Protocol hoặc FastAPI REST).
- Cập nhật hàm `execute_mcp_tool(tool_name: str, arguments: Dict[str, Any]) -> ToolCallResponse` trong `tools.py` để gửi request tới server và trả kết quả có cấu trúc cho Agent.

---

## 2. Đặc tả dữ liệu (Data Contracts)

```python
class ToolCallRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]

class ToolCallResponse(BaseModel):
    tool_name: str
    status: str = "success"  # "success" | "error"
    result: Dict[str, Any]
    error_message: Optional[str] = None
```

---

## 3. Tiêu chí nghiệm thu (Definition of Done)

- [ ] MCP Server chạy độc lập, phản hồi đúng schema cho cả 4 tool.
- [ ] Hàm `execute_mcp_tool` trong `backend/app/pipeline/tools.py` kết nối thành công và xử lý tốt các tình huống lỗi / timeout.
- [ ] Có kèm script test mẫu gọi độc lập 4 tool.
