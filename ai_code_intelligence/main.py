"""
main.py
FastAPI application entry-point for AI Code Intelligence.
Endpoints:
  POST /api/analyze         — full blocking analysis (all 7 panels)
  POST /api/analyze/stream  — SSE streaming analysis (panels arrive as they complete)
  POST /api/chat            — contextual chat about analysed code
  GET  /health              — health check
"""
from __future__ import annotations

import json
from typing import Any, AsyncGenerator, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Form, Request, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
# pyrefly: ignore [missing-import]
from sse_starlette.sse import EventSourceResponse

from ast_parser import parse_python_ast, build_codebase_graph
from input_handler import extract_code
from orchestrator import analyze, analyze_stream
from llm_client import chat_with_code, generate_new_code

load_dotenv()

app = FastAPI(title="AI Code Intelligence", version="2.0.0")

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = [
    "http://localhost:5173",       # Vite dev server
    "http://localhost:3000",
    # "https://your-production-domain.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global HTTPException handler — always returns the standard JSON shape
# ---------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "language_detected": None,
            "files_analyzed": [],
            "files_skipped": [],
            "ast_summary": None,
            "outputs": {
                "explanation":  {"status": "error", "content": ""},
                "diagram":      {"status": "error", "content": ""},
                "api_docs":     {"status": "error", "content": ""},
                "refactor":     {"status": "error", "content": ""},
                "complexity":   {"status": "error", "content": ""},
                "optimise":     {"status": "error", "content": ""},
                "compliance":   {"status": "error", "content": ""},
                "security":     {"status": "error", "content": ""},
                "next_actions": {"status": "error", "content": ""},
            },
            "error": exc.detail,
        },
    )


# ---------------------------------------------------------------------------
# Helper: build the full response dict
# ---------------------------------------------------------------------------
def _build_response(
    result: dict,
    effective_language: str,
    files_analyzed: list[str],
    files_skipped: list[str],
    ast_summary: Any,
    extracted_code: str,
) -> dict:
    topology_graph = build_codebase_graph(extracted_code, files_analyzed, effective_language)
    return {
        "status":            result["status"],
        "language_detected": effective_language,
        "files_analyzed":    files_analyzed,
        "files_skipped":     files_skipped,
        "ast_summary":       ast_summary,
        "topology_graph":    topology_graph,
        "outputs":           result["outputs"],
        "code_context":      extracted_code[:8000],   # sent back for chat context
        "full_code":         extracted_code,          # full source for IntelliSense viewer
        "error":             None,
    }

# ---------------------------------------------------------------------------
# POST /api/analyze  (blocking — waits for all 7 panels)
# ---------------------------------------------------------------------------
@app.post("/api/analyze")
async def api_analyze(
    input_type:      str              = Form(...),
    code:            Optional[str]    = Form(None),
    language:        Optional[str]    = Form(None),
    spec_sheet:      Optional[str]    = Form(None),
    selected_panels: Optional[str]    = Form(None),   # JSON array e.g. '["explanation","security"]'
    file:            Optional[UploadFile] = File(None),
) -> JSONResponse:
    """
    Accepts multipart/form-data with:
      - input_type      : "paste" | "file" | "zip" | "github"
      - code            : raw source text (paste/github modes)
      - language        : optional language hint
      - selected_panels : JSON-encoded list of panel names to run (omit = run all)
      - file            : uploaded file/zip (file/zip mode)
    """
    # 1. Parse selected panels
    panels: Optional[list[str]] = None
    if selected_panels:
        try:
            panels = json.loads(selected_panels)
        except Exception:
            panels = None

    # 2. Extract / normalise code
    try:
        extracted_code, files_analyzed, files_skipped, detected_language = (
            await extract_code(input_type, code, file)
        )
    except HTTPException:
        raise
    except Exception as exc:
        return _error_response(str(exc))

    effective_language = language or detected_language

    # 3. AST parse (Python only)
    ast_summary: Any = None
    if effective_language == "python":
        ast_summary = parse_python_ast(extracted_code)

    # 4. Run selected LLM analysis tasks
    try:
        result = await analyze(extracted_code, effective_language, ast_summary, spec_sheet, panels)
    except Exception as exc:
        return _error_response(str(exc))

    # 5. Assemble response
    return JSONResponse(
        content=_build_response(
            result, effective_language, files_analyzed,
            files_skipped, ast_summary, extracted_code,
        )
    )


# ---------------------------------------------------------------------------
# POST /api/analyze/stream  (SSE — panels stream as each LLM call finishes)
# ---------------------------------------------------------------------------
@app.post("/api/analyze/stream")
async def api_analyze_stream(
    input_type:      str              = Form(...),
    code:            Optional[str]    = Form(None),
    language:        Optional[str]    = Form(None),
    spec_sheet:      Optional[str]    = Form(None),
    selected_panels: Optional[str]    = Form(None),   # JSON array e.g. '["explanation","security"]'
    file:            Optional[UploadFile] = File(None),
) -> EventSourceResponse:
    """
    Same as /api/analyze but uses Server-Sent Events.
    Each panel is sent as a separate SSE event as soon as its LLM call finishes.
    """
    # Parse selected panels
    panels: Optional[list[str]] = None
    if selected_panels:
        try:
            panels = json.loads(selected_panels)
        except Exception:
            panels = None

    try:
        extracted_code, files_analyzed, files_skipped, detected_language = (
            await extract_code(input_type, code, file)
        )
    except HTTPException as exc:
        async def _err_gen():
            yield {"event": "error", "data": json.dumps({"error": exc.detail})}
        return EventSourceResponse(_err_gen())
    except Exception as exc:
        async def _err_gen():
            yield {"event": "error", "data": json.dumps({"error": str(exc)})}
        return EventSourceResponse(_err_gen())

    effective_language = language or detected_language

    ast_summary: Any = None
    if effective_language == "python":
        ast_summary = parse_python_ast(extracted_code)

    topology_graph = build_codebase_graph(extracted_code, files_analyzed, effective_language)

    async def event_generator() -> AsyncGenerator[dict, None]:
        # Send metadata first so the frontend can render the header & graph immediately
        yield {
            "event": "meta",
            "data": json.dumps({
                "language_detected": effective_language,
                "files_analyzed":    files_analyzed,
                "files_skipped":     files_skipped,
                "ast_summary":       ast_summary,
                "topology_graph":    topology_graph,
                "code_context":      extracted_code[:8000],
                "full_code":         extracted_code,
            }),
        }

        outputs = {}
        async for panel_name, status, content in analyze_stream(
            extracted_code, effective_language, ast_summary, spec_sheet, panels
        ):
            outputs[panel_name] = {"status": status, "content": content}
            yield {
                "event": panel_name,
                "data":  json.dumps({"status": status, "content": content}),
            }

        # Final summary event
        any_error = any(v["status"] == "error" for v in outputs.values())
        yield {
            "event": "done",
            "data":  json.dumps({"status": "partial" if any_error else "success"}),
        }

    return EventSourceResponse(event_generator())


# ---------------------------------------------------------------------------
# POST /api/chat  — contextual code Q&A
# ---------------------------------------------------------------------------
@app.post("/api/chat")
async def api_chat(request: Request) -> JSONResponse:
    """
    Request body (JSON):
      {
        "code":     "<source code — the full extracted code>",
        "language": "python",
        "history":  [{"role": "user"|"model", "content": "..."}],
        "message":  "What does the helper function do?"
      }

    Response:
      {"status": "done"|"error", "reply": "..."}
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON.")

    code     = body.get("code", "")
    language = body.get("language", "unknown")
    history  = body.get("history", [])
    message  = body.get("message", "").strip()

    if not message:
        raise HTTPException(status_code=400, detail="'message' field is required.")

    status, reply = await chat_with_code(code, language, history, message)
    return JSONResponse(content={"status": status, "reply": reply})


# ---------------------------------------------------------------------------
# POST /api/generate — AI code & integration generator bot
# ---------------------------------------------------------------------------
@app.post("/api/generate")
async def api_generate(request: Request) -> JSONResponse:
    """
    Request body (JSON):
      {
        "code":     "<source code>",
        "language": "python",
        "history":  [{"role": "user"|"assistant", "content": "..."}],
        "prompt":   "Create a REST endpoint to connect to Stripe API"
      }

    Response:
      {"status": "done"|"error", "reply": "..."}
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON.")

    code     = body.get("code", "")
    language = body.get("language", "unknown")
    history  = body.get("history", [])
    prompt   = body.get("prompt", "").strip()

    if not prompt:
        raise HTTPException(status_code=400, detail="'prompt' field is required.")

    status, reply = await generate_new_code(code, language, history, prompt)
    return JSONResponse(content={"status": status, "reply": reply})


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------
@app.get("/health")
async def health() -> JSONResponse:
    import os
    has_gemini = bool(os.getenv("GOOGLE_API_KEY"))
    return JSONResponse(content={
        "status": "ok",
        "version": "2.0.0",
        "llm": "Google Gemini (gemini-1.5-flash)",
        "google_api_key_set": has_gemini,
        "features": [
            "explanation", "diagram", "api_docs", "refactor",
            "complexity", "optimise", "compliance", "security", "next_actions",
            "github_import", "chat", "sse_streaming", "export",
        ],
    })


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _error_response(message: str) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "status":            "error",
            "language_detected": None,
            "files_analyzed":    [],
            "files_skipped":     [],
            "ast_summary":       None,
            "outputs": {
                "explanation":  {"status": "error", "content": ""},
                "diagram":      {"status": "error", "content": ""},
                "api_docs":     {"status": "error", "content": ""},
                "refactor":     {"status": "error", "content": ""},
                "complexity":   {"status": "error", "content": ""},
                "optimise":     {"status": "error", "content": ""},
                "compliance":   {"status": "error", "content": ""},
                "security":     {"status": "error", "content": ""},
                "next_actions": {"status": "error", "content": ""},
            },
            "error": message,
        },
    )
