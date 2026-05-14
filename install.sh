#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PYTHON="${PYTHON:-python3}"
VENV_DIR="$SCRIPT_DIR/.venv"
NEXUS_INDEX="https://nexus.apps.origin.com.au/repository/shared-pypi-proxy/simple/"

echo "==> Creating virtualenv at $VENV_DIR"
"$PYTHON" -m venv "$VENV_DIR"

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

echo "==> Upgrading pip via Origin Nexus"
pip install --index-url "$NEXUS_INDEX" --upgrade pip

echo "==> Installing dependencies"
pip install --index-url "$NEXUS_INDEX" -r requirements.txt

echo
echo "Install complete."
echo "Run: $SCRIPT_DIR/md-viewer <path>"
