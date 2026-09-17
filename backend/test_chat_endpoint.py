import sys
import os
from fastapi.testclient import TestClient

# Adjust sys.path to backend directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app

client = TestClient(app)

def test_chat_approved_claim():
    print("\n--- TEST CASE 1: Standard Reimbursable Claim ($45 Meal) ---")
    response = client.post(
        "/api/chat",
        data={
            "message": "Tôi muốn hoàn ứng $45 cho bữa ăn trưa tiếp khách tại Panera Bread",
            "action": "MESSAGE"
        }
    )
    print("HTTP Status:", response.status_code)
    json_data = response.json()
    print("Session ID:", json_data.get("session_id"))
    print("Claim ID:", json_data.get("claim_id"))
    print("Step Status:", json_data.get("step_status"))
    print("Reply:", json_data.get("reply"))
    assert response.status_code == 200
    assert json_data.get("step_status") == "APPROVED"

def test_chat_rejected_claim():
    print("\n--- TEST CASE 2: Prohibited Item Claim (Gift Card / Personal) ---")
    response = client.post(
        "/api/chat",
        data={
            "message": "Tôi xin thanh toán voucher quà tặng Gift card $200 cho đối tác",
            "action": "MESSAGE"
        }
    )
    print("HTTP Status:", response.status_code)
    json_data = response.json()
    print("Step Status:", json_data.get("step_status"))
    print("Reply:", json_data.get("reply"))
    assert response.status_code == 200
    assert json_data.get("step_status") == "REJECTED"

def test_chat_escalated_claim():
    print("\n--- TEST CASE 3: Blurry Receipt Claim (Requires Escalation) ---")
    response = client.post(
        "/api/chat",
        data={
            "message": "Hóa đơn nhà hàng của tôi bị mờ số tiền cuối cùng",
            "action": "MESSAGE"
        }
    )
    print("HTTP Status:", response.status_code)
    json_data = response.json()
    print("Step Status:", json_data.get("step_status"))
    print("Reply:", json_data.get("reply"))
    assert response.status_code == 200
    assert json_data.get("step_status") == "ESCALATED"

if __name__ == "__main__":
    test_chat_approved_claim()
    test_chat_rejected_claim()
    test_chat_escalated_claim()
    print("\nAll 3 Test Cases Executed Successfully!")

