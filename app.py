"""Two-stage review CLI application (Start & Resume).

This script implements the invocation contract specified in Section 8 & Section 15 of IMPLEMENTATION_PLAN.md.

Human-in-the-loop (HITL) checkpoints:
1. Asking human tool (Dynamic Interrupt):
   The graph pauses at the `human_feedback` node via `interrupt()`.
   The CLI outputs the interrupt payload JSON to stdout and exits with code 0.
   Resume in a new or current process with:
       python app.py --thread <thread_id> --resume "<feedback text>"
   Resume values are accepted as strings or JSON dictionaries {"feedback": "..."}.

2. Checking Approve/Reject tool (Static Interrupt Before):
   The graph pauses before executing `review_tools` due to `interrupt_before=["review_tools"]`.
   The CLI displays the pending tool call arguments (verdict and rationale).
   - To confirm as-is: run with:
       python app.py --thread <thread_id> --resume confirm
     (invokes `graph.invoke(None, config)`).
   - To override the verdict (Note on G9):
       python app.py --thread <thread_id> --override-verdict <approve|reject> [--override-rationale "<text>"]
     This calls:
       graph.update_state(
           config,
           {"messages": [AIMessage(content="", tool_calls=[{
               "id": "<existing id>",
               "name": "submit_verdict",
               "args": {"verdict": "<override>", "rationale": "<rationale>"},
               "type": "tool_call",
           }])]},
           as_node="review",
       )
     Note: Because `messages` uses `add_messages`, this appends the overridden AIMessage to the trace.
     The subsequent ToolNode executes the latest pending tool call. Do NOT pass Command(resume=)
     on this path; invoke with `graph.invoke(None, config)`.

Process Persistence (G2):
   CLI invocations across separate processes persist their thread states using an on-disk
   SQLite database (`.checkpoints.sqlite`). If SQLite checkpointer cannot be loaded, the CLI
   exits with an explicit error unless `--ephemeral` is specified.
"""

import argparse
import json
import os
import sys
from typing import Any

from langchain_core.messages import AIMessage
from langgraph.types import Command

from graph.builder import build_graph

DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), ".checkpoints.sqlite"
)

DEMO_ITEM = {
    "id": "item-demo-001",
    "title": "Vendor Data Sharing Agreement",
    "body": "Third-party vendor seeks access to user telemetry logs for debugging integration.",
    "risk_hints": ["data-privacy", "external-sharing", "telemetry"],
}


def get_checkpointer(ephemeral: bool = False, db_path: str = DEFAULT_DB_PATH):
    """Returns a persistent on-disk checkpointer by default, or MemorySaver if --ephemeral is set."""
    if ephemeral:
        from langgraph.checkpoint.memory import MemorySaver

        print("[Checkpointer] Running with in-memory checkpointer (--ephemeral).")
        return MemorySaver()

    try:
        import sqlite3
        from langgraph.checkpoint.sqlite import SqliteSaver

        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.isolation_level = None
        saver = SqliteSaver(conn)
        if hasattr(saver, "setup"):
            saver.setup()
        print(f"[Checkpointer] Using persistent SQLite database at: {db_path}")
        return saver
    except ImportError as e:
        print(
            f"\n[ERROR] Failed to import SqliteSaver from langgraph.checkpoint.sqlite: {e}\n"
            "A persistent on-disk checkpointer is required for CLI session persistence.\n"
            "Please ensure `langgraph-checkpoint-sqlite` is installed, or pass `--ephemeral`.\n",
            file=sys.stderr,
        )
        sys.exit(1)
    except Exception as e:
        print(
            f"\n[ERROR] Failed to initialize SQLite checkpointer at '{db_path}': {e}\n",
            file=sys.stderr,
        )
        sys.exit(1)


def inspect_and_report_state(graph, config: dict) -> None:
    """Inspects the current state of the graph and formats user-facing output."""
    snapshot = graph.get_state(config)

    # 1. Check if execution has completed (END reached)
    if not snapshot.next:
        verdict = snapshot.values.get("verdict", "unknown")
        rationale = snapshot.values.get("verdict_rationale", "No rationale provided.")
        print("\n=== Review Finished ===")
        print(f"Final Verdict: {verdict.upper()}")
        print(f"Rationale:     {rationale}")
        print(f"Escalations:   {snapshot.values.get('escalation_count', 0)}")
        return

    # 2. Check for dynamic interrupt (ask_human inside human_feedback)
    if snapshot.tasks:
        for task in snapshot.tasks:
            if getattr(task, "interrupts", None):
                for intr in task.interrupts:
                    payload = intr.value
                    print("\n=== Graph Paused: Human Feedback Required ===")
                    print(json.dumps(payload, indent=2))
                    print("\nTo resume with feedback, run:")
                    print(
                        f"  python app.py --thread {config['configurable']['thread_id']} --resume \"<your feedback>\""
                    )
                    return

    # 3. Check for interrupt_before (before review_tools)
    if "review_tools" in snapshot.next:
        messages = snapshot.values.get("messages", [])
        pending_tool_call = None
        for msg in reversed(messages):
            if getattr(msg, "tool_calls", None):
                pending_tool_call = msg.tool_calls[0]
                break

        print("\n=== Graph Paused: Checking Approve/Reject Tool (HITL) ===")
        print("Pending tool call:")
        if pending_tool_call:
            print(f"  Tool: {pending_tool_call.get('name')}")
            print(f"  Args: {json.dumps(pending_tool_call.get('args'), indent=4)}")
        else:
            print("  No tool calls found on last AI message.")

        print("\nOptions:")
        print(
            f"  1. Confirm as-is:    python app.py --thread {config['configurable']['thread_id']} --resume confirm"
        )
        print(
            f"  2. Override verdict:  python app.py --thread {config['configurable']['thread_id']} --override-verdict reject --override-rationale \"Manual rejection\""
        )
        return

    # 4. Other pause state
    print(f"\n=== Graph Paused at: {snapshot.next} ===")


def main():
    parser = argparse.ArgumentParser(
        description="Two-stage review CLI (Start & Resume) matching MLAI.jpg"
    )
    parser.add_argument(
        "--thread",
        type=str,
        default="review-001",
        help="Thread ID for the review session (default: review-001)",
    )
    parser.add_argument(
        "--item-json",
        type=str,
        default=None,
        help="JSON string or file path for the item to review (starts new session)",
    )
    parser.add_argument(
        "--resume",
        type=str,
        default=None,
        help="Human feedback string or confirmation to resume a paused review",
    )
    parser.add_argument(
        "--override-verdict",
        choices=["approve", "reject"],
        default=None,
        help="Override pending verdict at review_tools confirmation checkpoint",
    )
    parser.add_argument(
        "--override-rationale",
        type=str,
        default="Overridden by human reviewer.",
        help="Rationale when overriding verdict",
    )
    parser.add_argument(
        "--db-path",
        type=str,
        default=DEFAULT_DB_PATH,
        help=f"Path to SQLite checkpointer database (default: {DEFAULT_DB_PATH})",
    )
    parser.add_argument(
        "--ephemeral",
        action="store_true",
        help="Use in-memory MemorySaver instead of SQLite database (does not survive process exit)",
    )

    args = parser.parse_args()

    checkpointer = get_checkpointer(ephemeral=args.ephemeral, db_path=args.db_path)
    graph = build_graph(checkpointer=checkpointer)
    config = {"configurable": {"thread_id": args.thread}}

    # Handle Override of pending review_tools (G9)
    if args.override_verdict:
        snapshot = graph.get_state(config)
        if "review_tools" not in snapshot.next:
            print(
                f"Error: Thread '{args.thread}' is at state {snapshot.next}, not waiting at review_tools."
            )
            sys.exit(1)

        # Locate existing tool call ID if present
        messages = snapshot.values.get("messages", [])
        tool_call_id = "call_override"
        for msg in reversed(messages):
            if getattr(msg, "tool_calls", None):
                tool_call_id = msg.tool_calls[0].get("id", tool_call_id)
                break

        print(f"Overriding verdict to '{args.override_verdict}'...")
        graph.update_state(
            config,
            {
                "messages": [
                    AIMessage(
                        content="",
                        tool_calls=[
                            {
                                "id": tool_call_id,
                                "name": "submit_verdict",
                                "args": {
                                    "verdict": args.override_verdict,
                                    "rationale": args.override_rationale,
                                },
                                "type": "tool_call",
                            }
                        ],
                    )
                ]
            },
            as_node="review",
        )
        # Continue execution without Command(resume=)
        graph.invoke(None, config)
        inspect_and_report_state(graph, config)
        return

    # Handle Resume
    if args.resume is not None:
        snapshot = graph.get_state(config)
        if not snapshot.next and not snapshot.tasks:
            print(f"Thread '{args.thread}' is already finished or does not exist.")
            sys.exit(1)

        # If paused at review_tools via interrupt_before, continue with invoke(None, config)
        if "review_tools" in snapshot.next:
            print(f"Resuming and confirming review_tools for thread '{args.thread}'...")
            graph.invoke(None, config)
        else:
            # Resuming ask_human dynamic interrupt: supports string or JSON feedback dict
            feedback_val: Any = args.resume
            try:
                parsed = json.loads(args.resume)
                if isinstance(parsed, dict) and "feedback" in parsed:
                    feedback_val = parsed
            except Exception:
                pass

            print(f"Resuming with feedback for thread '{args.thread}'...")
            graph.invoke(Command(resume=feedback_val), config)

        inspect_and_report_state(graph, config)
        return

    # Handle Start
    if args.item_json:
        if os.path.isfile(args.item_json):
            with open(args.item_json, "r") as f:
                item_data = json.load(f)
        else:
            item_data = json.loads(args.item_json)
    else:
        print("No --item-json provided. Using default demo item.")
        item_data = DEMO_ITEM

    initial_state = {
        "item": item_data,
        "messages": [],
        "escalation_count": 0,
    }

    print(f"Starting review session for thread '{args.thread}'...")
    print(f"Item: {json.dumps(item_data, indent=2)}")

    graph.invoke(initial_state, config)
    inspect_and_report_state(graph, config)


if __name__ == "__main__":
    main()
