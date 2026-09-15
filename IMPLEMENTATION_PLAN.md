# LangGraph Implementation Plan: Escalate / Human-Feedback / Approve-Reject Graph

> **For the implementing AI:** Follow this document top to bottom. Implement exactly the graph in `MLAI.jpg`. Do **not** spend time checking the environment, installing packages, or verifying versions. Assume `langgraph`, `langchain-core`, `langchain-openai` (or the project’s existing LLM package), `pydantic`, and a checkpointer are available. Write the code; do not run exploratory setup.

---

## 0. What the diagram is

This is a **two-stage review graph** with a human-in-the-loop (HITL) loop.

```
START
  → [Decision LLM]  (orange)
       │  Decision
       ├─ Is_Escalate = True, Groups = [...]  → [Human Feedback]  (teal)
       │                                            │  Asking human tool
       │                                            └─ human_feedback = ...  → back to Decision LLM
       └─ Is_Escalate = False  → [Reviewer LLM]  (yellow)
                                    │  Checking Approve/Reject tool
                                    ├─ Approve → END
                                    └─ Reject  → END
```

**Semantics:**

| Diagram element | Meaning |
|---|---|
| Green start node | Graph entry. Incoming item to review. |
| Orange LLM | First model. Decides whether a human must see this, and which groups. |
| `Is_Escalate = True` | Conditional edge. Route to HITL. |
| `Groups = [...]` | Payload on the escalate path: which human reviewer groups to notify. |
| Teal Human Feedback node | Interrupt the graph and wait for a human. |
| `Asking human tool` | The interrupt / HITL tool used by Human Feedback. |
| `human_feedback = ...` | After the human answers, write feedback onto state and **loop back** to the orange LLM. |
| `Is_Escalate = False` | Conditional edge. Route to the autonomous reviewer. |
| Yellow LLM | Second model. Makes the final Approve / Reject call. |
| `Checking Approve/Reject tool` | Tool the yellow LLM must call. Tool execution is itself interruptible (human may confirm the tool call). |
| Approve / Reject | Terminal outcomes. |

The human-feedback **loop is unbounded in the diagram**. In code, cap it with `max_escalations` so a stuck human/model loop cannot run forever.

---

## 1. Target file layout

Create this structure. Do not add extra folders.

```
.
├── IMPLEMENTATION_PLAN.md          # this file (do not modify)
├── MLAI.jpg                        # source diagram (do not modify)
├── graph/
│   ├── __init__.py                 # export `build_graph`, `ReviewState`
│   ├── state.py                    # state schema + reducers
│   ├── schemas.py                  # structured LLM output models
│   ├── tools.py                    # asking-human + approve/reject tools
│   ├── nodes.py                    # node functions
│   ├── routing.py                  # conditional-edge functions
│   └── builder.py                  # StateGraph assemble + compile
├── app.py                          # tiny CLI / script to invoke and resume
└── tests/
    └── test_graph_structure.py     # structure + routing unit tests (no live LLM required)
```

If the implementing environment already has a package layout, put `graph/` under it, but keep the same module names.

---

## 2. State schema (`graph/state.py`)

Use a `TypedDict` (not a Pydantic model) as LangGraph state. Messages use `add_messages`.

```python
from typing import Annotated, Any, Literal, NotRequired, TypedDict
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages


class ReviewState(TypedDict):
    # Conversation / tool trace. Always append.
    messages: Annotated[list[AnyMessage], add_messages]

    # The item under review. Set once at invoke. Opaque on purpose.
    item: dict[str, Any]

    # --- filled by Decision LLM (orange) ---
    is_escalate: NotRequired[bool]
    groups: NotRequired[list[str]]          # reviewer groups when escalating
    decision_rationale: NotRequired[str]

    # --- filled by Human Feedback node ---
    human_feedback: NotRequired[str]        # latest human answer
    human_feedback_history: NotRequired[list[dict[str, Any]]]

    # --- filled by Reviewer LLM / approve-reject tool ---
    verdict: NotRequired[Literal["approve", "reject"]]
    verdict_rationale: NotRequired[str]

    # --- loop guard ---
    escalation_count: NotRequired[int]
```

**Reducer rules:**

- `messages`: `add_messages` only. Never overwrite.
- `human_feedback`: last-write-wins (default). Also append a record onto `human_feedback_history` inside the human-feedback node (do not use a reducer for history; the node returns the full list).
- `escalation_count`: last-write-wins. The human-feedback node increments it.
- `groups`: last-write-wins. Empty list means “default / any reviewer”.
- `verdict`: last-write-wins. Once set, routing should go to END.

**Do not** put the compiled graph, the LLM client, or secrets on state.

---

## 3. Structured outputs (`graph/schemas.py`)

Two Pydantic models. Bind them with `.with_structured_output(...)` (or equivalent tool-calling structured output). Do not parse free text with regex.

```python
from typing import Literal
from pydantic import BaseModel, Field


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
    """Yellow LLM output, used if you prefer structured output instead of a tool call.
    The diagram shows a *tool*, so prefer the tool in tools.py. Keep this model
    as the tool's argument schema."""
    verdict: Literal["approve", "reject"]
    rationale: str
```

Allowed `groups` values (constrain in the prompt, not with a frozen enum, so the list can grow):

```python
KNOWN_GROUPS = ["compliance", "legal", "security", "ops", "default"]
```

---

## 4. Tools (`graph/tools.py`)

The diagram has **two dashed-box tools**. Implement both.

### 4.1 Asking human tool

This is **not** a normal LLM tool the orange node calls. It is the HITL primitive used **inside** the `human_feedback` node.

Use LangGraph’s `interrupt()` so the graph pauses and the caller resumes with `Command(resume=...)`.

```python
from typing import Any
from langgraph.types import interrupt


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
```

### 4.2 Checking Approve/Reject tool

This **is** an LLM-callable tool. The yellow node must call it. Bind it to the yellow LLM.

Because the dashed box sits in the HITL region, **do not execute the tool automatically**. Put it on a `ToolNode` and compile the graph with `interrupt_before=["review_tools"]` so a human can confirm or override the tool call before it runs.

```python
from langchain_core.tools import tool
from .schemas import ReviewVerdict


@tool("submit_verdict", args_schema=ReviewVerdict)
def submit_verdict(verdict: str, rationale: str) -> dict:
    """Submit the final approve/reject decision for the item under review.

    Call this exactly once when you have enough information to decide.
    """
    return {"verdict": verdict, "rationale": rationale, "status": "recorded"}
```

Export `REVIEW_TOOLS = [submit_verdict]`.

**Why a tool instead of structured output on the yellow LLM?** The diagram names a “Checking Approve/Reject tool” and places it in the HITL box. A bound tool plus `interrupt_before` on the tool node is the LangGraph-native mapping of that picture. Structured output alone would skip the human check.

---

## 5. Nodes (`graph/nodes.py`)

Four nodes. Keep each function small. No I/O besides the LLM / interrupt.

Node names **must** match the builder (section 7):

| Node id | Diagram | Color |
|---|---|---|
| `decision` | Orange LLM | peach |
| `human_feedback` | Human Feedback | teal |
| `review` | Yellow LLM | yellow |
| `review_tools` | Checking Approve/Reject tool | dashed box in HITL region |

Also a tiny `finalize` node that copies the tool result onto `verdict` if the yellow path used the tool. This keeps END state clean.

### 5.1 Shared LLM factory

Do **not** hardcode a vendor inside nodes. Read from env if present, otherwise default:

```python
import os
from langchain_openai import ChatOpenAI  # swap if the repo already has a chat model helper

def get_llm(temperature: float = 0):
    return ChatOpenAI(
        model=os.getenv("REVIEW_MODEL", "gpt-4.1-mini"),
        temperature=temperature,
    )
```

If the project already exposes a chat model, use that instead. Do not add a new provider.

### 5.2 `decision` — orange LLM

**Job:** Look at `item`, `messages`, and any `human_feedback`. Emit `EscalationDecision`. Write `is_escalate`, `groups`, `decision_rationale`. Append an AI message with the rationale.

**Prompt rules (put the system prompt in this module as a constant):**

- You are a routing reviewer, not the final approver.
- If `human_feedback` is present, treat it as authoritative extra context. You may still escalate again if the feedback is incomplete, but prefer `is_escalate=False` once the human answered the open question.
- Escalate when the item is ambiguous, high-risk, policy-grey, or outside what an automated reviewer should decide. Name the `groups` that should see it.
- If `escalation_count` is already `>= MAX_ESCALATIONS` (define `MAX_ESCALATIONS = 3` in this module), you **must** set `is_escalate=False` and let the yellow LLM decide. Mention the cap in the rationale.
- `question_for_human` is required when escalating. One concrete question, not a paragraph.
- Never produce a final approve/reject here.

**Implementation sketch:**

```python
def decision_node(state: ReviewState) -> dict:
    llm = get_llm().with_structured_output(EscalationDecision)
    decision: EscalationDecision = llm.invoke(_decision_messages(state))
    force_off = int(state.get("escalation_count") or 0) >= MAX_ESCALATIONS
    is_escalate = False if force_off else decision.is_escalate
    return {
        "is_escalate": is_escalate,
        "groups": decision.groups if is_escalate else [],
        "decision_rationale": decision.rationale,
        "messages": [AIMessage(content=decision.rationale)],
        # stash the question on messages so human_feedback can read it
        # also return it via a dedicated field if you add one; otherwise
        # encode it in the AIMessage additional_kwargs:
        # AIMessage(..., additional_kwargs={"question_for_human": decision.question_for_human})
    }
```

Add `question_for_human: NotRequired[str]` to state if that is cleaner than `additional_kwargs`. Prefer adding the field.

### 5.3 `human_feedback` — teal node

**Job:** Call `ask_human(...)`. Persist the answer. Increment the loop counter. Clear `is_escalate` so the next decision is fresh.

```python
def human_feedback_node(state: ReviewState) -> dict:
    question = state.get("question_for_human") or "Please review this item and provide feedback."
    groups = state.get("groups") or ["default"]
    feedback = ask_human(question, groups, state["item"])
    history = list(state.get("human_feedback_history") or [])
    history.append({"groups": groups, "question": question, "feedback": feedback})
    return {
        "human_feedback": feedback,
        "human_feedback_history": history,
        "escalation_count": int(state.get("escalation_count") or 0) + 1,
        "is_escalate": False,          # force a re-decide
        "question_for_human": None,
        "messages": [HumanMessage(content=f"[human groups={groups}] {feedback}")],
    }
```

**Do not** call an LLM in this node. The only side effect is `interrupt()`.

### 5.4 `review` — yellow LLM

**Job:** Bind `submit_verdict`. Invoke with the item, prior messages, and any human feedback. The model **must** call `submit_verdict`. If it does not, the routing function (section 6) sends it back to `review` once; after that, raise.

```python
def review_node(state: ReviewState) -> dict:
    llm = get_llm().bind_tools(REVIEW_TOOLS, tool_choice="submit_verdict")
    ai = llm.invoke(_review_messages(state))
    return {"messages": [ai]}
```

Use `tool_choice="submit_verdict"` (or the equivalent forced-function call for the bound model) so the yellow node always emits the tool call the diagram shows.

**Prompt rules:**

- You are the final reviewer.
- Call `submit_verdict` exactly once.
- Use `human_feedback` if present; it outranks your prior hesitation.
- Approve only if the item clearly meets policy. Otherwise reject. No third outcome.

### 5.5 `review_tools` — ToolNode

```python
from langgraph.prebuilt import ToolNode
review_tools_node = ToolNode(REVIEW_TOOLS)
```

Do not wrap this in a custom function unless you need to copy `verdict` out of the `ToolMessage`. Prefer a separate `finalize` node that reads the last `ToolMessage` and sets `verdict` / `verdict_rationale`.

```python
def finalize_node(state: ReviewState) -> dict:
    # Walk messages reversed; first ToolMessage whose name is submit_verdict wins.
    # json.loads(content) → {verdict, rationale, status}
    ...
    return {"verdict": ..., "verdict_rationale": ...}
```

If parsing fails, set `verdict="reject"` and put the parse error in `verdict_rationale`. Never leave `verdict` empty after `finalize`.

---

## 6. Routing (`graph/routing.py`)

Pure functions. No LLM. No I/O.

### 6.1 After `decision`

```python
def route_after_decision(state: ReviewState) -> Literal["human_feedback", "review"]:
    if state.get("is_escalate"):
        return "human_feedback"
    return "review"
```

Map:

- `"human_feedback"` → node `human_feedback`
- `"review"` → node `review`

### 6.2 After `human_feedback`

Always go back to `decision`. This is a **normal edge**, not a conditional.

### 6.3 After `review`

```python
def route_after_review(state: ReviewState) -> Literal["review_tools", "review"]:
    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):
        return "review_tools"
    return "review"   # model failed to call the tool; retry once via builder logic
```

To avoid an infinite retry, the builder should **not** loop `review → review` unbound. Instead: if the last AI message has no tool_calls, `review_node` should itself call `submit_verdict.invoke` with a conservative `reject` and append a synthetic `ToolMessage`, **or** `route_after_review` returns `"finalize"` after detecting a retry (check if the previous AI message also lacked tool_calls). Simplest robust rule:

- If `tool_calls` present → `review_tools`
- Else → `finalize` after injecting a reject (do the inject inside `review_node` when the model returns no tool call). Prefer forcing `tool_choice` so this branch is rare.

### 6.4 After `review_tools`

Always `finalize`. Always then END.

There is **no** edge from `review` directly to END. Approve/Reject in the diagram are the result of the tool, not a second LLM fork.

---

## 7. Graph builder (`graph/builder.py`)

This is the source of truth. Match the diagram one-for-one.

```python
from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import RetryPolicy  # optional; skip if you want a simpler compile

from .state import ReviewState
from .nodes import decision_node, human_feedback_node, review_node, review_tools_node, finalize_node
from .routing import route_after_decision, route_after_review


def build_graph(checkpointer=None):
    g = StateGraph(ReviewState)

    g.add_node("decision", decision_node)
    g.add_node("human_feedback", human_feedback_node)
    g.add_node("review", review_node)
    g.add_node("review_tools", review_tools_node)
    g.add_node("finalize", finalize_node)

    g.add_edge(START, "decision")

    g.add_conditional_edges(
        "decision",
        route_after_decision,
        {"human_feedback": "human_feedback", "review": "review"},
    )

    # Loop: human → orange LLM
    g.add_edge("human_feedback", "decision")

    g.add_conditional_edges(
        "review",
        route_after_review,
        {"review_tools": "review_tools", "review": "review"},
    )

    g.add_edge("review_tools", "finalize")
    g.add_edge("finalize", END)

    return g.compile(
        checkpointer=checkpointer or MemorySaver(),
        interrupt_before=["review_tools"],   # "Checking Approve/Reject tool"
        # human_feedback interrupts via interrupt() inside the node; do not also
        # list it in interrupt_before, or you will pause twice.
    )
```

**Compile notes:**

- A checkpointer is **required**. `interrupt()` and `interrupt_before` do not work without one.
- Thread id is chosen by the caller (`config={"configurable": {"thread_id": "..."}}`).
- Do not set `interrupt_before=["human_feedback"]`. That node already calls `interrupt()`.
- Do not use `interrupt_after`.

### 7.1 ASCII of the compiled graph (must match)

```
START
  └─► decision
        ├─ (is_escalate True)  ► human_feedback ─interrupt()─► (pause)
        │                            └─resume─► decision
        └─ (is_escalate False) ► review
                                    ├─ tool_calls? ► [interrupt_before] review_tools ► finalize ► END
                                    └─ no tools    ► review   (retry / forced reject, see 6.3)
```

---

## 8. Invocation contract (`app.py`)

Two operations only: **start** and **resume**. No web server.

### 8.1 Start

```python
from graph.builder import build_graph

graph = build_graph()
config = {"configurable": {"thread_id": "review-001"}}

initial = {
    "item": {
        "id": "item-001",
        "title": "Example",
        "body": "The content under review.",
        "risk_hints": [],
    },
    "messages": [],
    "escalation_count": 0,
}

result = graph.invoke(initial, config)
```

After `invoke` returns, inspect `graph.get_state(config)`:

| `state.next` | What happened | What the caller does |
|---|---|---|
| `()` empty | Finished. Read `values["verdict"]`. | Print approve/reject. Stop. |
| `('human_feedback',)` or interrupt payload `type=="ask_human"` | HITL ask-human. | Show `question` + `groups`. Collect a string. Resume. |
| `('review_tools',)` | HITL checking approve/reject tool. | Show pending `tool_calls`. Human confirms or edits. Resume. |

### 8.2 Resume after asking-human

```python
from langgraph.types import Command

graph.invoke(Command(resume="The human's free-text feedback."), config)
```

Or `Command(resume={"feedback": "..."})` — both must work because `ask_human` accepts either.

### 8.3 Resume after checking approve/reject tool

Default: approve the pending tool call as-is.

```python
graph.invoke(None, config)          # continue; ToolNode runs
# or, equivalently
graph.invoke(Command(resume=True), config)
```

To **override** the verdict before the tool runs, update state then continue:

```python
graph.update_state(
    config,
    {"messages": [AIMessage(content="", tool_calls=[{
        "id": "<existing id>",
        "name": "submit_verdict",
        "args": {"verdict": "reject", "rationale": "overridden by human"},
    }])]},
    as_node="review",
)
graph.invoke(None, config)
```

Document this in a docstring on `app.py`. Do not build a TUI unless asked later.

### 8.4 CLI shape

`app.py` should be runnable as:

```
python app.py --thread review-001 --item-json '{"id":"1","title":"...","body":"..."}'
```

When the graph pauses, print the interrupt payload as JSON to stdout and exit 0. A second invocation with `--thread review-001 --resume "..."` continues the same thread. This keeps HITL outside the process, which is what the diagram’s “Asking human tool” implies.

If `--item-json` is omitted, use a hard-coded demo item so the graph is exercisable.

---

## 9. Prompts (copy these; do not invent a different policy)

### Decision system prompt

```
You are the routing reviewer in a two-stage review graph.

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

You do not approve or reject. You only route.
```

### Review system prompt

```
You are the final reviewer.

Call submit_verdict exactly once.
verdict is "approve" or "reject". No other value.

Use the original item, the conversation, and any [human ...] messages.
Human feedback outranks your own earlier uncertainty.

Approve only when the item clearly satisfies policy and is complete.
Otherwise reject, and say why in rationale.
```

Keep both prompts as module-level constants in `nodes.py`.

---

## 10. Tests (`tests/test_graph_structure.py`)

No live LLM. Fake the two node LLMs by patching `graph.nodes.get_llm` or by injecting node callables. Prefer building a second graph in the test file that uses stub nodes with the **same names and edges**, plus unit tests of the routing functions against the real `routing.py`.

Cover:

1. **Graph topology.** Compiled graph has nodes `{decision, human_feedback, review, review_tools, finalize}`. `START` connects to `decision`.
2. **Escalate true.** Stub `decision` returns `is_escalate=True`, `groups=["legal"]`. After invoke (with a checkpointer), `state.next` is `human_feedback` **or** the interrupt payload `type == "ask_human"` and `groups == ["legal"]`.
3. **Human loop.** Resume with `"looks fine"`. Next node is `decision` (or a second interrupt if the stub still escalates). `human_feedback` on state equals `"looks fine"`. `escalation_count == 1`.
4. **Escalate false.** Stub `decision` returns `is_escalate=False`. Graph reaches `review`, then pauses at `review_tools` because of `interrupt_before`. Pending tool call name is `submit_verdict`.
5. **Tool confirm.** Resume. Graph completes. `verdict` is `approve` or `reject` matching the stub tool args.
6. **Cap.** `escalation_count=3` (`MAX_ESCALATIONS`) with a stub that *wants* to escalate. Routing still goes to `review`, not `human_feedback`.
7. **route_after_decision** unit tests: `True` → `"human_feedback"`, `False`/missing → `"review"`.

Do not assert on prompt wording. Do not call a real model.

---

## 11. Mapping checklist (the diagram vs the code)

The implementing AI must be able to point at every label in `MLAI.jpg`:

| Diagram label | Code |
|---|---|
| Green start | `START → decision` |
| Orange LLM | node `decision` |
| `Decision` | `EscalationDecision` written onto state |
| `Is_Escalate = True` | `route_after_decision` → `human_feedback` |
| `Groups = [...]` | `state["groups"]`, also inside `interrupt` payload |
| Human Feedback node | node `human_feedback` |
| Asking human tool | `ask_human()` → `interrupt({type: "ask_human", ...})` |
| `human_feedback = ...` edge back to orange LLM | `add_edge("human_feedback", "decision")` |
| `Is_Escalate = False` | `route_after_decision` → `review` |
| Yellow LLM | node `review` |
| Checking Approve/Reject tool | `submit_verdict` + node `review_tools` + `interrupt_before=["review_tools"]` |
| Approve | `finalize` sets `verdict="approve"` then `END` |
| Reject | `finalize` sets `verdict="reject"` then `END` |

If a label has no code counterpart, the implementation is incomplete.

---

## 12. Implementation order

Do this in order. Do not skip ahead to `app.py` before the graph compiles.

1. `graph/state.py` — `ReviewState` as specified, including `question_for_human`.
2. `graph/schemas.py` — the two Pydantic models + `KNOWN_GROUPS`.
3. `graph/tools.py` — `ask_human` and `submit_verdict`.
4. `graph/routing.py` — the two routers. Write the tests for these first if you like.
5. `graph/nodes.py` — five callables / ToolNode. Prompts as constants. `MAX_ESCALATIONS = 3`.
6. `graph/builder.py` — exact edges from section 7. `build_graph()` returns a compiled graph.
7. `graph/__init__.py` — `from .builder import build_graph` and `from .state import ReviewState`.
8. `tests/test_graph_structure.py` — the seven cases in section 10. All must pass.
9. `app.py` — start / resume CLI from section 8.

Stop when the tests pass and `build_graph()` compiles. Do not add FastAPI, LangGraph Studio configs, Docker, or extra agents.

---

## 13. Explicit non-goals

- Do not check or install packages.
- Do not add a second decision model, a memory store, or RAG.
- Do not fan out one item to multiple group-specific subgraphs. `groups` is metadata on a single interrupt, not parallel nodes.
- Do not implement Approve and Reject as two separate nodes. They are values of `verdict`.
- Do not persist HITL answers anywhere except graph state / the checkpointer.
- Do not rename nodes to something “clearer”. The names above are the contract.

---

## 14. Acceptance bar

The work is done when all of the following are true:

- `from graph import build_graph; build_graph()` returns a compiled graph with no error.
- The seven tests in section 10 pass.
- A dry invoke with a stubbed escalate=true pauses in `ask_human` and resumes into `decision`.
- A dry invoke with a stubbed escalate=false pauses before `review_tools` and, after resume, ends with `verdict` set.
- Someone reading `MLAI.jpg` can find every box and arrow in `builder.py`.

---

## 15. Follow-up after first implementation (read this before changing code)

The first pass produced a graph that matches `MLAI.jpg` node-for-node. It is **not** done. The gaps below were found by reviewing `graph/`, `tests/`, `app.py`, and `implementation_log.md`. Fix these; do not re-litigate the topology.

### 15.1 Plan mistakes the first implementer inherited

These were ambiguous or wrong in sections 6–8. The plan is now explicit:

1. **No `review → review` self-loop.** Section 6.3 offered two strategies and then the builder snippet still wired `"review": "review"`. That self-edge is a recursion-limit crash if a stub (or a model that ignores `tool_choice`) emits no `tool_calls`.
   - `review_node` injects a synthetic `submit_verdict` reject when the model returns no tool calls (already done).
   - `route_after_review` must then **always** return `"review_tools"`. Delete the `"review": "review"` mapping from `builder.py`.
   - Keep a unit test that a message *without* tool_calls still routes to `"review_tools"` only after the node injects one; routing on a raw no-tool AIMessage is no longer a supported graph path.

2. **CLI resume must survive process exit.** Section 8.4 said a second `python app.py --thread … --resume` continues the same thread, but section 7 defaulted to `MemorySaver()`, which dies when the process dies.
   - `app.py` must compile with a **file-backed** checkpointer (`SqliteSaver` from `langgraph-checkpoint-sqlite`, or `InMemorySaver` only when an explicit `--ephemeral` flag is set).
   - If the sqlite import fails, **exit with an error**. Do not silently fall back to `MemorySaver()`.
   - `build_graph(checkpointer=None)` may still default to `MemorySaver` for tests.

3. **Do not re-send the full `messages` list plus a fresh item dump every turn.** `_decision_messages` / `_review_messages` currently `extend(state["messages"])` and then append another `HumanMessage` containing the whole item JSON. Each loop duplicates the item. Build a short, explicit message list: system + one item message + prior human_feedback messages only.

4. **Pin the HITL inspect API** so tests do not depend on `snapshot.tasks[0].interrupts` shape:
   - After `interrupt()`, `invoke` returns; `get_state(config).tasks` contains an interrupt whose `.value` is the payload. Also accept `state.next == ("human_feedback",)`.
   - After `interrupt_before=["review_tools"]`, `state.next == ("review_tools",)` and there is **no** `interrupt()` payload. Resume with `invoke(None, config)`, not `Command(resume=…)`.
   - `Command(resume=…)` is **only** for the `ask_human` path.

### 15.2 Implementation bugs / gaps to fix

| ID | Where | What is wrong | What to do |
|---|---|---|---|
| G1 | `graph/routing.py` + `graph/builder.py` | `"review": "review"` self-loop still compiled | Always route `review` → `review_tools`. Drop the self-edge. |
| G2 | `app.py` `get_checkpointer` | Bare `except` falls back to `MemorySaver`; sqlite import is optional and untested | Require sqlite (or another on-disk saver). Fail loud. Print the db path. Add `.checkpoints.sqlite` to a gitignore if you add one. |
| G3 | `graph/nodes.py` `_decision_messages` / `_review_messages` | Context bloat on the human loop | See 15.1.3. |
| G4 | `graph/schemas.py` `KNOWN_GROUPS` | Defined, never enforced | In `decision_node`, intersect `decision.groups` with `KNOWN_GROUPS`. Unknown names dropped. Empty after filter → `["default"]` when escalating. |
| G5 | `tests/test_graph_structure.py` | Test 1 never asserts `START → decision`. Test 3 never asserts post-resume position (`next == ("review_tools",)` once the stub stops escalating). Unused `escalated_once`. Topology test does not read `graph.get_graph()` / edges. | Tighten assertions to match section 10 literally. |
| G6 | `tests/test_graph_structure.py` | No test that `build_graph()` itself (not the stub graph) sets `interrupt_before=["review_tools"]` and does **not** set it on `human_feedback`. | Add it. |
| G7 | `tests/test_graph_structure.py` | No test for `Command(resume={"feedback": "..."})` dict form, nor for override-verdict `update_state`. | Add both. Override can use the stub graph. |
| G8 | `graph/nodes.py` `review_node` | Fallback tool call has a constant `id="fallback_submit_verdict"` | Generate a unique id (`uuid4().hex`) so two fallbacks in one thread do not collide. |
| G9 | `app.py` override path | `update_state(..., as_node="review")` **appends** a second `AIMessage` via `add_messages`. ToolNode uses the last message, so it works, but the first pending tool call remains in history. | Acceptable. Document it. Do not also call `Command(resume=)` on this path. |
| G10 | `implementation_log.md` | Claims “Completed & Ready for Review”; file is truncated after section 6; no failing items | Treat it as a status note, not a spec. Do not use it as acceptance. |

### 15.3 What already matches the diagram — do not rewrite

Leave these alone unless a bug above forces a touch:

- Node names: `decision`, `human_feedback`, `review`, `review_tools`, `finalize`
- `START → decision`
- `decision` conditional: `is_escalate` true/false
- `human_feedback → decision` loop
- `ask_human` → `interrupt({type, question, groups, item})`
- `interrupt_before=["review_tools"]` and **not** on `human_feedback`
- `submit_verdict` as the only yellow-LLM tool
- `finalize` writes `verdict` then `END` (Approve/Reject are values, not nodes)
- `MAX_ESCALATIONS = 3` forced in `decision_node`
- Prompts copied from section 9
- Stubbed tests with no live LLM

### 15.4 Acceptance bar for the follow-up (replaces “stop when tests pass”)

- All original tests still pass, plus G5–G7.
- `route_after_review` no longer returns `"review"`.
- `python app.py --thread t --item-json '{...}'` then a **new process** `python app.py --thread t --resume "..."` continues the same thread (sqlite file exists on disk).
- Human loop does not append a duplicate full-item `HumanMessage` on the second `decision` turn.
- `implementation_log.md` is either deleted or rewritten to list remaining/fixed items honestly. Do not claim complete while G1–G7 are open.

---

## 16. Second follow-up (after G1–G10 code pass)

The second implementation closed G1, G3–G8 in code and G9 in docs. **Do not reopen topology.** Remaining work is smaller and specific.

### Still open

| ID | Severity | What | Fix |
|---|---|---|---|
| R1 | High | **G2 is coded, not proven.** `app.py` requires SqliteSaver, but there is no test that two separately constructed graphs sharing one sqlite file resume the same thread. `SqliteSaver(conn)` is also used without `conn.isolation_level = None` and without `saver.setup()`. Cross-process CLI resume can still silently lose state. | Add `test_r1_sqlite_persists_across_graph_instances`: write a temp db, `invoke` until `ask_human` pause, **discard** the graph object, `build_graph` a second instance on the same path, `Command(resume=...)`, assert `human_feedback` is set. Use `SqliteSaver.from_conn_string` if available; otherwise set `isolation_level = None` and call `setup()`. Do not mark G2 verified until this test exists. |
| R2 | High | **G3 over-stripped the decision prompt.** `_decision_messages` now keeps only `[human …]` lines. Those lines are `{feedback}` without the question that was asked, and `human_feedback_history` is no longer shown. The section 9 rule *“escalate again if the feedback does not answer the open question”* cannot be followed. | Keep the single item dump. Also append one compact block from `human_feedback_history`, e.g. `Q: {question}\nA: {feedback}` per turn. Do **not** re-`extend(state["messages"])`. Mirror the same Q/A block in `_review_messages`. Extend `test_g3_*` to assert the question text is present exactly once per history row and the item JSON still appears once. |
| R3 | Medium | Log overclaims. Status is “All Section 15 Gaps Addressed & Verified”. Section 4 says 11 tests; section 5 lists 13 methods. No pytest output is attached. G2 has no persistence test. | Rewrite the status line to name open IDs (R1–R2 at least). Count `test_*` methods with `grep -c def test_`. Do not use the word “Verified” unless a command was actually run and its summary is pasted. |
| R4 | Low | `route_after_review` ignores state and always returns `"review_tools"`. A one-way `add_edge("review", "review_tools")` is simpler and matches the diagram. | Replace the conditional with `g.add_edge("review", "review_tools")`. Keep `route_after_review` only if tests still import it; or delete it and the G1 unit test. |
| R5 | Low | G6 reads `graph.interrupt_before`. If a LangGraph version stores this elsewhere, the test fails or `getattr(..., ())` silently passes nothing. | If the attribute is missing, fail the test (do not default to `()`). Optionally also prove it at runtime: patch `get_llm` on the **real** `build_graph()`, force `is_escalate=False` + a tool call, assert `get_state().next == ("review_tools",)`. |
| R6 | Low | Unused imports in `tests/test_graph_structure.py` (`uuid`, `ToolMessage`, `ToolNode`, `KNOWN_GROUPS`, `REVIEW_TOOLS`). | Delete them. |

### Closed — do not touch

G1 self-loop, G4 group filter, G5 topology/post-resume asserts, G7 dict-resume + override, G8 unique fallback ids, G9 override docstring, node names, prompts, `interrupt_before=["review_tools"]`, `--ephemeral` vs sqlite fail-loud.

### Acceptance for this pass

- R1 test exists and passes on a temp sqlite file.
- Decision/review prompts contain each history `question` and `feedback` without duplicating item JSON.
- Log status lists remaining items or, if none, pastes the unittest summary.
- Diagram mapping is unchanged.

---

## 17. Hygiene only (graph is frozen)

The third pass implemented R1–R6 in code. **Do not change nodes, edges, prompts, or HITL behavior.** Only the leftovers below.

| ID | What | Fix |
|---|---|---|
| H1 | `graph/routing.py` still defines `route_after_review`. Nothing imports it after R4 switched to `add_edge("review", "review_tools")`. | Delete `route_after_review`. Keep `route_after_decision`. |
| H2 | `implementation_log.md` is internally stale. Header says “R1–R6 Implemented & Verified”; §1–§6 still describe the pre-R4 graph (conditional `route_after_review`, “11 tests”, G3 as `[human …]` only). §8 correctly lists 14 methods. No unittest transcript. | One rewrite: single status line, one test inventory (the 14 names in §8), G3/G1/R4 text matching current `builder.py` / `nodes.py`. Paste `python3 -m unittest tests.test_graph_structure -v` output or write **“tests not executed in this environment”**. Do not say Verified without that paste. |
| H3 | `test_r1_sqlite_persists_across_graph_instances` `skipTest`s if `SqliteSaver` is missing. A green suite can hide the highest-severity check. | Keep the skip. In the log, say **SKIPPED** vs **PASSED** from the actual run. Do not call R1 verified on a skip. |

Acceptance: H1 deleted; log has one inventory and no leftover “11 tests” / `route_after_review` wiring; status matches a real unittest run or an explicit not-run note. Zero graph edits.
