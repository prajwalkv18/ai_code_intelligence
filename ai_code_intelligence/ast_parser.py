"""
ast_parser.py
Parses Python source into a lightweight structural summary using the stdlib ast module.
"""
from __future__ import annotations

import ast
from typing import Optional


def parse_python_ast(code: str) -> Optional[dict]:
    """
    Parse *code* and return a dict with three keys:
        classes   – list of top-level class names
        functions – list of module-level function names
        imports   – list of imported module/name strings

    Returns None if the code has a SyntaxError.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return None

    classes:   list[str] = []
    functions: list[str] = []
    imports:   list[str] = []

    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.ClassDef):
            classes.append(node.name)

        elif isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
            functions.append(node.name)

        elif isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.asname or alias.name)

        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            for alias in node.names:
                label = f"{module}.{alias.name}" if module else alias.name
                imports.append(alias.asname or label)

    return {"classes": classes, "functions": functions, "imports": imports}


def parse_python_ast(code: str) -> Optional[dict]:
    """
    Parse *code* and return a dict with three keys:
        classes   – list of top-level class names
        functions – list of module-level function names
        imports   – list of imported module/name strings

    Returns None if the code has a SyntaxError.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return None

    classes:   list[str] = []
    functions: list[str] = []
    imports:   list[str] = []

    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.ClassDef):
            classes.append(node.name)

        elif isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
            functions.append(node.name)

        elif isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.asname or alias.name)

        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            for alias in node.names:
                label = f"{module}.{alias.name}" if module else alias.name
                imports.append(alias.asname or label)

    return {"classes": classes, "functions": functions, "imports": imports}


def format_ast_summary(ast_summary: Optional[dict]) -> str:
    """
    Produce a short fenced 'Code structure summary' block suitable for
    injection into an LLM system-prompt, or "" if *ast_summary* is None.
    """
    if not ast_summary:
        return ""

    lines = ["```", "Code structure summary:"]
    if ast_summary.get("classes"):
        lines.append(f"  Classes   : {', '.join(ast_summary['classes'])}")
    if ast_summary.get("functions"):
        lines.append(f"  Functions : {', '.join(ast_summary['functions'])}")
    if ast_summary.get("imports"):
        lines.append(f"  Imports   : {', '.join(ast_summary['imports'])}")
    lines.append("```")
    return "\n".join(lines)


def build_codebase_graph(code: str, files_analyzed: list[str] | None = None, language: str = "python") -> dict:
    """
    Parses code (single file or concatenated multi-file code) and returns a complete
    topology graph structure containing nodes, edges, symbol_table, and file_tree.
    """
    import re

    # 1. Parse individual files if formatted with headers like === File: path === or --- path ---
    file_chunks: list[tuple[str, str, int]] = []   # (filename, code_content, line_offset)
    
    file_header_pattern = r"(?:(?:^|\n)(?:===|---|###)\s*(?:File:\s*)?([^\n\r]+?)\s*(?:===|---|###)?\s*\n)"
    matches = list(re.finditer(file_header_pattern, code))
    
    if matches and len(matches) > 0:
        for idx, match in enumerate(matches):
            fname = match.group(1).strip()
            start_pos = match.end()
            end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(code)
            file_code = code[start_pos:end_pos]
            start_line = code[:start_pos].count("\n") + 1
            file_chunks.append((fname, file_code, start_line))
    else:
        primary_file = files_analyzed[0] if files_analyzed and len(files_analyzed) > 0 else "main_code"
        file_chunks.append((primary_file, code, 1))

    nodes: list[dict] = []
    edges: list[dict] = []
    symbol_table: dict[str, list[dict]] = {}
    node_ids: set[str] = set()

    def add_node(nid: str, label: str, ntype: str, fname: str, line: int, details: dict):
        if nid not in node_ids:
            node_ids.add(nid)
            nodes.append({
                "id": nid,
                "label": label,
                "type": ntype,       # "file" | "class" | "function" | "import"
                "file": fname,
                "line": line,
                "details": details,
            })
            
            # Register in symbol table for IntelliSense lookup
            if ntype in ("class", "function"):
                sym_entry = {
                    "id": nid,
                    "name": label,
                    "type": ntype,
                    "file": fname,
                    "line": line,
                    "signature": details.get("signature", label),
                    "docstring": details.get("docstring", ""),
                    "params": details.get("params", []),
                }
                symbol_table.setdefault(label, []).append(sym_entry)

    def add_edge(src: str, tgt: str, label: str):
        eid = f"{src}->{tgt}:{label}"
        if src in node_ids and tgt in node_ids:
            edges.append({
                "id": eid,
                "source": src,
                "target": tgt,
                "label": label,     # "contains" | "calls" | "imports" | "inherits"
            })

    # Build File nodes
    for fname, fcode, start_line in file_chunks:
        file_node_id = f"file:{fname}"
        add_node(file_node_id, fname, "file", fname, start_line, {"line_count": fcode.count("\n") + 1})

        # Python AST parsing
        if language == "python" or fname.endswith(".py"):
            try:
                tree = ast.parse(fcode)
                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        cid = f"class:{fname}:{node.name}"
                        bases = [b.id for b in node.bases if isinstance(b, ast.Name)]
                        docstring = ast.get_docstring(node) or ""
                        add_node(cid, node.name, "class", fname, node.lineno, {
                            "signature": f"class {node.name}({', '.join(bases)})" if bases else f"class {node.name}",
                            "bases": bases,
                            "docstring": docstring,
                        })
                        add_edge(file_node_id, cid, "contains")

                    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        fid = f"fn:{fname}:{node.name}"
                        is_async = isinstance(node, ast.AsyncFunctionDef)
                        args = [a.arg for a in node.args.args]
                        kwonly = [a.arg for a in node.args.kwonlyargs]
                        all_params = args + kwonly
                        prefix = "async def" if is_async else "def"
                        sig = f"{prefix} {node.name}({', '.join(all_params)})"
                        docstring = ast.get_docstring(node) or ""
                        
                        add_node(fid, node.name, "function", fname, node.lineno, {
                            "signature": sig,
                            "params": all_params,
                            "is_async": is_async,
                            "docstring": docstring,
                        })
                        add_edge(file_node_id, fid, "contains")

                        # Detect internal calls within function body
                        for subnode in ast.walk(node):
                            if isinstance(subnode, ast.Call):
                                if isinstance(subnode.func, ast.Name):
                                    called_name = subnode.func.id
                                    target_fid = f"fn:{fname}:{called_name}"
                                    if target_fid in node_ids:
                                        add_edge(fid, target_fid, "calls")

                    elif isinstance(node, ast.Import):
                        for alias in node.names:
                            imp_name = alias.asname or alias.name
                            iid = f"import:{imp_name}"
                            add_node(iid, imp_name, "import", fname, getattr(node, "lineno", 1), {
                                "module": alias.name,
                            })
                            add_edge(file_node_id, iid, "imports")

                    elif isinstance(node, ast.ImportFrom):
                        mod = node.module or ""
                        for alias in node.names:
                            imp_name = f"{mod}.{alias.name}" if mod else alias.name
                            iid = f"import:{imp_name}"
                            add_node(iid, imp_name, "import", fname, getattr(node, "lineno", 1), {
                                "module": mod,
                                "name": alias.name,
                            })
                            add_edge(file_node_id, iid, "imports")
            except Exception:
                pass

        # Regex heuristic fallback for non-Python or unparseable code
        if len(nodes) <= len(file_chunks):
            # Parse Classes
            for m in re.finditer(r"\bclass\s+([A-Za-z0-9_]+)", fcode):
                cname = m.group(1)
                cid = f"class:{fname}:{cname}"
                line_no = fcode[:m.start()].count("\n") + 1
                add_node(cid, cname, "class", fname, line_no, {"signature": f"class {cname}"})
                add_edge(file_node_id, cid, "contains")

            # Parse Functions
            for m in re.finditer(r"\b(?:function|def|const|let|var|async\s+function)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)", fcode):
                fname_sym = m.group(1)
                params_str = m.group(2)
                params = [p.strip() for p in params_str.split(",") if p.strip()]
                fid = f"fn:{fname}:{fname_sym}"
                line_no = fcode[:m.start()].count("\n") + 1
                add_node(fid, fname_sym, "function", fname, line_no, {
                    "signature": f"function {fname_sym}({params_str})",
                    "params": params,
                })
                add_edge(file_node_id, fid, "contains")

            # Parse Imports
            for m in re.finditer(r"\b(?:import|require)\s+[\"']?([A-Za-z0-9_\-\./]+)[\"']?", fcode):
                imp_name = m.group(1)
                iid = f"import:{imp_name}"
                line_no = fcode[:m.start()].count("\n") + 1
                add_node(iid, imp_name, "import", fname, line_no, {"module": imp_name})
                add_edge(file_node_id, iid, "imports")

    file_tree = [chunk[0] for chunk in file_chunks]

    return {
        "nodes": nodes,
        "edges": edges,
        "symbol_table": symbol_table,
        "file_tree": file_tree,
        "total_nodes": len(nodes),
        "total_edges": len(edges),
    }

