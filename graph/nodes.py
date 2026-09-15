import json
import os
import uuid
from typing import Any
from langchain_core.messages import AIMessage, AnyMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import ToolNode

from .schemas import KNOWN_GROUPS, EscalationDecision
from .state import ReviewState
from .tools import REVIEW_TOOLS, ask_human

MAX_ESCALATIONS = 3

DECISION_SYSTEM_PROMPT = """You are the routing reviewer in a two-stage review graph.

Decide whether the item must be escalated to a human reviewer group
before a final approve/reject.

Escalate (is_escalate=true) when:
- the item is ambiguous, incomplete, or contradictory
- the item looks high-risk (legal, safety, security, compliance)
- you are not confident an automated reviewer should decide
- human_feedback is present but does not actually answer the open question

Do not escalate when:
- the item is clear and low-risk
- human_feedback already answers the question you (or a previous turn) asked
- escalation_count has reached the cap (the user message will tell you)

When escalating:
- pick one or more groups from: compliance, legal, security, ops, default
- write one concrete question_for_human

When not escalating:
- groups must be []
- question_for_human must be null

You do not approve or reject. You only route."""

REVIEW_SYSTEM_PROMPT = """You are the final reviewer.

Call submit_verdict exactly once.
verdict is "approve" or "reject". No other value.

Use the original item, the conversation, and any [human ...] messages.
Human feedback outranks your own earlier uncertainty.

Approve only when the item clearly satisfies policy and is complete.
Otherwise reject, and say why in rationale."""


def get_llm(temperature: float = 0):
    """Shared LLM factory. Reads model from env or defaults to gpt-4.1-mini."""
    return ChatOpenAI(
        model=os.getenv("REVIEW_MODEL", "gpt-4.1-mini"),
        temperature=temperature,
    )


def _decision_messages(state: ReviewState) -> list[AnyMessage]:
    """Assemble a compact message list for the decision LLM:
    system prompt + one item message with escalation count + compact Q/A feedback history block.
    Prevents message context bloat while preserving question context (Section 16 R2).
    """
    messages: list[AnyMessage] = [
        SystemMessage(content=DECISION_SYSTEM_PROMPT),
        HumanMessage(
            content=(
                f"Item under review:\n{json.dumps(state.get('item', {}), indent=2)}\n\n"
                f"Current escalation count: {state.get('escalation_count', 0)} (Max allowed: {MAX_ESCALATIONS})"
            )
        ),
    ]

    history = state.get("human_feedback_history") or []
    if history:
        qa_lines = [
            f"Turn {i+1} [groups={h.get('groups', ['default'])}]:\nQ: {h.get('question', '')}\nA: {h.get('feedback', '')}"
            for i, h in enumerate(history)
        ]
        messages.append(
            HumanMessage(
                content="Prior Human Feedback History:\n" + "\n\n".join(qa_lines)
            )
        )

    return messages


def decision_node(state: ReviewState) -> dict:
    """Orange LLM node. Decides whether to escalate to human feedback."""
    llm = get_llm().with_structured_output(EscalationDecision)
    decision: EscalationDecision = llm.invoke(_decision_messages(state))

    force_off = int(state.get("escalation_count") or 0) >= MAX_ESCALATIONS
    is_escalate = False if force_off else decision.is_escalate
    rationale = decision.rationale
    if force_off and decision.is_escalate:
        rationale = f"{rationale} [Escalation cap reached: {MAX_ESCALATIONS}. Forcing route to reviewer.]"

    # Enforce KNOWN_GROUPS (G4): filter unknown groups; default to ["default"] if empty when escalating
    if is_escalate:
        valid_groups = [g for g in decision.groups if g in KNOWN_GROUPS]
        groups = valid_groups if valid_groups else ["default"]
    else:
        groups = []

    return {
        "is_escalate": is_escalate,
        "groups": groups,
        "decision_rationale": rationale,
        "question_for_human": decision.question_for_human if is_escalate else None,
        "messages": [AIMessage(content=rationale)],
    }


def human_feedback_node(state: ReviewState) -> dict:
    """Teal Human Feedback node. Calls interrupt() via ask_human and records answer."""
    question = (
        state.get("question_for_human")
        or "Please review this item and provide feedback."
    )
    groups = state.get("groups") or ["default"]
    feedback = ask_human(question, groups, state["item"])
    history = list(state.get("human_feedback_history") or [])
    history.append({"groups": groups, "question": question, "feedback": feedback})
    return {
        "human_feedback": feedback,
        "human_feedback_history": history,
        "escalation_count": int(state.get("escalation_count") or 0) + 1,
        "is_escalate": False,  # force re-decision on loop back
        "question_for_human": None,
        "messages": [HumanMessage(content=f"[human groups={groups}] {feedback}")],
    }


def _review_messages(state: ReviewState) -> list[AnyMessage]:
    """Assemble a compact message list for the reviewer LLM:
    system prompt + one item message + compact Q/A feedback history block + routing rationale.
    """
    messages: list[AnyMessage] = [
        SystemMessage(content=REVIEW_SYSTEM_PROMPT),
        HumanMessage(
            content=f"Item under review:\n{json.dumps(state.get('item', {}), indent=2)}"
        ),
    ]

    history = state.get("human_feedback_history") or []
    if history:
        qa_lines = [
            f"Turn {i+1} [groups={h.get('groups', ['default'])}]:\nQ: {h.get('question', '')}\nA: {h.get('feedback', '')}"
            for i, h in enumerate(history)
        ]
        messages.append(
            HumanMessage(
                content="Prior Human Feedback History:\n" + "\n\n".join(qa_lines)
            )
        )

    if state.get("decision_rationale"):
        messages.append(
            AIMessage(content=f"Routing rationale: {state['decision_rationale']}")
        )

    return messages


def review_node(state: ReviewState) -> dict:
    """Yellow LLM node. Emits submit_verdict tool call."""
    llm = get_llm().bind_tools(REVIEW_TOOLS, tool_choice="submit_verdict")
    ai = llm.invoke(_review_messages(state))

    # Defensive guard (G8): if the model failed to emit a tool call, inject unique fallback reject
    if not getattr(ai, "tool_calls", None):
        fallback_id = f"fallback_{uuid.uuid4().hex}"
        ai = AIMessage(
            content=ai.content or "No tool call emitted; defaulting to reject.",
            tool_calls=[
                {
                    "name": "submit_verdict",
                    "args": {
                        "verdict": "reject",
                        "rationale": "Model failed to produce submit_verdict tool call; defaulted to reject.",
                    },
                    "id": fallback_id,
                    "type": "tool_call",
                }
            ],
        )

    return {"messages": [ai]}


# Dashed box tool node in HITL region
review_tools_node = ToolNode(REVIEW_TOOLS)


def finalize_node(state: ReviewState) -> dict:
    """Copies the tool result onto verdict and verdict_rationale. Keeps END state clean."""
    messages = state.get("messages", [])

    # 1. Look for ToolMessage produced by submit_verdict tool execution
    for msg in reversed(messages):
        if isinstance(msg, ToolMessage) and msg.name == "submit_verdict":
            try:
                if isinstance(msg.content, dict):
                    data = msg.content
                elif isinstance(msg.content, str):
                    data = json.loads(msg.content)
                else:
                    data = json.loads(str(msg.content))

                verdict = data.get("verdict")
                rationale = data.get("rationale", "")
                if verdict in ("approve", "reject"):
                    return {"verdict": verdict, "verdict_rationale": rationale}
                else:
                    return {
                        "verdict": "reject",
                        "verdict_rationale": f"Invalid verdict value received: {verdict}",
                    }
            except Exception as e:
                return {
                    "verdict": "reject",
                    "verdict_rationale": f"Failed to parse submit_verdict tool result: {e}",
                }

    # 2. Fallback check: look for tool_calls directly on AIMessage if ToolNode was overridden
    for msg in reversed(messages):
        tool_calls = getattr(msg, "tool_calls", None)
        if tool_calls:
            for tc in tool_calls:
                if tc.get("name") == "submit_verdict":
                    args = tc.get("args", {})
                    v = args.get("verdict", "reject")
                    r = args.get("rationale", "")
                    if v in ("approve", "reject"):
                        return {"verdict": v, "verdict_rationale": r}

    # 3. Default fallback: never leave verdict empty
    return {
        "verdict": "reject",
        "verdict_rationale": "No submit_verdict tool call or execution output found.",
    }
