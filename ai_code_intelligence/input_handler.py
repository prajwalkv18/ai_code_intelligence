"""
input_handler.py
Extracts and normalises code from paste, single-file upload, zip archive,
or a GitHub repository URL.
"""
from __future__ import annotations

import io
import logging
import os
import re
import zipfile
from collections import Counter
from typing import Optional

import httpx
from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
ALLOWED_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".java", ".go", ".rb", ".cs", ".cpp", ".c", ".h", ".hpp",
    ".rs", ".kt", ".swift", ".sh", ".bash", ".sql",
    ".html", ".css", ".json", ".yaml", ".yml", ".md",
}

EXT_TO_LANGUAGE: dict[str, str] = {
    ".py": "python", ".js": "javascript", ".jsx": "javascript",
    ".ts": "typescript", ".tsx": "typescript", ".mjs": "javascript", ".cjs": "javascript",
    ".java": "java", ".go": "go", ".rb": "ruby", ".cs": "csharp",
    ".cpp": "cpp", ".c": "c", ".h": "c", ".hpp": "cpp",
    ".rs": "rust", ".kt": "kotlin", ".swift": "swift",
    ".sh": "bash", ".bash": "bash", ".sql": "sql",
    ".html": "html", ".css": "css", ".json": "json",
    ".yaml": "yaml", ".yml": "yaml", ".md": "markdown",
}

MAX_UPLOAD_BYTES = 10 * 1024 * 1024          # 10 MB raw upload guard
TOKEN_CAP        = 80_000                     # approximate token cap
CHAR_CAP         = TOKEN_CAP * 4              # ~320 000 chars

# GitHub API limits
GITHUB_MAX_FILES = 200                        # max files to fetch from a repo
GITHUB_API_BASE  = "https://api.github.com"
GITHUB_RAW_BASE  = "https://raw.githubusercontent.com"


def _detect_language(ext_counts: Counter) -> str:
    """Return the language name for the most common extension."""
    for ext, _ in ext_counts.most_common():
        if ext in EXT_TO_LANGUAGE:
            return EXT_TO_LANGUAGE[ext]
    return "unknown"


def _detect_language_from_code(code: str) -> str:
    """Heuristic language detection from pasted source code.

    Each entry is (language, [patterns]).  A language is chosen when ANY of
    its patterns matches.  Entries are ordered so that more-specific signatures
    come before ambiguous ones (e.g. Java before Python, Go before Python).
    """
    signatures: list[tuple[str, list[str]]] = [
        # ── strongly-typed / distinctive keywords first ──────────────────────
        # Java: must match java-specific imports or JVM idioms
        ("java",       [r"^\s*import\s+java\.", r"\bpublic\s+static\s+void\s+main\b",
                        r"\bSystem\.out\.", r"\bSystem\.in\b"]),
        # C#: namespace or using System are unambiguous
        ("csharp",     [r"\busing\s+System\b", r"\bnamespace\s+\w+",
                        r"\bConsole\.(Write|Read)\b"]),
        ("cpp",        [r"#include\s*<[a-z_]+>", r"\bstd::", r"\bcout\b"]),
        ("c",          [r"#include\s*<[a-z_]+\.h>", r"\bprintf\s*\(",
                        r"\bmalloc\s*\(", r"int\s+main\s*\(\s*(void|int)"]),
        ("go",         [r"^package\s+\w+", r"^\s*import\s+\(",
                        r"\bfunc\s+\w+\s*\("]),
        ("typescript", [r":\s*(string|number|boolean|any|void)\b",
                        r"\binterface\s+\w+", r"^\s*import\s+.+\s+from\s+['\"]"]),
        ("javascript", [r"\bconsole\.log\(", r"=>\s*{",
                        r"\brequire\s*\(", r"^\s*import\s+.+\s+from\s+['\"]"]),
        # Ruby: `end` keyword is unambiguous; def alone is not
        ("ruby",       [r"\bputs\b", r"^\s*def\s+\w+.*\n[\s\S]*?\bend\b"]),
        # Python: colon-terminated def/class, or from…import
        ("python",     [r"^\s*def\s+\w+\s*\(.*\):", r"^\s*class\s+\w+.*:",
                        r"^\s*from\s+\w+\s+import\s+", r"print\(",
                        r"^\s*import\s+[a-z_]+\s*$"]),
        # ── markup / data formats ─────────────────────────────────────────────
        ("html",       [r"<!DOCTYPE\s+html", r"<html[\s>]", r"<body[\s>]"]),
        ("css",        [r"@media\b", r"@import\b",
                        r"[a-z-]+\s*:\s*[^;{]+;"]),
        ("json",       [r"^\s*\{[\s\S]*\"[^\"]+\"\s*:", r"^\s*\["]),
        ("yaml",       [r"^---", r"^\w[\w ]*:\s+\S"]),
        ("markdown",   [r"^#{1,6} ", r"^\*\*\S", r"^\s*- \S"]),
    ]

    for language, patterns in signatures:
        for pattern in patterns:
            if re.search(pattern, code, re.MULTILINE):
                return language

    return "unknown"


def _suffix(filename: str) -> str:
    dot = filename.rfind(".")
    return filename[dot:].lower() if dot != -1 else ""


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
async def extract_code(
    input_type: str,
    code:        Optional[str],
    file:        Optional[UploadFile],
) -> tuple[str, list[str], list[str], str]:
    """
    Returns (concatenated_code, files_analyzed, files_skipped, language).
    Raises HTTPException on validation failures.
    """
    if input_type == "paste":
        if not code:
            raise HTTPException(status_code=400, detail="No code provided for paste input.")
        return code, ["pasted_code"], [], _detect_language_from_code(code)

    if input_type == "github":
        # code field is re-used to carry the GitHub URL
        if not code:
            raise HTTPException(status_code=400, detail="No GitHub URL provided.")
        return await _handle_github_url(code.strip())

    if input_type in ("file", "zip"):
        if file is None:
            raise HTTPException(status_code=400, detail="No file uploaded.")

        raw = await file.read()
        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Upload exceeds 10 MB limit.")

        if input_type == "file":
            return _handle_single_file(file.filename or "uploaded_file", raw)

        # zip
        return _handle_zip(raw)

    raise HTTPException(status_code=400, detail=f"Unknown input_type: {input_type!r}")


# ---------------------------------------------------------------------------
# GitHub URL helper
# ---------------------------------------------------------------------------
async def _handle_github_url(url: str) -> tuple[str, list[str], list[str], str]:
    """
    Fetch source files from a public (or token-authenticated) GitHub repository.

    Accepted URL formats:
      - https://github.com/owner/repo
      - https://github.com/owner/repo/tree/branch
      - https://github.com/owner/repo/tree/branch/subdir
    """
    # --- Parse URL ---
    url = url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="No GitHub URL provided.")

    if url.startswith("git@github.com:"):
        url = "https://github.com/" + url[len("git@github.com:"):]

    pattern = r"github\.com/([^/]+)/([^/]+?)(?:\.git)?(?:/(?:tree|blob)/([^/]+)(?:/(.+))?)?/?$"
    m = re.search(pattern, url)
    if not m:
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub URL. Expected format: https://github.com/owner/repo or https://github.com/owner/repo/tree/branch"
        )
    owner = m.group(1)
    repo = m.group(2).removesuffix(".git").rstrip("/")
    branch = m.group(3) or "HEAD"
    subdir = (m.group(4) or "").rstrip("/")

    # Build headers with optional auth token
    headers: dict[str, str] = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "AI-Code-Intelligence/2.0",
    }
    gh_token = os.getenv("GITHUB_TOKEN", "").strip()
    # Ignore unset or default placeholder tokens
    has_valid_token = bool(gh_token and not gh_token.startswith("your_") and gh_token != "optional")
    if has_valid_token:
        headers["Authorization"] = f"Bearer {gh_token}"

    # --- Fetch repo file tree ---
    tree_url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            tree_resp = await client.get(tree_url, headers=headers)
    except httpx.ConnectError as exc:
        raise HTTPException(status_code=502, detail=f"Cannot reach GitHub API: {exc}")

    if tree_resp.status_code == 401:
        raise HTTPException(
            status_code=401,
            detail="GitHub authentication failed (401 Bad Credentials). Please check your GITHUB_TOKEN in .env or leave it blank for public repos."
        )
    if tree_resp.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail=f"Repository '{owner}/{repo}' (branch '{branch}') not found or is private. "
                   "Set a valid GITHUB_TOKEN in .env for private repos."
        )
    if tree_resp.status_code == 403:
        raise HTTPException(
            status_code=403,
            detail="GitHub API rate limit exceeded. Add a GITHUB_TOKEN to .env for higher limits (5,000 req/hr)."
        )
    if not tree_resp.is_success:
        raise HTTPException(
            status_code=tree_resp.status_code,
            detail=f"GitHub API error ({tree_resp.status_code}): {tree_resp.text[:200]}"
        )

    tree_data = tree_resp.json()
    if tree_data.get("truncated"):
        # Very large repo; we'll work with whatever we got
        pass

    all_blobs = [
        item for item in tree_data.get("tree", [])
        if item["type"] == "blob"
    ]

    # Filter by subdir prefix if provided
    if subdir:
        all_blobs = [b for b in all_blobs if b["path"].startswith(subdir + "/") or b["path"] == subdir]

    # Filter by allowed extensions
    allowed_blobs  = [b for b in all_blobs if _suffix(b["path"]) in ALLOWED_EXTENSIONS]
    skipped_ext    = [b["path"] for b in all_blobs if _suffix(b["path"]) not in ALLOWED_EXTENSIONS]

    # Cap number of files
    candidate_blobs = allowed_blobs[:GITHUB_MAX_FILES]
    over_limit      = [b["path"] for b in allowed_blobs[GITHUB_MAX_FILES:]]

    if not candidate_blobs:
        raise HTTPException(
            status_code=400,
            detail="No supported source files found in the repository."
        )

    # --- Fetch file contents ---
    parts: list[str]          = []
    files_analyzed: list[str] = []
    files_skipped: list[str]  = skipped_ext + over_limit
    ext_counts: Counter       = Counter()
    running_chars             = 0
    budget_exhausted          = False
    skipped_token: list[str]  = []

    raw_base = f"{GITHUB_RAW_BASE}/{owner}/{repo}/{branch}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        for blob in candidate_blobs:
            if budget_exhausted:
                skipped_token.append(blob["path"])
                continue

            raw_url = f"{raw_base}/{blob['path']}"
            raw_headers = {"Authorization": headers["Authorization"]} if has_valid_token else {"User-Agent": "AI-Code-Intelligence/2.0"}
            try:
                resp = await client.get(raw_url, headers=raw_headers)
                if not resp.is_success and has_valid_token:
                    # Fallback to GitHub API raw endpoint for private repos if raw URL fails
                    api_blob_url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{blob['path']}?ref={branch}"
                    resp = await client.get(api_blob_url, headers={**headers, "Accept": "application/vnd.github.v3.raw"})
                if not resp.is_success:
                    logger.warning(f"Could not fetch {blob['path']} (HTTP {resp.status_code})")
                    skipped_ext.append(blob["path"])
                    continue
                content = resp.text
            except Exception as exc:
                logger.warning(f"Exception fetching {blob['path']}: {exc}")
                skipped_ext.append(blob["path"])
                continue

            chunk = f"# --- FILE: {blob['path']} ---\n{content}\n"
            if running_chars + len(chunk) > CHAR_CAP:
                skipped_token.append(blob["path"])
                budget_exhausted = True
                continue

            parts.append(chunk)
            files_analyzed.append(blob["path"])
            ext_counts[_suffix(blob["path"])] += 1
            running_chars += len(chunk)

    files_skipped = files_skipped + skipped_token

    if not parts:
        raise HTTPException(status_code=400, detail="Could not fetch any readable source files from the repository.")

    concatenated = "\n".join(parts)
    if skipped_token:
        concatenated += f"\n# [TRUNCATED: {len(skipped_token)} files skipped due to token limit]"

    language = _detect_language(ext_counts)
    return concatenated, files_analyzed, files_skipped, language


# ---------------------------------------------------------------------------
# Single-file helper
# ---------------------------------------------------------------------------
def _handle_single_file(filename: str, raw: bytes) -> tuple[str, list[str], list[str], str]:
    ext = _suffix(filename)
    try:
        content = raw.decode("utf-8", errors="replace")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode file as UTF-8.")

    lang = EXT_TO_LANGUAGE.get(ext, "unknown")
    return content, [filename], [], lang


# ---------------------------------------------------------------------------
# Zip helper
# ---------------------------------------------------------------------------
def _handle_zip(raw: bytes) -> tuple[str, list[str], list[str], str]:
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid zip archive.")

    parts: list[str]            = []
    files_analyzed: list[str]   = []
    files_skipped_ext: list[str]   = []   # disallowed extension or unreadable
    files_skipped_token: list[str] = []   # over token cap
    ext_counts: Counter         = Counter()
    running_chars = 0
    budget_exhausted = False

    for info in sorted(zf.infolist(), key=lambda i: i.filename):
        if info.is_dir():
            continue
        ext = _suffix(info.filename)
        if ext not in ALLOWED_EXTENSIONS:
            files_skipped_ext.append(info.filename)
            continue

        if budget_exhausted:
            files_skipped_token.append(info.filename)
            continue

        try:
            content = zf.read(info.filename).decode("utf-8", errors="replace")
        except Exception:
            files_skipped_ext.append(info.filename)
            continue

        chunk = f"# --- FILE: {info.filename} ---\n{content}\n"
        if running_chars + len(chunk) > CHAR_CAP:
            files_skipped_token.append(info.filename)
            budget_exhausted = True
            continue

        parts.append(chunk)
        files_analyzed.append(info.filename)
        ext_counts[ext] += 1
        running_chars += len(chunk)

    if not parts:
        raise HTTPException(status_code=400, detail="Zip contained no readable source files.")

    files_skipped = files_skipped_ext + files_skipped_token
    concatenated = "\n".join(parts)
    if files_skipped_token:
        concatenated += f"\n# [TRUNCATED: {len(files_skipped_token)} files skipped due to token limit]"

    language = _detect_language(ext_counts)
    return concatenated, files_analyzed, files_skipped, language
