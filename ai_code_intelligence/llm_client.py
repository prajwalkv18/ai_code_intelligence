"""
llm_client.py
Async wrappers using the ultra-fast Groq API (OpenAI-compatible) for each analysis task and chat.
"""
from __future__ import annotations

import os
import sys
import asyncio
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
TIMEOUT_S = 30
MAX_RETRIES = 2


async def _call(system_prompt: str, code: str, max_tokens: int = 2048) -> tuple[str, str]:
    """Calls Groq API with system prompt and code prompt; returns (status, content)."""
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return "error", (
            "GROQ_API_KEY is not set in `.env`. "
            "Please get a free API key at https://console.groq.com/keys and add `GROQ_API_KEY=gsk_...` to your `.env` file."
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": code},
        ],
        "temperature": 0.2,
        "max_tokens": max_tokens,
    }

    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                response = await client.post(GROQ_API_URL, headers=headers, json=payload)
                
                if response.status_code == 401:
                    return "error", "Invalid GROQ_API_KEY. Please check your key at https://console.groq.com/keys"
                
                if response.status_code == 429:
                    if attempt < MAX_RETRIES:
                        await asyncio.sleep(2 * (attempt + 1))
                        continue
                    return "error", "Groq rate limit reached. Please wait a few seconds and try again."

                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return "done", content.strip()

        except httpx.TimeoutException:
            if attempt < MAX_RETRIES:
                await asyncio.sleep(1)
                continue
            return "error", f"Groq API timed out after {TIMEOUT_S}s."
        except Exception as exc:
            err_str = str(exc)
            print(f"[llm_client] Groq Error: {err_str}", file=sys.stderr)
            if attempt < MAX_RETRIES:
                await asyncio.sleep(1)
                continue
            return "error", f"Groq API error: {err_str}"

    return "error", "Failed to connect to Groq API. Please try again."


# ---------------------------------------------------------------------------
# Core analysis functions
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


async def get_optimise(code: str, language: str, ast_block: str) -> tuple[str, str]:
    system_prompt = (
        f"You are an algorithm optimisation expert. Analyse the following {language} code "
        "strictly for time and space complexity improvements. "
        "Produce a Markdown report with EXACTLY these four sections and no others:\n\n"
        "## Current Complexity\n"
        "A table with columns: Metric | Before | Notes — showing the current Time and Space "
        "Big-O of the original code.\n\n"
        "## Optimised Approach\n"
        "Name the better algorithm or data structure to use, and in 2–4 bullet points explain "
        "WHY it reduces time or space (e.g. replacing an O(n²) nested loop with a hash-map "
        "lookup for O(n)).\n\n"
        "## Optimised Code\n"
        "The fully rewritten code in a fenced code block. Keep the same language, same function "
        "signatures, and same observable behaviour — only change the algorithm internals.\n\n"
        "## Complexity After\n"
        "A table with columns: Metric | After | Improvement — comparing the new Big-O to the "
        "original and stating the gain (e.g. O(n²) → O(n)).\n\n"
        "Output only the Markdown. Do not include explanations outside the four sections. "
        f"{ast_block}"
    ).strip()
    return await _call(system_prompt, code)


async def get_complexity(code: str, language: str, ast_block: str) -> tuple[str, str]:
    system_prompt = (
        f"You are an algorithm complexity expert. Analyse the following {language} code and "
        "produce a Markdown report with exactly these sections:\n"
        "## Overall Complexity\n"
        "State the overall Time complexity and Space complexity in Big-O notation as a short table.\n"
        "## Per-Function Breakdown\n"
        "For each function or method, give its Time and Space complexity in a Markdown table with "
        "columns: Function | Time | Space | Notes.\n"
        "## Explanation\n"
        "In plain English, explain WHY the complexities are what they are — identify the loops, "
        "recursion, data structures, and algorithmic patterns that drive the complexity. "
        "Output only the Markdown report, no extra commentary. "
        f"{ast_block}"
    ).strip()
    return await _call(system_prompt, code)


async def get_unit_tests(code: str, language: str, ast_block: str) -> tuple[str, str]:
    """Generate a comprehensive unit test suite for the given code."""
    framework_map = {
        "python":     "pytest",
        "javascript": "Jest",
        "typescript": "Jest",
        "java":       "JUnit 5",
        "go":         "Go testing package (testing.T)",
        "ruby":       "RSpec",
        "csharp":     "xUnit",
        "cpp":        "Google Test (gtest)",
        "c":          "Unity test framework",
    }
    framework = framework_map.get(language, "an appropriate unit testing framework")
    system_prompt = (
        f"You are an expert software testing engineer. Given the following {language} code, "
        f"generate a comprehensive unit test suite using {framework}. "
        "Cover: happy-path tests, edge cases, error/exception cases, and boundary conditions. "
        "Use descriptive test names that explain what is being tested and the expected outcome. "
        "Include all necessary imports and setup code so the tests are immediately runnable. "
        "Output ONLY a valid Markdown document with exactly these two sections:\n\n"
        "## Unit Tests\n"
        "A brief bullet list of what scenarios are covered.\n\n"
        "## Test Suite\n"
        f"A single fenced code block containing the complete, runnable {language} test file. "
        "Do not include any text outside these two sections. "
        f"{ast_block}"
    ).strip()
    return await _call(system_prompt, code)


async def get_compliance(code: str, language: str, ast_block: str, spec_sheet: Optional[str]) -> tuple[str, str]:
    if not spec_sheet:
        return "done", "No spec sheet or requirements provided for compliance check."
        
    system_prompt = (
        f"You are a strict compliance and code review auditor. Given the following {language} code and a "
        "User Spec Sheet / Requirements document, analyze the code against the spec sheet. "
        "Produce a Markdown report with exactly these sections:\n\n"
        "## Compliance Status\n"
        "A brief summary (e.g., 'Fully Compliant', 'Partially Compliant', 'Non-Compliant').\n\n"
        "## What is Complete\n"
        "A bulleted list of requirements from the spec sheet that are successfully implemented.\n\n"
        "## What is Non-Compliant / Missing\n"
        "A bulleted list of requirements that are missing, incomplete, or violate the spec sheet.\n\n"
        f"User Spec Sheet:\n{spec_sheet}\n\n"
        f"Output ONLY the Markdown report. {ast_block}"
    ).strip()
    return await _call(system_prompt, code)


async def get_security(code: str, language: str, ast_block: str) -> tuple[str, str]:
    system_prompt = (
        f"You are an expert security auditor. Given the following {language} code, perform a simple "
        "security vulnerability test. Identify common flaws such as injection vulnerabilities, hardcoded "
        "secrets, improper error handling, XSS, CSRF, etc.\n\n"
        "Produce a Markdown report with exactly these sections:\n\n"
        "## Security Overview\n"
        "A brief summary of the code's security posture.\n\n"
        "## Vulnerabilities Found\n"
        "A bulleted list of potential vulnerabilities. If none are found, state 'No obvious vulnerabilities detected.'\n\n"
        "## Recommendations\n"
        "Actionable steps to fix the identified issues.\n\n"
        f"Output ONLY the Markdown report. {ast_block}"
    ).strip()
    return await _call(system_prompt, code)


async def get_next_actions(code: str, language: str, ast_block: str, spec_sheet: Optional[str]) -> tuple[str, str]:
    system_prompt = (
        f"You are an agile technical project manager. Given the following {language} code "
        f"{'and the provided Spec Sheet ' if spec_sheet else ''}suggest the immediate next actions "
        "for the development team.\n\n"
        "Produce a Markdown report with exactly these sections:\n\n"
        "## Immediate Next Steps\n"
        "A bulleted checklist (using `[ ]`) of high-priority tasks to complete next.\n\n"
        "## Technical Debt & Maintenance\n"
        "A bulleted checklist of cleanups or minor refactors that should be addressed soon.\n\n"
        f"{'Spec Sheet Context: ' + spec_sheet + str(chr(10)) if spec_sheet else ''}"
        f"Output ONLY the Markdown report. {ast_block}"
    ).strip()
    return await _call(system_prompt, code)


# ---------------------------------------------------------------------------
# Chat function
# ---------------------------------------------------------------------------

async def chat_with_code(
    code: str,
    language: str,
    history: list[dict],
    user_message: str,
) -> tuple[str, str]:
    """
    Contextual chat about the analysed code using multi-turn conversation.
    history: list of {"role": "user"|"model"|"assistant", "content": str} dicts
    """
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return "error", "GROQ_API_KEY is not set."

    system_prompt = (
        f"You are an expert code assistant and developer. The user has submitted the following {language} codebase.\n"
        "RULES FOR RESPONSE:\n"
        "1. Whenever asked to write, refactor, implement, create, or fix code, ALWAYS PROVIDE THE FULL RUNNABLE CODE IN FENCED MARKDOWN CODE BLOCKS FIRST.\n"
        "2. Do NOT just explain or summarize in text without including the actual code implementation.\n"
        "3. Keep text preambles minimal — put code front and center.\n\n"
        f"```{language}\n{code[:8000]}\n```"
    )

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        role = "assistant" if msg.get("role") in ("model", "assistant") else "user"
        messages.append({"role": role, "content": msg.get("content", "")})
    messages.append({"role": "user", "content": user_message})

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 2048,
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
            response = await client.post(GROQ_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return "done", data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        return "error", f"Chat error: {exc}"


async def generate_new_code(
    code: str,
    language: str,
    history: list[dict],
    user_prompt: str,
) -> tuple[str, str]:
    """
    Generate new code, integrations, microservices, or feature modules based on the analyzed codebase.
    """
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return "error", "GROQ_API_KEY is not set."

    system_prompt = (
        f"You are a Senior Principal Software Architect and Lead Code Generator.\n"
        f"Your ONLY job is to write complete, production-ready, runnable NEW CODE and integration files based on the user's request and the provided {language} codebase.\n\n"
        "CRITICAL RULES:\n"
        "1. YOU MUST START YOUR RESPONSE IMMEDIATELY WITH THE COMPLETE RUNNABLE CODE IN A FENCED CODE BLOCK (e.g. ```" + (language or "python") + ").\n"
        "2. DO NOT START WITH A TEXT OVERVIEW, GENERIC EXPLANATION, OR SUMMARY TABLE.\n"
        "3. Write full, syntactically valid, production-grade code with error handling, type annotations, imports, and docstrings.\n"
        "4. AFTER the code block, you may provide 2-3 short bullet points explaining where to save the file and how to integrate it.\n\n"
        f"--- EXISTING CODEBASE CONTEXT ({language}) ---\n"
        f"```{language}\n{code[:8000]}\n```"
    )

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        role = "assistant" if msg.get("role") in ("model", "assistant") else "user"
        messages.append({"role": role, "content": msg.get("content", "")})
    messages.append({"role": "user", "content": user_prompt})

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 3072,
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
            response = await client.post(GROQ_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return "done", data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        return "error", f"Code generation error: {exc}"

