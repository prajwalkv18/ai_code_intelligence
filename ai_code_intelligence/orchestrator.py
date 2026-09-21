"""
orchestrator.py
Runs LLM analysis tasks concurrently and assembles the response dict.
"""
from __future__ import annotations

import asyncio
from typing import Optional

from ast_parser import format_ast_summary
from llm_client import (
    get_api_docs,
    get_complexity,
    get_diagram,
    get_explanation,
    get_optimise,
    get_refactor,
    get_compliance,
    get_security,
    get_next_actions,
)

# Reduced concurrency to 2 to avoid Groq rate-limit (429) errors on the free tier.
# With 2 in-flight calls at once the service stays well within token-per-minute limits.
_groq_sem = asyncio.Semaphore(2)

async def _throttled(coro):
    async with _groq_sem:
        return await coro


# All panels that can be requested. Key = panel name, value = LLM function factory.
def _build_task_map(code, language, ast_block, spec_sheet):
    return {
        "explanation":  lambda: get_explanation(code, language, ast_block),
        "diagram":      lambda: get_diagram(code, language, ast_block),
        "api_docs":     lambda: get_api_docs(code, language, ast_block),
        "refactor":     lambda: get_refactor(code, language, ast_block),
        "complexity":   lambda: get_complexity(code, language, ast_block),
        "optimise":     lambda: get_optimise(code, language, ast_block),
        "compliance":   lambda: get_compliance(code, language, ast_block, spec_sheet),
        "security":     lambda: get_security(code, language, ast_block),
        "next_actions": lambda: get_next_actions(code, language, ast_block, spec_sheet),
    }

ALL_PANELS = [
    "explanation", "diagram", "api_docs", "refactor",
    "complexity",  "optimise", "compliance", "security", "next_actions",
]

_SKIPPED = {"status": "skipped", "content": ""}


async def analyze(
    code:            str,
    language:        str,
    ast_summary:     Optional[dict],
    spec_sheet:      Optional[str] = None,
    selected_panels: Optional[list[str]] = None,
) -> dict:
    """
    Runs selected analysis tasks concurrently via asyncio.gather.
    Panels not in selected_panels are skipped instantly (no LLM call).
    """
    ast_block = format_ast_summary(ast_summary)
    task_map  = _build_task_map(code, language, ast_block, spec_sheet)
    active    = set(selected_panels) if selected_panels else set(ALL_PANELS)

    coros = {name: _throttled(fn()) for name, fn in task_map.items() if name in active}

    results = await asyncio.gather(*coros.values())
    result_map = dict(zip(coros.keys(), results))

    outputs = {}
    for name in ALL_PANELS:
        if name in result_map:
            status, content = result_map[name]
            outputs[name] = {"status": status, "content": content}
        else:
            outputs[name] = _SKIPPED

    any_error = any(v["status"] == "error" for v in outputs.values())
    return {"status": "partial" if any_error else "success", "outputs": outputs}


async def analyze_stream(
    code:            str,
    language:        str,
    ast_summary:     Optional[dict],
    spec_sheet:      Optional[str] = None,
    selected_panels: Optional[list[str]] = None,
):
    """
    Generator that yields (panel_name, status, content) tuples as each LLM task completes.
    Panels not selected are yielded immediately as 'skipped'.
    """
    ast_block = format_ast_summary(ast_summary)
    task_map  = _build_task_map(code, language, ast_block, spec_sheet)
    active    = set(selected_panels) if selected_panels else set(ALL_PANELS)

    # Yield skipped panels immediately so frontend knows to ignore them
    for name in ALL_PANELS:
        if name not in active:
            yield name, "skipped", ""

    tasks = {
        name: asyncio.create_task(_throttled(fn()))
        for name, fn in task_map.items()
        if name in active
    }

    pending = dict(tasks)
    while pending:
        done, _ = await asyncio.wait(
            list(pending.values()), return_when=asyncio.FIRST_COMPLETED
        )
        for task in done:
            name = next(k for k, v in pending.items() if v is task)
            status, content = task.result()
            yield name, status, content
            del pending[name]

