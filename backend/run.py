#!/usr/bin/env python3
"""
Refunder Backend Server Runner
--------------------------------
Attempts to launch the FastAPI production server using Uvicorn.
If FastAPI or Uvicorn is not yet installed in the current Python environment,
it automatically launches the built-in standalone fallback HTTP server
providing the exact same mock endpoints and CORS headers on port 8000.
"""

import sys
import os

def run_uvicorn():
    try:
        import uvicorn
        from app.config import settings
        print(f"Starting FastAPI server with Uvicorn on http://{settings.HOST}:{settings.PORT}")
        uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
        return True
    except ImportError:
        return False

def run_builtin_mock_server():
    import json
    import uuid
    from http.server import HTTPServer, BaseHTTPRequestHandler
    from urllib.parse import urlparse

    # Try importing dummy data from app, fallback to local dicts if needed
    sys.path.insert(0, os.path.dirname(__file__))
    try:
        from app.dummy_data import (
            DUMMY_EXTRACTED_RECEIPT,
            DUMMY_DECISION_APPROVE,
            DUMMY_DECISION_REJECT,
            DUMMY_DECISION_ESCALATE_ALCOHOL,
            DUMMY_DECISION_ESCALATE_BLURRY,
            DUMMY_DECISION_ESCALATE_HIGH_VALUE,
            IN_MEMORY_CLAIMS_DB
        )
    except Exception:
        DUMMY_EXTRACTED_RECEIPT = {"is_readable": True, "vendor_name": "Gogi House", "total_amount": 3000000.0, "line_items": [{"item": "Bia", "price": 500000.0}]}
        DUMMY_DECISION_APPROVE = {"decision_status": "APPROVE", "reasoning_log": "Compliant claim within limit", "escalation_question": None}
        DUMMY_DECISION_REJECT = {"decision_status": "REJECT", "reasoning_log": "Vi phạm Điều 15: Cấm hoàn ứng gift card, tiền mặt, chi tiêu cá nhân", "escalation_question": None, "policy_reference": "Article 15.3 & 15.4"}
        DUMMY_DECISION_ESCALATE_ALCOHOL = {"decision_status": "ESCALATE", "escalation_category": "NGOAI_QUY_DINH", "escalation_target": "Direct Manager", "escalation_question": "Hóa đơn có 500k tiền bia."}
        DUMMY_DECISION_ESCALATE_BLURRY = {"decision_status": "ESCALATE", "escalation_category": "THIEU_THONG_TIN", "escalation_target": "Requester", "escalation_question": "Hóa đơn bị mờ."}
        DUMMY_DECISION_ESCALATE_HIGH_VALUE = {"decision_status": "ESCALATE", "escalation_category": "VUOT_THAM_QUYEN", "escalation_target": "Procurement", "escalation_question": "Hóa đơn vượt 5,000$."}
        IN_MEMORY_CLAIMS_DB = {}

    PORT = int(os.getenv("PORT", 8000))
    HOST = os.getenv("HOST", "0.0.0.0")

    class MockAPIHandler(BaseHTTPRequestHandler):
        def _set_headers(self, status=200, content_type="application/json"):
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "*")
            self.end_headers()

        def do_OPTIONS(self):
            self._set_headers(204)

        def do_GET(self):
            parsed = urlparse(self.path)
            path = parsed.path.rstrip("/")

            if path == "" or path == "/":
                self._set_headers(200)
                resp = {
                    "status": "online",
                    "system": "Refunder Arbitration Engine (Mock Server)",
                    "mode": "Built-in Zero-Dependency Runner",
                    "api_version": "v1",
                    "endpoints": [
                        "/api/v1/claims/submit",
                        "/api/v1/ocr/extract",
                        "/api/v1/agent/arbitrate",
                        "/api/v1/claims/{id}/resolve",
                        "/api/v1/policy"
                    ]
                }
                self.wfile.write(json.dumps(resp, ensure_ascii=False, indent=2).encode("utf-8"))
                return

            if path in ["/api/v1/policy", "/api/policy"]:
                policy_file = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "policy.md")
                content = "# CHÍNH SÁCH CÔNG TÁC PHÍ (FIN-EXP-001)"
                if os.path.exists(policy_file):
                    with open(policy_file, "r", encoding="utf-8") as f:
                        content = f.read()
                self._set_headers(200)
                resp = {"filename": "FIN-EXP-001.md", "content": content, "size": f"{len(content)/1024:.1f} KB"}
                self.wfile.write(json.dumps(resp, ensure_ascii=False).encode("utf-8"))
                return

            if path.startswith("/api/v1/claims/"):
                claim_id = path.split("/")[-1]
                record = IN_MEMORY_CLAIMS_DB.get(claim_id)
                if record:
                    self._set_headers(200)
                    self.wfile.write(json.dumps(record, ensure_ascii=False).encode("utf-8"))
                else:
                    self._set_headers(404)
                    self.wfile.write(json.dumps({"error": "Claim not found"}).encode("utf-8"))
                return

            self._set_headers(404)
            self.wfile.write(json.dumps({"error": f"Endpoint {path} not found"}).encode("utf-8"))

        def do_POST(self):
            parsed = urlparse(self.path)
            path = parsed.path.rstrip("/")
            content_len = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_len) if content_len > 0 else b"{}"

            body_dict = {}
            # Check if JSON or multipart form-data
            try:
                body_dict = json.loads(raw_body.decode("utf-8"))
            except Exception:
                if b"name=\"form_data\"" in raw_body:
                    try:
                        part = raw_body.split(b"name=\"form_data\"")[1]
                        json_bytes = part.split(b"\r\n\r\n", 1)[1].split(b"\r\n--", 1)[0]
                        body_dict = json.loads(json_bytes.decode("utf-8"))
                    except Exception:
                        pass

            # 1. OCR Extract
            if path == "/api/v1/ocr/extract":
                self._set_headers(200)
                self.wfile.write(json.dumps(DUMMY_EXTRACTED_RECEIPT, ensure_ascii=False).encode("utf-8"))
                return

            # 2. Agent Arbitrate
            if path == "/api/v1/agent/arbitrate":
                form = body_dict.get("user_form_data", {})
                amount = float(form.get("claimed_amount", 0.0) or 0.0)
                desc = (form.get("description", "") or "").lower()

                prohibited = ["gift card", "voucher", "thẻ quà", "tiền mặt", "cash", "cá nhân", "personal", "game", "vpn"]
                if any(k in desc for k in prohibited):
                    decision = DUMMY_DECISION_REJECT
                elif "blurry" in desc or "mờ" in desc:
                    decision = DUMMY_DECISION_ESCALATE_BLURRY
                elif amount > 5000:
                    decision = DUMMY_DECISION_ESCALATE_HIGH_VALUE
                elif any(k in desc for k in ["bia", "rượu", "alcohol", "wine", "beer"]):
                    decision = DUMMY_DECISION_ESCALATE_ALCOHOL
                else:
                    decision = DUMMY_DECISION_APPROVE

                self._set_headers(200)
                self.wfile.write(json.dumps(decision, ensure_ascii=False).encode("utf-8"))
                return

            # 3. Claims Submit (Full pipeline)
            if path in ["/api/v1/claims/submit", "/api/claims/submit"]:
                claim_id = f"CLM-{uuid.uuid4().hex[:6].upper()}"
                desc = (body_dict.get("description", "") or "").lower()
                amount = float(body_dict.get("amount", body_dict.get("claimed_amount", 0.0)) or 0.0)

                prohibited = ["gift card", "voucher", "thẻ quà", "tiền mặt", "cash", "cá nhân", "personal", "game", "vpn"]
                if any(k in desc for k in prohibited):
                    verdict = {**DUMMY_DECISION_REJECT, "claim_id": claim_id}
                elif "blurry" in desc or "mờ" in desc:
                    verdict = {**DUMMY_DECISION_ESCALATE_BLURRY, "claim_id": claim_id}
                elif amount > 5000:
                    verdict = {**DUMMY_DECISION_ESCALATE_HIGH_VALUE, "claim_id": claim_id}
                elif any(k in desc for k in ["bia", "rượu", "alcohol", "wine", "beer"]):
                    verdict = {**DUMMY_DECISION_ESCALATE_ALCOHOL, "claim_id": claim_id}
                else:
                    verdict = {**DUMMY_DECISION_APPROVE, "claim_id": claim_id}

                record = {
                    "claim_id": claim_id,
                    "submission_status": "PROCESSED",
                    "extracted_receipt": DUMMY_EXTRACTED_RECEIPT,
                    "verdict": verdict
                }
                IN_MEMORY_CLAIMS_DB[claim_id] = record

                self._set_headers(200)
                self.wfile.write(json.dumps(record, ensure_ascii=False).encode("utf-8"))
                return

            # 4. Resolve Escalation
            if path.endswith("/resolve"):
                claim_id = path.split("/")[-2]
                role = body_dict.get("responder_role", "Direct Manager")
                resp = {
                    "claim_id": claim_id,
                    "final_decision": "APPROVE",
                    "adjusted_amount": 2500000.0,
                    "currency": "VND",
                    "settled_by": role,
                    "status": "ROUTED_TO_ERP_PAYMENT",
                    "audit_trail": f"Resolved by {role} with notes: {body_dict.get('answer_notes', '')}"
                }
                self._set_headers(200)
                self.wfile.write(json.dumps(resp, ensure_ascii=False).encode("utf-8"))
                return

            # 5. Policy Import
            if path in ["/api/v1/policy/import", "/api/policy/import"]:
                self._set_headers(200)
                resp = {"status": "SUCCESS", "message": "Policy imported successfully", "filename": body_dict.get("filename", "policy.md")}
                self.wfile.write(json.dumps(resp, ensure_ascii=False).encode("utf-8"))
                return

            self._set_headers(404)
            self.wfile.write(json.dumps({"error": f"Endpoint {path} not found"}).encode("utf-8"))

        def log_message(self, format, *args):
            print(f"[API SERVER] {self.address_string()} - {format % args}")

    print(f"⚡ Launching Standalone Mock HTTP Server on http://{HOST}:{PORT}")
    print(f"👉 Serving endpoints: /api/v1/claims/submit, /api/v1/ocr/extract, /api/v1/agent/arbitrate, /api/v1/policy")
    server = HTTPServer((HOST, PORT), MockAPIHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()

if __name__ == "__main__":
    # If uvicorn is installed, run FastAPI; otherwise run the standalone server
    if not run_uvicorn():
        run_builtin_mock_server()
