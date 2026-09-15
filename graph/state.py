from typing import Annotated, Any, Literal, NotRequired, TypedDict
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages


class ReviewState(TypedDict):
    """LangGraph state for the two-stage review graph.

    Reducers:
    - messages: add_messages (append-only)
    - human_feedback: last-write-wins
    - human_feedback_history: last-write-wins (node produces updated list)
    - escalation_count: last-write-wins (incremented by human_feedback_node)
    - groups: last-write-wins
    - verdict: last-write-wins
    """
    # Conversation / tool trace. Always append.
    messages: Annotated[list[AnyMessage], add_messages]

    # The item under review. Set once at invoke. Opaque on purpose.
    item: dict[str, Any]

    # --- filled by Decision LLM (orange) ---
    is_escalate: NotRequired[bool]
    groups: NotRequired[list[str]]                  # reviewer groups when escalating
    decision_rationale: NotRequired[str]
    question_for_human: NotRequired[str | None]     # question to show human if escalating

    # --- filled by Human Feedback node ---
    human_feedback: NotRequired[str]                # latest human answer
    human_feedback_history: NotRequired[list[dict[str, Any]]]

    # --- filled by Reviewer LLM / approve-reject tool ---
    verdict: NotRequired[Literal["approve", "reject"]]
    verdict_rationale: NotRequired[str]

    # --- loop guard ---
    escalation_count: NotRequired[int]
