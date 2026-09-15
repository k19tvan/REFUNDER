from typing import Literal
from pydantic import BaseModel, Field

KNOWN_GROUPS = ["compliance", "legal", "security", "ops", "default"]


class EscalationDecision(BaseModel):
    """Orange LLM output."""
    is_escalate: bool = Field(
        description="True if a human in one of `groups` must review this before a verdict."
    )
    groups: list[str] = Field(
        default_factory=list,
        description="Reviewer groups to notify when is_escalate is True. Empty if False.",
    )
    rationale: str = Field(description="Short reason for the escalation decision.")
    question_for_human: str | None = Field(
        default=None,
        description="If escalating, the exact question to show the human. Null otherwise.",
    )


class ReviewVerdict(BaseModel):
    """Yellow LLM output, used as the tool's argument schema for submit_verdict."""
    verdict: Literal["approve", "reject"] = Field(
        description="Final verdict: 'approve' or 'reject'."
    )
    rationale: str = Field(
        description="Detailed reason justifying the approve or reject verdict."
    )
