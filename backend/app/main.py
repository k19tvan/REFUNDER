from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api import refund_router, policy_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Refunder - Autonomous Governance & Escalation Referee REST API.\n"
        "Single Unified Endpoint Pipeline:\n"
        "POST /api/refund (Chaining Form -> OCR Extraction -> Master Context -> Agent Arbitration -> Decision)"
    )
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Refund Pipeline Route (POST /api/refund & POST /api/refund/)
app.include_router(refund_router, prefix="/api")

# Policy Route for Frontend Policy Documentation (GET /api/policy)
app.include_router(policy_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "status": "online",
        "system": "Refunder Arbitration Engine",
        "pipeline": "Form (🔴) -> OCR Extraction (🟡) -> Master Context (🟢) -> Agent -> Decision (🟣)",
        "endpoint": "POST /api/refund",
        "interactive_docs": "/docs"
    }
