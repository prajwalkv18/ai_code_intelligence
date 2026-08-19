"""
orchestrator.py
Runs all four LLM analysis tasks concurrently and assembles the response dict.
"""
from __future__ import annotations

import asyncio
from typing import Optional

from ast_parser import format_ast_summary
from llm_client import get_api_docs, get_diagram, get_explanation, get_refactor


async def analyze(
    code:        str,
    language:    str,
    ast_summary: Optional[dict],
) -> dict:
    """
    Runs explanation, diagram, api_docs, and refactor concurrently.

    Returns the 'outputs' sub-dict and the top-level 'status':
        {
            "status": "success" | "partial",
            "outputs": {
                "explanation": {"status": "done"|"error", "content": "..."},
                "diagram":     {"status": "done"|"error", "content": "..."},
                "api_docs":    {"status": "done"|"error", "content": "..."},
                "refactor":    {"status": "done"|"error", "content": "..."},
            }
        }
    """
    ast_block = format_ast_summary(ast_summary)

    (
        (exp_status, exp_content),
        (dia_status, dia_content),
        (doc_status, doc_content),
        (ref_status, ref_content),
    ) = await asyncio.gather(
        get_explanation(code, language, ast_block),
        get_diagram(code, language, ast_block),
        get_api_docs(code, language, ast_block),
        get_refactor(code, language, ast_block),
    )

    outputs = {
        "explanation": {"status": exp_status, "content": exp_content},
        "diagram":     {"status": dia_status, "content": dia_content},
        "api_docs":    {"status": doc_status, "content": doc_content},
        "refactor":    {"status": ref_status, "content": ref_content},
    }

    any_error = any(v["status"] == "error" for v in outputs.values())
    status    = "partial" if any_error else "success"

    return {"status": status, "outputs": outputs}
