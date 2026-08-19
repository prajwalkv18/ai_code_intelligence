"""
llm_client.py
Async wrappers around the HuggingFace Granite model for each analysis task.
"""
from __future__ import annotations

import os
from typing import Optional

from dotenv import load_dotenv
from huggingface_hub import AsyncInferenceClient

load_dotenv()

MODEL_ID   = "ibm-granite/granite-3.1-8b-instruct"
MAX_TOKENS = 1024

_client: Optional[AsyncInferenceClient] = None


def _get_client() -> AsyncInferenceClient:
    global _client
    if _client is None:
        token = os.getenv("HF_API_TOKEN")
        _client = AsyncInferenceClient(model=MODEL_ID, token=token)
    return _client


async def _call(system_prompt: str, code: str) -> tuple[str, str]:
    """Low-level call; returns (status, content)."""
    try:
        client = _get_client()
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": code},
        ]
        response = await client.chat_completion(
            messages=messages,
            max_tokens=MAX_TOKENS,
        )
        content = response.choices[0].message.content or ""
        return "done", content.strip()
    except Exception as exc:
        return "error", str(exc)


# ---------------------------------------------------------------------------
# Four public analysis functions
# ---------------------------------------------------------------------------

async def get_explanation(code: str, language: str, ast_block: str) -> tuple[str, str]:
    system_prompt = (
        f"You are a code analysis assistant. Given the following {language} code, "
        "write a plain-language explanation of what it does, its main components, "
        "and its purpose. Be concise and structured. Do not output code. "
        f"{ast_block}"
    ).strip()
    return await _call(system_prompt, code)


async def get_diagram(code: str, language: str, ast_block: str) -> tuple[str, str]:
    system_prompt = (
        f"You are a software architecture assistant. Given the following {language} code, "
        "produce ONLY a valid Mermaid.js diagram (graph TD syntax) showing the architecture "
        "or flow. Output only the raw Mermaid syntax with no explanation, no markdown fences, "
        f"and no extra text. {ast_block}"
    ).strip()
    return await _call(system_prompt, code)


async def get_api_docs(code: str, language: str, ast_block: str) -> tuple[str, str]:
    system_prompt = (
        f"You are a technical documentation assistant. Given the following {language} code, "
        "generate API documentation in Markdown format. Include all public functions, classes, "
        "and endpoints. Use standard Markdown headers and code blocks. Output only the "
        f"Markdown. {ast_block}"
    ).strip()
    return await _call(system_prompt, code)


async def get_refactor(code: str, language: str, ast_block: str) -> tuple[str, str]:
    system_prompt = (
        f"You are a code review assistant. Given the following {language} code, first list all "
        "bugs, security vulnerabilities, and performance issues you find (use a Markdown list "
        "under a '## Issues Found' heading). Then provide a fully corrected and improved "
        "version of the code under a '## Corrected Code' heading. Output only Markdown. "
        f"{ast_block}"
    ).strip()
    return await _call(system_prompt, code)
