# md-viewer

A local Markdown preview tool: renders `.md` files from any directory in your browser, with a file tree on the left, a TOC on the right, and automatic refresh when documents are saved.

A general-purpose tool, placed at `~/project/md-viewer/` so it can be used for any project.

---

## Installation (one-time)

Dependencies are installed via Origin's internal Nexus pip proxy.

```bash
~/project/md-viewer/install.sh
```

The script creates a virtual environment at `~/project/md-viewer/.venv` and installs the dependencies (Flask, Markdown, Pygments, pymdown-extensions).

> After installation, it's recommended to add `md-viewer` to your PATH:
> ```bash
> ln -s ~/project/md-viewer/md-viewer ~/bin/md-viewer    # or /usr/local/bin
> ```

## Usage

```bash
# Browse a whole directory
md-viewer ~/.ssh/home-audit-microsite/.claude/plans

# Open a single file (uses its parent directory as the root)
md-viewer ~/.ssh/home-audit-microsite/.claude/plans/AS-IS-home-audit-microsite-2026-05-14.md

# Defaults to 127.0.0.1:4000 and opens your browser automatically
md-viewer ./docs --port 5000 --host 0.0.0.0 --no-browser
```

After startup, your browser will automatically open `http://127.0.0.1:4000/`.

## Features

| Feature | Description |
|---|---|
| File tree | Recursively lists `.md` / `.markdown` on the left, skipping `node_modules/.venv/dist/build/__pycache__` and most hidden directories, but keeping `.claude/` (where Claude Code plans live by default) |
| TOC | A table of contents is generated automatically on the right, highlighting the current section as you scroll and smoothly scrolling on click |
| Live reload | The current file is re-rendered automatically when its mtime changes (polled every 1.5s) |
| In-document search | A top-bar search box (`⌘K` / `Ctrl+K`) highlights matches; press `Esc` to clear |
| Filename filter | The left-side search box filters the tree by filename / path |
| H2 fold | Click an `##` heading to collapse that section |
| Code copy | Each code block shows a `copy` button on hover in the top-right corner |
| Dark mode | Follows the system `prefers-color-scheme` |
| Tables / task lists / admonitions | Supported via the `tables`, `pymdownx.tasklist`, and `admonition` extensions |
| URL state | `?file=xxx.md` lets you deep-link directly to a specific document |

## Command-line options

```
md-viewer [PATH] [--port 4000] [--host 127.0.0.1] [--no-browser]
```

- `PATH` defaults to the current directory; can be a directory or a single `.md` file
- Security: all path requests are forcibly resolved under `PATH`; `..` escapes are forbidden

## Project structure

```
md-viewer/
├── install.sh          # Installs dependencies into .venv via Origin Nexus
├── md-viewer           # Entry-point shell wrapper
├── md_viewer.py        # Flask app: /, /api/tree, /api/render, /api/mtime
├── requirements.txt
├── templates/
│   └── index.html
└── static/
    ├── style.css
    ├── pygments.css    # Code highlighting (overwritten by pygmentize during install with a full stylesheet)
    └── viewer.js
```

## Try it out

Open the AS-IS document that originally motivated this tool:

```bash
md-viewer ~/.ssh/home-audit-microsite/.claude/plans
# In the browser, click AS-IS-home-audit-microsite-2026-05-14.md
```

## Uninstall

```bash
rm -rf ~/project/md-viewer
```
