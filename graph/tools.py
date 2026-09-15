from typing import Any
from langchain_core.tools import tool
from langgraph.types import interrupt

from .schemas import ReviewVerdict


def ask_human(question: str, groups: list[str], item: dict[str, Any]) -> str:
    """Pause the graph and request human input.

    The value returned by interrupt() is whatever the caller passes to
    Command(resume=...) on the next invoke.
    """
    payload = {
        "type": "ask_human",
        "question": question,
        "groups": groups or ["default"],
        "item": item,
    }
    resume_value = interrupt(payload)
    # resume_value is expected to be a str, or {"feedback": str, ...}
    if isinstance(resume_value, str):
        return resume_value
    if isinstance(resume_value, dict) and "feedback" in resume_value:
        return str(resume_value["feedback"])
    return str(resume_value)


@tool("submit_verdict", args_schema=ReviewVerdict)
def submit_verdict(verdict: str, rationale: str) -> dict:
    """Submit the final approve/reject decision for the item under review.

    Call this exactly once when you have enough information to decide.
    """
    return {"verdict": verdict, "rationale": rationale, "status": "recorded"}


REVIEW_TOOLS = [submit_verdict]
