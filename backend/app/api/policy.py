import os
from typing import Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/policy", tags=["Company Policy"])

DEFAULT_POLICY_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "policy.md"
)

class PolicyImportRequest(BaseModel):
    filename: str
    content: str

_CURRENT_POLICY_CACHE = {
    "filename": "FIN-EXP-001.md",
    "content": None
}

def _load_policy_content() -> str:
    if _CURRENT_POLICY_CACHE["content"]:
        return _CURRENT_POLICY_CACHE["content"]
    
    if os.path.exists(DEFAULT_POLICY_PATH):
        try:
            with open(DEFAULT_POLICY_PATH, "r", encoding="utf-8") as f:
                _CURRENT_POLICY_CACHE["content"] = f.read()
                return _CURRENT_POLICY_CACHE["content"]
        except Exception:
            pass
            
    return "# CHÍNH SÁCH CÔNG TÁC PHÍ VÀ HOÀN ỨNG (FIN-EXP-001)\n\nChính sách chi tiêu mặc định."

@router.get("")
async def get_policy():
    """Lấy nội dung chính sách hiện hành."""
    content = _load_policy_content()
    return {
        "filename": _CURRENT_POLICY_CACHE["filename"],
        "content": content,
        "size": f"{len(content) / 1024:.1f} KB",
        "status": "ACTIVE"
    }

@router.post("/import")
async def import_policy(payload: PolicyImportRequest):
    """Cập nhật hoặc tải lên văn bản chính sách mới."""
    _CURRENT_POLICY_CACHE["filename"] = payload.filename
    _CURRENT_POLICY_CACHE["content"] = payload.content
    return {
        "status": "SUCCESS",
        "message": f"Successfully imported {payload.filename}",
        "filename": payload.filename,
        "size": f"{len(payload.content) / 1024:.1f} KB"
    }

