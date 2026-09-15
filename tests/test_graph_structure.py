"""Structure and routing unit tests for the two-stage review graph.

No live LLMs are used. All LLM calls are stubbed or mocked.
Covers all requirements from Section 10, Section 15, and Section 16 of IMPLEMENTATION_PLAN.md:
- R1 / G2: SQLite cross-instance process persistence test.
- R2 / G3: Compact prompt messages preserving Q/A history without duplicate item dumps.
- R4 / G1: Direct edge review -> review_tools (no self-loops).
- R5 / G6: Compiled graph interrupt_before validation (static attribute & runtime execution).
- R6: Clean imports (no unused symbols).
- G4: KNOWN_GROUPS filtering.
- G5: Topology START -> decision edge inspection and post-resume position check.
- G7: Dict resume payload and update_state verdict override.
- G8: Unique fallback tool call IDs.

Can be run with:
    pytest tests/test_graph_structure.py
Or directly with:
    python tests/test_graph_structure.py
"""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command

from graph.builder import build_graph
from graph.nodes import (
    MAX_ESCALATIONS,
    _decision_messages,
    _review_messages,
    decision_node,
    finalize_node,
    human_feedback_node,
    review_node,
    review_tools_node,
)
from graph.routing import route_after_decision
from graph.schemas import EscalationDecision
from graph.state import ReviewState


def _build_stubbed_graph(decision_fn, review_fn, checkpointer=None):
    """Helper to assemble a graph with stubbed LLM nodes but identical topology."""
    g = StateGraph(ReviewState)
    g.add_node("decision", decision_fn)
    g.add_node("human_feedback", human_feedback_node)
    g.add_node("review", review_fn)
    g.add_node("review_tools", review_tools_node)
    g.add_node("finalize", finalize_node)

    g.add_edge(START, "decision")
    g.add_conditional_edges(
        "decision",
        route_after_decision,
        {"human_feedback": "human_feedback", "review": "review"},
    )
    g.add_edge("human_feedback", "decision")
    # Direct edge review -> review_tools (matches MLAI.jpg & Section 16 R4)
    g.add_edge("review", "review_tools")
    g.add_edge("review_tools", "finalize")
    g.add_edge("finalize", END)

    return g.compile(
        checkpointer=checkpointer or MemorySaver(),
        interrupt_before=["review_tools"],
    )


class TestGraphStructure(unittest.TestCase):
    """Test suite matching Sections 10, 15, and 16 of IMPLEMENTATION_PLAN.md."""

    def test_1_graph_topology(self):
        """1. Graph topology (Section 10.1 & G5).

        Compiled graph has nodes {decision, human_feedback, review, review_tools, finalize}.
        Asserts START connects to decision using get_graph() edges.
        """
        graph = build_graph()
        drawable = graph.get_graph()

        node_keys = set(drawable.nodes.keys())
        expected_nodes = {
            "decision",
            "human_feedback",
            "review",
            "review_tools",
            "finalize",
        }
        self.assertTrue(
            expected_nodes.issubset(node_keys),
            f"Missing nodes: {expected_nodes - node_keys}",
        )

        # Assert START -> decision edge directly on compiled graph
        start_targets = [
            e.target for e in drawable.edges if e.source in ("__start__", "START")
        ]
        self.assertIn(
            "decision",
            start_targets,
            f"Expected START -> decision edge, found: {start_targets}",
        )

    def test_g6_r5_compiled_graph_interrupt_configuration(self):
        """G6 & R5: build_graph() sets interrupt_before=['review_tools'] and NOT on human_feedback.

        Verifies attribute presence without swallowing missing attribute, and proves
        the pause behavior at runtime on the real build_graph() instance.
        """
        graph = build_graph()
        # Fail loudly if interrupt_before attribute does not exist (R5)
        self.assertTrue(
            hasattr(graph, "interrupt_before"),
            "Compiled graph must have 'interrupt_before' attribute",
        )
        self.assertIn(
            "review_tools",
            graph.interrupt_before,
            "Expected 'review_tools' to be in interrupt_before",
        )
        self.assertNotIn(
            "human_feedback",
            graph.interrupt_before,
            "human_feedback should not be in interrupt_before (it uses dynamic interrupt())",
        )

        # Prove pause behavior at runtime on the real build_graph() (R5)
        mock_decision_llm = MagicMock()
        mock_decision_llm.invoke.return_value = EscalationDecision(
            is_escalate=False,
            groups=[],
            rationale="No escalation needed, route directly to review.",
            question_for_human=None,
        )

        mock_review_llm = MagicMock()
        mock_review_llm.invoke.return_value = AIMessage(
            content="Verifying approval",
            tool_calls=[
                {
                    "name": "submit_verdict",
                    "args": {"verdict": "approve", "rationale": "All requirements met."},
                    "id": "call_mock_runtime",
                    "type": "tool_call",
                }
            ],
        )

        def mock_get_llm(*args, **kwargs):
            m = MagicMock()
            m.with_structured_output.return_value = mock_decision_llm
            m.bind_tools.return_value = mock_review_llm
            return m

        with patch("graph.nodes.get_llm", side_effect=mock_get_llm):
            real_graph = build_graph()
            config = {"configurable": {"thread_id": "thread-r5-runtime"}}
            real_graph.invoke(
                {"item": {"id": "item-r5"}, "messages": [], "escalation_count": 0},
                config,
            )
            snapshot = real_graph.get_state(config)
            self.assertEqual(
                snapshot.next,
                ("review_tools",),
                "Real build_graph() must pause with next == ('review_tools',)",
            )

    def test_2_escalate_true_interrupts(self):
        """2. Escalate true (Section 10.2).

        Stub decision returns is_escalate=True, groups=["legal"].
        After invoke, graph pauses at ask_human interrupt with groups=["legal"].
        """
        def stub_decision(state: ReviewState) -> dict:
            return {
                "is_escalate": True,
                "groups": ["legal"],
                "question_for_human": "Is this contract acceptable?",
                "decision_rationale": "High risk legal item.",
                "messages": [AIMessage(content="Escalating to legal.")],
            }

        def stub_review(state: ReviewState) -> dict:
            return {"messages": []}

        app = _build_stubbed_graph(stub_decision, stub_review)
        config = {"configurable": {"thread_id": "test-thread-2"}}
        initial_state = {
            "item": {"id": "doc-001", "title": "Contract A"},
            "messages": [],
            "escalation_count": 0,
        }

        app.invoke(initial_state, config)
        snapshot = app.get_state(config)

        # Graph pauses at human_feedback via interrupt()
        has_ask_human_interrupt = False
        if snapshot.tasks:
            for t in snapshot.tasks:
                for intr in getattr(t, "interrupts", ()):
                    payload = intr.value
                    if isinstance(payload, dict) and payload.get("type") == "ask_human":
                        has_ask_human_interrupt = True
                        self.assertEqual(payload.get("groups"), ["legal"])
                        self.assertEqual(
                            payload.get("question"), "Is this contract acceptable?"
                        )

        self.assertTrue(
            has_ask_human_interrupt or snapshot.next == ("human_feedback",),
            "Expected graph to pause with ask_human interrupt at human_feedback",
        )

    def test_3_human_loop_and_resume(self):
        """3. Human loop (Section 10.3 & G5).

        Resume with 'looks fine'. Next node is decision, and once decision does not
        escalate, graph reaches review and pauses at review_tools (next == ('review_tools',)).
        human_feedback on state equals 'looks fine'. escalation_count == 1.
        """
        def stub_decision(state: ReviewState) -> dict:
            if not state.get("human_feedback"):
                return {
                    "is_escalate": True,
                    "groups": ["compliance"],
                    "question_for_human": "Is compliance satisfied?",
                    "decision_rationale": "Requires compliance check.",
                    "messages": [AIMessage(content="Need compliance review.")],
                }
            # Turn 2: human feedback received, proceed to review
            return {
                "is_escalate": False,
                "groups": [],
                "decision_rationale": "Compliance confirmed.",
                "messages": [AIMessage(content="Proceeding to review.")],
            }

        def stub_review(state: ReviewState) -> dict:
            return {
                "messages": [
                    AIMessage(
                        content="Reviewed",
                        tool_calls=[
                            {
                                "name": "submit_verdict",
                                "args": {
                                    "verdict": "approve",
                                    "rationale": "Approved after compliance confirmed.",
                                },
                                "id": "call_submit_1",
                                "type": "tool_call",
                            }
                        ],
                    )
                ]
            }

        app = _build_stubbed_graph(stub_decision, stub_review)
        config = {"configurable": {"thread_id": "test-thread-3"}}
        initial_state = {
            "item": {"id": "doc-002", "title": "Policy Document"},
            "messages": [],
            "escalation_count": 0,
        }

        # First run pauses at human_feedback
        app.invoke(initial_state, config)

        # Resume with human feedback string
        app.invoke(Command(resume="looks fine"), config)

        snapshot = app.get_state(config)
        self.assertEqual(snapshot.values.get("human_feedback"), "looks fine")
        self.assertEqual(snapshot.values.get("escalation_count"), 1)

        # Verify history recorded
        history = snapshot.values.get("human_feedback_history")
        self.assertIsNotNone(history)
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["feedback"], "looks fine")

        # G5: Assert post-resume position has reached review_tools interrupt
        self.assertEqual(
            snapshot.next,
            ("review_tools",),
            "After human feedback is addressed, graph must advance to ('review_tools',)",
        )

    def test_g7_resume_with_dict_payload(self):
        """G7: Test Command(resume={'feedback': '...'}) dict resume format."""
        def stub_decision(state: ReviewState) -> dict:
            if not state.get("human_feedback"):
                return {
                    "is_escalate": True,
                    "groups": ["ops"],
                    "question_for_human": "Can ops scale this?",
                    "decision_rationale": "Need ops feedback.",
                    "messages": [],
                }
            return {
                "is_escalate": False,
                "groups": [],
                "decision_rationale": "Ops confirmed.",
                "messages": [],
            }

        def stub_review(state: ReviewState) -> dict:
            return {
                "messages": [
                    AIMessage(
                        content="Reviewed",
                        tool_calls=[
                            {
                                "name": "submit_verdict",
                                "args": {"verdict": "approve", "rationale": "Ops ok"},
                                "id": "call_ops",
                                "type": "tool_call",
                            }
                        ],
                    )
                ]
            }

        app = _build_stubbed_graph(stub_decision, stub_review)
        config = {"configurable": {"thread_id": "test-thread-dict-resume"}}
        initial_state = {"item": {"id": "ops-001"}, "messages": [], "escalation_count": 0}

        app.invoke(initial_state, config)
        # Resume with dict format
        app.invoke(Command(resume={"feedback": "Ops approves scaling capacity."}), config)

        snapshot = app.get_state(config)
        self.assertEqual(
            snapshot.values.get("human_feedback"),
            "Ops approves scaling capacity.",
        )

    def test_4_escalate_false_reaches_review_tools(self):
        """4. Escalate false (Section 10.4).

        Stub decision returns is_escalate=False. Graph reaches review,
        then pauses before review_tools because of interrupt_before.
        Pending tool call name is submit_verdict.
        """
        def stub_decision(state: ReviewState) -> dict:
            return {
                "is_escalate": False,
                "groups": [],
                "decision_rationale": "Clear and low risk.",
                "messages": [AIMessage(content="Low risk, passing to review.")],
            }

        def stub_review(state: ReviewState) -> dict:
            return {
                "messages": [
                    AIMessage(
                        content="Final review ready.",
                        tool_calls=[
                            {
                                "name": "submit_verdict",
                                "args": {
                                    "verdict": "approve",
                                    "rationale": "Clear low-risk item.",
                                },
                                "id": "call_verdict_4",
                                "type": "tool_call",
                            }
                        ],
                    )
                ]
            }

        app = _build_stubbed_graph(stub_decision, stub_review)
        config = {"configurable": {"thread_id": "test-thread-4"}}
        initial_state = {
            "item": {"id": "doc-004", "title": "Low Risk Form"},
            "messages": [],
            "escalation_count": 0,
        }

        app.invoke(initial_state, config)
        snapshot = app.get_state(config)

        # Pauses before review_tools via interrupt_before
        self.assertEqual(snapshot.next, ("review_tools",))
        last_msg = snapshot.values["messages"][-1]
        self.assertTrue(hasattr(last_msg, "tool_calls"))
        self.assertEqual(last_msg.tool_calls[0]["name"], "submit_verdict")

    def test_5_tool_confirm_and_finalize(self):
        """5. Tool confirm (Section 10.5).

        Resume after review_tools interrupt with invoke(None, config). Graph completes.
        verdict is approve or reject matching the stub tool args.
        """
        def stub_decision(state: ReviewState) -> dict:
            return {
                "is_escalate": False,
                "groups": [],
                "decision_rationale": "No escalation needed.",
                "messages": [AIMessage(content="Direct review.")],
            }

        def stub_review(state: ReviewState) -> dict:
            return {
                "messages": [
                    AIMessage(
                        content="Rejecting due to policy violation.",
                        tool_calls=[
                            {
                                "name": "submit_verdict",
                                "args": {
                                    "verdict": "reject",
                                    "rationale": "Missing required signature.",
                                },
                                "id": "call_verdict_5",
                                "type": "tool_call",
                            }
                        ],
                    )
                ]
            }

        app = _build_stubbed_graph(stub_decision, stub_review)
        config = {"configurable": {"thread_id": "test-thread-5"}}
        initial_state = {
            "item": {"id": "doc-005", "title": "Incomplete Agreement"},
            "messages": [],
            "escalation_count": 0,
        }

        # Pauses at review_tools
        app.invoke(initial_state, config)
        self.assertEqual(app.get_state(config).next, ("review_tools",))

        # Confirm and continue (invoke(None, config) as specified in 15.1.4)
        app.invoke(None, config)

        final_snapshot = app.get_state(config)
        self.assertEqual(final_snapshot.next, ())  # Finished (END reached)
        self.assertEqual(final_snapshot.values.get("verdict"), "reject")
        self.assertEqual(
            final_snapshot.values.get("verdict_rationale"),
            "Missing required signature.",
        )

    def test_g7_override_verdict_via_update_state(self):
        """G7: Test human override of verdict via update_state at review_tools interrupt."""
        def stub_decision(state: ReviewState) -> dict:
            return {
                "is_escalate": False,
                "groups": [],
                "decision_rationale": "Direct review.",
                "messages": [],
            }

        def stub_review(state: ReviewState) -> dict:
            return {
                "messages": [
                    AIMessage(
                        content="Initial rejection.",
                        tool_calls=[
                            {
                                "name": "submit_verdict",
                                "args": {"verdict": "reject", "rationale": "Flagged initially."},
                                "id": "orig_call_id",
                                "type": "tool_call",
                            }
                        ],
                    )
                ]
            }

        app = _build_stubbed_graph(stub_decision, stub_review)
        config = {"configurable": {"thread_id": "test-thread-override"}}
        initial_state = {"item": {"id": "override-001"}, "messages": [], "escalation_count": 0}

        app.invoke(initial_state, config)
        self.assertEqual(app.get_state(config).next, ("review_tools",))

        # Human reviewer overrides verdict to 'approve' before tool runs
        app.update_state(
            config,
            {
                "messages": [
                    AIMessage(
                        content="",
                        tool_calls=[
                            {
                                "id": "orig_call_id",
                                "name": "submit_verdict",
                                "args": {
                                    "verdict": "approve",
                                    "rationale": "Human reviewer approved with waiver.",
                                },
                                "type": "tool_call",
                            }
                        ],
                    )
                ]
            },
            as_node="review",
        )

        # Continue without Command(resume=)
        app.invoke(None, config)

        final_snapshot = app.get_state(config)
        self.assertEqual(final_snapshot.next, ())
        self.assertEqual(final_snapshot.values.get("verdict"), "approve")
        self.assertEqual(
            final_snapshot.values.get("verdict_rationale"),
            "Human reviewer approved with waiver.",
        )

    def test_6_escalation_cap(self):
        """6. Cap (Section 10.6).

        escalation_count=3 (MAX_ESCALATIONS) with a decision node that wants to escalate.
        Cap forces is_escalate=False and routing goes to review, not human_feedback.
        """
        mock_llm = MagicMock()
        mock_structured = MagicMock()
        mock_structured.invoke.return_value = EscalationDecision(
            is_escalate=True,
            groups=["security"],
            rationale="Security check requested.",
            question_for_human="Is port 22 open?",
        )
        mock_llm.with_structured_output.return_value = mock_structured

        with patch("graph.nodes.get_llm", return_value=mock_llm):
            state: ReviewState = {
                "item": {"id": "srv-001"},
                "messages": [],
                "escalation_count": MAX_ESCALATIONS,
            }
            output = decision_node(state)
            self.assertFalse(output["is_escalate"])
            self.assertEqual(output["groups"], [])
            self.assertIn("Escalation cap reached", output["decision_rationale"])

            # Verify routing function sends forced False to 'review'
            state["is_escalate"] = output["is_escalate"]
            destination = route_after_decision(state)
            self.assertEqual(destination, "review")

    def test_g4_known_groups_filter(self):
        """G4: Verify decision_node intersects decision.groups with KNOWN_GROUPS."""
        mock_llm = MagicMock()
        mock_structured = MagicMock()

        mock_structured.invoke.return_value = EscalationDecision(
            is_escalate=True,
            groups=["legal", "finance_unknown", "security"],
            rationale="Needs review.",
            question_for_human="Question",
        )
        mock_llm.with_structured_output.return_value = mock_structured

        with patch("graph.nodes.get_llm", return_value=mock_llm):
            state: ReviewState = {"item": {}, "messages": [], "escalation_count": 0}
            out = decision_node(state)
            self.assertEqual(out["groups"], ["legal", "security"])

        # All unknown groups should fallback to ["default"]
        mock_structured.invoke.return_value = EscalationDecision(
            is_escalate=True,
            groups=["totally_bogus_group"],
            rationale="Needs review.",
            question_for_human="Question",
        )
        with patch("graph.nodes.get_llm", return_value=mock_llm):
            out = decision_node(state)
            self.assertEqual(out["groups"], ["default"])

    def test_g3_r2_compact_messages_with_qa_history(self):
        """G3 & R2: Verify prompt messages contain Q/A history without duplicate item JSON."""
        state: ReviewState = {
            "item": {"id": "item-123", "data": "payload"},
            "messages": [
                AIMessage(content="Turn 1 rationale"),
                AIMessage(content="Turn 2 rationale"),
            ],
            "human_feedback_history": [
                {
                    "groups": ["legal"],
                    "question": "Is indemnification capped?",
                    "feedback": "Yes, capped at 1x contract value.",
                },
                {
                    "groups": ["security"],
                    "question": "Are tokens encrypted at rest?",
                    "feedback": "Confirmed AES-256 encrypted.",
                },
            ],
            "decision_rationale": "Routing to final review.",
            "escalation_count": 2,
        }

        # Test _decision_messages
        dec_msgs = _decision_messages(state)
        # Item JSON must appear exactly once in the messages
        dec_item_count = sum(
            1 for m in dec_msgs if isinstance(m, HumanMessage) and "item-123" in m.content
        )
        self.assertEqual(dec_item_count, 1, "Item JSON must appear exactly once in decision messages")

        # Question and feedback must appear for each history row
        dec_all_text = " ".join(m.content for m in dec_msgs)
        self.assertEqual(
            dec_all_text.count("Is indemnification capped?"),
            1,
            "Question 1 must appear exactly once",
        )
        self.assertIn("Yes, capped at 1x contract value.", dec_all_text)
        self.assertEqual(
            dec_all_text.count("Are tokens encrypted at rest?"),
            1,
            "Question 2 must appear exactly once",
        )
        self.assertIn("Confirmed AES-256 encrypted.", dec_all_text)

        # Test _review_messages
        rev_msgs = _review_messages(state)
        rev_item_count = sum(
            1 for m in rev_msgs if isinstance(m, HumanMessage) and "item-123" in m.content
        )
        self.assertEqual(rev_item_count, 1, "Item JSON must appear exactly once in review messages")

        rev_all_text = " ".join(m.content for m in rev_msgs)
        self.assertEqual(
            rev_all_text.count("Is indemnification capped?"),
            1,
            "Question 1 must appear exactly once in review messages",
        )
        self.assertIn("Yes, capped at 1x contract value.", rev_all_text)
        self.assertEqual(
            rev_all_text.count("Are tokens encrypted at rest?"),
            1,
            "Question 2 must appear exactly once in review messages",
        )
        self.assertIn("Confirmed AES-256 encrypted.", rev_all_text)

    def test_g8_review_fallback_unique_id(self):
        """G8: Verify review_node fallback generates a unique tool call ID."""
        mock_llm = MagicMock()
        mock_bound = MagicMock()
        mock_bound.invoke.return_value = AIMessage(content="I forgot tool calls")
        mock_llm.bind_tools.return_value = mock_bound

        with patch("graph.nodes.get_llm", return_value=mock_llm):
            state: ReviewState = {"item": {}, "messages": []}
            out1 = review_node(state)
            id1 = out1["messages"][0].tool_calls[0]["id"]

            out2 = review_node(state)
            id2 = out2["messages"][0].tool_calls[0]["id"]

            self.assertNotEqual(id1, id2, "Fallback tool calls must have unique IDs")
            self.assertTrue(id1.startswith("fallback_"))

    def test_7_route_after_decision_unit(self):
        """7. route_after_decision unit tests (Section 10.7).

        True -> 'human_feedback', False/missing -> 'review'.
        """
        state_true: ReviewState = {"item": {}, "messages": [], "is_escalate": True}
        self.assertEqual(route_after_decision(state_true), "human_feedback")

        state_false: ReviewState = {"item": {}, "messages": [], "is_escalate": False}
        self.assertEqual(route_after_decision(state_false), "review")

        state_missing: ReviewState = {"item": {}, "messages": []}
        self.assertEqual(route_after_decision(state_missing), "review")

    def test_r1_sqlite_persists_across_graph_instances(self):
        """R1: Test that separate graph instances sharing an SQLite checkpointer resume thread."""
        try:
            from langgraph.checkpoint.sqlite import SqliteSaver
        except ImportError:
            self.skipTest("SqliteSaver not available in environment")

        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = os.path.join(tmpdir, "test_checkpoints.sqlite")

            def stub_decision(state: ReviewState) -> dict:
                if not state.get("human_feedback"):
                    return {
                        "is_escalate": True,
                        "groups": ["legal"],
                        "question_for_human": "Verify liability cap?",
                        "decision_rationale": "Requires legal verification.",
                        "messages": [],
                    }
                return {
                    "is_escalate": False,
                    "groups": [],
                    "decision_rationale": "Legal verified.",
                    "messages": [],
                }

            def stub_review(state: ReviewState) -> dict:
                return {
                    "messages": [
                        AIMessage(
                            content="Reviewing",
                            tool_calls=[
                                {
                                    "name": "submit_verdict",
                                    "args": {"verdict": "approve", "rationale": "Liability verified"},
                                    "id": "call_r1",
                                    "type": "tool_call",
                                }
                            ],
                        )
                    ]
                }

            config = {"configurable": {"thread_id": "thread-r1-persists"}}

            # --- Graph Instance 1: Initial Invoke (pauses at ask_human) ---
            conn1 = sqlite3.connect(db_path, check_same_thread=False)
            conn1.isolation_level = None
            saver1 = SqliteSaver(conn1)
            if hasattr(saver1, "setup"):
                saver1.setup()

            graph1 = _build_stubbed_graph(stub_decision, stub_review, checkpointer=saver1)
            graph1.invoke(
                {"item": {"id": "item-r1", "name": "Agreement"}, "messages": [], "escalation_count": 0},
                config,
            )

            # Explicitly close connection 1 and delete graph1 instance
            del graph1
            conn1.close()

            # --- Graph Instance 2: Separate instance opening same DB file ---
            conn2 = sqlite3.connect(db_path, check_same_thread=False)
            conn2.isolation_level = None
            saver2 = SqliteSaver(conn2)
            if hasattr(saver2, "setup"):
                saver2.setup()

            graph2 = _build_stubbed_graph(stub_decision, stub_review, checkpointer=saver2)

            # Verify instance 2 recovered paused state from SQLite before resuming
            saved_state = graph2.get_state(config)
            self.assertTrue(
                saved_state.next == ("human_feedback",) or len(saved_state.tasks) > 0,
                "State must be recovered by separate graph instance from SQLite",
            )

            # Resume on instance 2 with human feedback
            graph2.invoke(Command(resume="Liability cap confirmed at $1M"), config)

            # Verify resume state on instance 2
            resumed_state = graph2.get_state(config)
            self.assertEqual(
                resumed_state.values.get("human_feedback"),
                "Liability cap confirmed at $1M",
            )
            self.assertEqual(resumed_state.values.get("escalation_count"), 1)
            self.assertEqual(resumed_state.next, ("review_tools",))
            conn2.close()


if __name__ == "__main__":
    unittest.main()
