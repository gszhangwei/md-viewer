#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PYTHON="${PYTHON:-python3}"
VENV_DIR="$SCRIPT_DIR/.venv"

echo "==> Creating virtualenv at $VENV_DIR"
"$PYTHON" -m venv "$VENV_DIR"

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

# Respect PIP_INDEX_URL if the user has set one (e.g. for an internal pip proxy);
# otherwise pip falls back to the default PyPI index.
echo "==> Upgrading pip"
pip install --upgrade pip

echo "==> Installing dependencies"
pip install -r requirements.txt

echo
echo "Install complete."
echo "Run: $SCRIPT_DIR/md-viewer <path>"
