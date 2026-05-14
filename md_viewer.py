"""Local web server that renders Markdown files with TOC, live reload and a file tree.

Usage:
    md_viewer.py [PATH] [--port 4000] [--host 127.0.0.1] [--no-browser]

PATH may be a directory (browsed as the root) or a single .md file (opens with
its parent directory as the root).
"""
from __future__ import annotations

import argparse
import sys
import webbrowser
from pathlib import Path
from typing import Optional

import markdown
from flask import Flask, abort, jsonify, render_template, request
from markdown.extensions.toc import TocExtension

app = Flask(__name__, static_folder="static", template_folder="templates")

# Set at startup
BASE_DIR: Path = Path(".").resolve()
INITIAL_FILE: Optional[str] = None

MARKDOWN_EXTENSIONS = [
    "tables",
    "fenced_code",
    "codehilite",
    "attr_list",
    "def_list",
    "footnotes",
    "admonition",
    "sane_lists",
    "meta",
    "md_in_html",
    TocExtension(toc_depth="2-4", anchorlink=False, permalink="¶"),
    "pymdownx.tilde",
    "pymdownx.tasklist",
    "pymdownx.superfences",
]

MARKDOWN_EXTENSION_CONFIGS = {
    "codehilite": {
        "css_class": "highlight",
        "linenums": False,
        "guess_lang": False,
    },
    "pymdownx.tasklist": {"custom_checkbox": True},
}


def safe_resolve(rel_path: str) -> Path:
    """Resolve rel_path against BASE_DIR, refusing escapes."""
    if not rel_path:
        abort(400, "missing path")
    target = (BASE_DIR / rel_path).resolve()
    try:
        target.relative_to(BASE_DIR)
    except ValueError:
        abort(403, "path escapes base directory")
    return target


def build_tree(root: Path) -> list:
    """Walk root and return a JSON-serializable tree of .md files.

    Hidden dirs are skipped, except .claude (Claude Code plans live there).
    Directories with no Markdown descendants are pruned.
    """
    md_suffixes = {".md", ".markdown"}
    allowed_hidden = {".claude"}

    def walk(d: Path):
        items = []
        try:
            entries = sorted(d.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
        except (PermissionError, OSError):
            return items
        for p in entries:
            if p.name.startswith(".") and p.name not in allowed_hidden:
                continue
            if p.name in {"node_modules", "__pycache__", ".venv", "dist", "build"}:
                continue
            if p.is_dir():
                children = walk(p)
                if children:
                    items.append({
                        "name": p.name,
                        "type": "dir",
                        "path": str(p.relative_to(BASE_DIR)),
                        "children": children,
                    })
            elif p.suffix.lower() in md_suffixes:
                items.append({
                    "name": p.name,
                    "type": "file",
                    "path": str(p.relative_to(BASE_DIR)),
                })
        return items

    return walk(root)


@app.route("/")
def index():
    return render_template(
        "index.html",
        base_dir=str(BASE_DIR),
        initial_file=INITIAL_FILE or "",
    )


@app.route("/api/tree")
def api_tree():
    return jsonify({"base": str(BASE_DIR), "tree": build_tree(BASE_DIR)})


@app.route("/api/render")
def api_render():
    rel = request.args.get("path", "")
    target = safe_resolve(rel)
    if not target.exists() or not target.is_file():
        abort(404, "file not found")

    try:
        text = target.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        abort(415, "file is not UTF-8 text")

    md = markdown.Markdown(
        extensions=MARKDOWN_EXTENSIONS,
        extension_configs=MARKDOWN_EXTENSION_CONFIGS,
        output_format="html5",
    )
    html = md.convert(text)
    toc_html = getattr(md, "toc", "")
    toc_tokens = getattr(md, "toc_tokens", [])

    return jsonify({
        "html": html,
        "toc": toc_html,
        "toc_tokens": toc_tokens,
        "mtime": target.stat().st_mtime,
        "path": rel,
        "size": target.stat().st_size,
    })


@app.route("/api/mtime")
def api_mtime():
    rel = request.args.get("path", "")
    target = safe_resolve(rel)
    if not target.exists():
        abort(404)
    return jsonify({"mtime": target.stat().st_mtime})


def parse_args():
    parser = argparse.ArgumentParser(
        prog="md-viewer",
        description="Local Markdown viewer with file tree, TOC, and live reload.",
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=".",
        help="Directory to serve, or a single .md file (default: current dir)",
    )
    parser.add_argument("--port", type=int, default=4000, help="Listen port (default 4000)")
    parser.add_argument("--host", default="127.0.0.1", help="Listen host (default 127.0.0.1)")
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Do not auto-open the browser on startup",
    )
    return parser.parse_args()


def main():
    global BASE_DIR, INITIAL_FILE

    args = parse_args()
    target = Path(args.path).expanduser().resolve()

    if not target.exists():
        print(f"md-viewer: {target} does not exist", file=sys.stderr)
        sys.exit(1)

    if target.is_file():
        BASE_DIR = target.parent
        INITIAL_FILE = target.name
    else:
        BASE_DIR = target
        INITIAL_FILE = None

    url = f"http://{args.host}:{args.port}/"
    if INITIAL_FILE:
        url = f"{url}?file={INITIAL_FILE}"

    print(f"md-viewer  ->  {url}")
    print(f"serving    ->  {BASE_DIR}")

    if not args.no_browser:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    app.run(host=args.host, port=args.port, debug=False, use_reloader=False)


if __name__ == "__main__":
    main()
