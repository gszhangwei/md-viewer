# md-viewer

A local Markdown preview tool: renders `.md` files from any directory in your browser, with a file tree on the left, a TOC on the right, and automatic refresh when documents are saved.

A general-purpose, standalone tool — clone it anywhere on your machine and use it for any project.

---

## Installation (one-time)

```bash
git clone https://github.com/gszhangwei/md-viewer.git
cd md-viewer
./install.sh
```

The script creates a virtual environment at `.venv/` inside the project directory and installs the dependencies (Flask, Markdown, Pygments, pymdown-extensions) from PyPI. If you need to use a custom pip index (e.g. an internal proxy), set `PIP_INDEX_URL` before running the script:

```bash
PIP_INDEX_URL=https://your.nexus.example/repository/pypi-proxy/simple/ ./install.sh
```

> After installation, it's recommended to add `md-viewer` to your PATH (replace the source path with wherever you cloned the repo):
> ```bash
> ln -s "$(pwd)/md-viewer" ~/bin/md-viewer    # or /usr/local/bin
> ```

## Usage

By default, `md-viewer` listens on `127.0.0.1:4000` and opens your browser automatically.

```bash
# Browse a whole directory (uses defaults)
md-viewer ~/notes

# Open a single file (uses its parent directory as the root)
md-viewer ~/notes/some-document.md

# Override defaults: custom port, bind to all interfaces, skip auto-opening the browser
md-viewer ./docs --port 5000 --host 0.0.0.0 --no-browser
```

When the defaults are used, your browser will open `http://127.0.0.1:4000/` after startup.

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
├── install.sh          # Creates .venv and installs dependencies (honours $PIP_INDEX_URL)
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

Point it at any directory containing Markdown files — for example a folder of project notes or design docs:

```bash
md-viewer ~/notes
# In the browser, pick any .md file from the left-side tree
```

## Uninstall

Delete the cloned directory (and the symlink, if you created one):

```bash
rm -rf /path/to/md-viewer
rm -f ~/bin/md-viewer
```
