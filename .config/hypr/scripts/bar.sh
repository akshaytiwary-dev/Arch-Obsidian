#!/bin/bash

set -euo pipefail

APP_SRC="$HOME/.config/ags/app.tsx"
APP_BIN="/tmp/ags-bin"
LOG_FILE="/tmp/ags.log"

# Forcefully kill any running ags and its sub-processes to avoid hanging on D-Bus/compositor lockups
pkill -9 -f "ags-bin" >/dev/null 2>&1 || true
pkill -9 -f "ags.js" >/dev/null 2>&1 || true
pkill -9 -x ags >/dev/null 2>&1 || true
pkill -9 -f "loop-ags" >/dev/null 2>&1 || true

ags bundle "$APP_SRC" "$APP_BIN"

nohup "$APP_BIN" >"$LOG_FILE" 2>&1 & disown

exit 0
