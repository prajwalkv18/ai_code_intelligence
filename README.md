# AI Code Intelligence — Backend

FastAPI backend that accepts source code (paste, file, or zip), runs structural
AST analysis (Python), and concurrently generates four LLM-powered outputs via
IBM Granite hosted on Hugging Face.

---

## Requirements

- Python 3.11+
- A Hugging Face account with an API token that has access to
  `ibm-granite/granite-3.1-8b-instruct`

---

## Setup

```bash
# 1. Clone / enter the project directory
cd ai_code_intelligence

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
#    Open .env and set:  HF_API_TOKEN=hf_...
```

---

## Running

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

---

## Endpoint

### `POST /api/analyze`

**Content-Type:** `multipart/form-data`

| Field        | Type   | Required              | Description                              |
|--------------|--------|-----------------------|------------------------------------------|
| `input_type` | string | ✅                    | `"paste"` \| `"file"` \| `"zip"`         |
| `code`       | string | paste mode only       | Raw source code                          |
| `language`   | string | ❌ (auto-detected)    | Language hint (e.g. `"python"`)          |
| `file`       | file   | file / zip mode only  | Single source file or `.zip` archive     |

**Limits**
- Raw upload: 10 MB max (HTTP 413 if exceeded)
- Token cap: ~80 000 tokens (~320 000 chars); excess files listed in `files_skipped`

**Response shape**

```json
{
  "status": "success" | "partial" | "error",
  "language_detected": "python",
  "files_analyzed": ["main.py"],
  "files_skipped": [],
  "ast_summary": {
    "classes": [],
    "functions": [],
    "imports": []
  },
  "outputs": {
    "explanation": { "status": "done" | "error", "content": "..." },
    "diagram":     { "status": "done" | "error", "content": "..." },
    "api_docs":    { "status": "done" | "error", "content": "..." },
    "refactor":    { "status": "done" | "error", "content": "..." }
  },
  "error": null
}
```

- `status` is `"partial"` when one or more LLM outputs errored.
- `ast_summary` is `null` for non-Python languages.

---

## Project structure

```
ai_code_intelligence/
├── main.py            # FastAPI app + /api/analyze route
├── input_handler.py   # Code extraction from paste / file / zip
├── ast_parser.py      # Python AST structural summary
├── llm_client.py      # Async HuggingFace Granite calls
├── orchestrator.py    # Concurrent task runner
├── .env.example       # Environment variable template
├── requirements.txt
└── README.md
```
