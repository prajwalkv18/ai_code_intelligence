"""
orchestrator.py
Runs six LLM analysis tasks concurrently and assembles the response dict.
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
)

# Limit concurrent Groq API calls to avoid 429 rate-limit errors on the free tier.
# 3 concurrent calls is a safe default; each finishes in ~1-2s so total wall time is ~4-6s.
_groq_sem = asyncio.Semaphore(3)

async def _throttled(coro):
    async with _groq_sem:
        return await coro


async def analyze(
    code:        str,
    language:    str,
    ast_summary: Optional[dict],
) -> dict:
    """
    Runs six analysis tasks concurrently via asyncio.gather.

    Returns:
        {
            "status": "success" | "partial",
            "outputs": {
                "explanation": {"status": "done"|"error", "content": "..."},
                "diagram":     {"status": "done"|"error", "content": "..."},
                "api_docs":    {"status": "done"|"error", "content": "..."},
                "refactor":    {"status": "done"|"error", "content": "..."},
                "complexity":  {"status": "done"|"error", "content": "..."},
                "optimise":    {"status": "done"|"error", "content": "..."},
            }
        }
    """
    ast_block = format_ast_summary(ast_summary)

    (
        (exp_status, exp_content),
        (dia_status, dia_content),
        (doc_status, doc_content),
        (ref_status, ref_content),
        (cmp_status, cmp_content),
        (opt_status, opt_content),
    ) = await asyncio.gather(
        _throttled(get_explanation(code, language, ast_block)),
        _throttled(get_diagram(code, language, ast_block)),
        _throttled(get_api_docs(code, language, ast_block)),
        _throttled(get_refactor(code, language, ast_block)),
        _throttled(get_complexity(code, language, ast_block)),
        _throttled(get_optimise(code, language, ast_block)),
    )

    outputs = {
        "explanation": {"status": exp_status, "content": exp_content},
        "diagram":     {"status": dia_status, "content": dia_content},
        "api_docs":    {"status": doc_status, "content": doc_content},
        "refactor":    {"status": ref_status, "content": ref_content},
        "complexity":  {"status": cmp_status, "content": cmp_content},
        "optimise":    {"status": opt_status, "content": opt_content},
    }

    any_error = any(v["status"] == "error" for v in outputs.values())
    status    = "partial" if any_error else "success"

    return {"status": status, "outputs": outputs}


async def analyze_stream(
    code:        str,
    language:    str,
    ast_summary: Optional[dict],
):
    """
    Generator that yields (panel_name, status, content) tuples one by one
    as each concurrent LLM task completes. Used by the SSE endpoint.
    """
    ast_block = format_ast_summary(ast_summary)

    tasks = {
        "explanation": asyncio.create_task(_throttled(get_explanation(code, language, ast_block))),
        "diagram":     asyncio.create_task(_throttled(get_diagram(code, language, ast_block))),
        "api_docs":    asyncio.create_task(_throttled(get_api_docs(code, language, ast_block))),
        "refactor":    asyncio.create_task(_throttled(get_refactor(code, language, ast_block))),
        "complexity":  asyncio.create_task(_throttled(get_complexity(code, language, ast_block))),
        "optimise":    asyncio.create_task(_throttled(get_optimise(code, language, ast_block))),
    }

    pending = dict(tasks)
    while pending:
        done, _ = await asyncio.wait(
            list(pending.values()), return_when=asyncio.FIRST_COMPLETED
        )
        for task in done:
            # find the name for this task
            name = next(k for k, v in pending.items() if v is task)
            status, content = task.result()
            yield name, status, content
            del pending[name]
