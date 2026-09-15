from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from .nodes import (
    decision_node,
    finalize_node,
    human_feedback_node,
    review_node,
    review_tools_node,
)
from .routing import route_after_decision
from .state import ReviewState


def build_graph(checkpointer=None):
    """Build and compile the two-stage review graph.

    Graph architecture matching MLAI.jpg:
    - START -> decision (orange LLM)
    - decision -> (is_escalate=True) -> human_feedback (teal HITL node)
    - human_feedback -> decision (loop back)
    - decision -> (is_escalate=False) -> review (yellow LLM)
    - review -> review_tools (checking approve/reject tool, direct edge, paused by interrupt_before)
    - review_tools -> finalize -> END

    Human-in-the-loop points:
    1. human_feedback node: calls interrupt() dynamically with {type: 'ask_human', ...}
    2. review_tools node: paused before execution via interrupt_before=['review_tools']
    """
    g = StateGraph(ReviewState)

    # Nodes
    g.add_node("decision", decision_node)
    g.add_node("human_feedback", human_feedback_node)
    g.add_node("review", review_node)
    g.add_node("review_tools", review_tools_node)
    g.add_node("finalize", finalize_node)

    # Entry edge
    g.add_edge(START, "decision")

    # Conditional routing after orange Decision LLM
    g.add_conditional_edges(
        "decision",
        route_after_decision,
        {"human_feedback": "human_feedback", "review": "review"},
    )

    # Loop: human feedback -> orange Decision LLM
    g.add_edge("human_feedback", "decision")

    # Direct edge to review_tools (matches MLAI.jpg & Section 16 R4)
    g.add_edge("review", "review_tools")

    # Tool execution to finalize and termination
    g.add_edge("review_tools", "finalize")
    g.add_edge("finalize", END)

    return g.compile(
        checkpointer=checkpointer or MemorySaver(),
        interrupt_before=["review_tools"],  # HITL checking approve/reject tool
    )
