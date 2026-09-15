from typing import Literal
from .state import ReviewState


def route_after_decision(state: ReviewState) -> Literal["human_feedback", "review"]:
    """Conditional edge after orange Decision LLM node.

    Diagram mapping:
    - Is_Escalate = True -> [Human Feedback]
    - Is_Escalate = False -> [Reviewer LLM]
    """
    if state.get("is_escalate"):
        return "human_feedback"
    return "review"
