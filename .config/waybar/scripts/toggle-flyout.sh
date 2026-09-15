#!/usr/bin/env bash

set -euo pipefail

module="${1:-}"

if [[ "$module" != "network" && "$module" != "bluetooth" ]]; then
    exit 1
fi

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
popup_script="$script_dir/system-flyout.py"
runtime_dir="${XDG_RUNTIME_DIR:-/tmp}/waybar-flyouts"
pid_file="$runtime_dir/${module}.pid"
stamp_file="$runtime_dir/${module}.closed-at"

mkdir -p "$runtime_dir"

if [[ -f "$pid_file" ]]; then
    pid="$(<"$pid_file")"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
        exit 0
    fi
    rm -f "$pid_file"
fi

if [[ -f "$stamp_file" ]]; then
    closed_at="$(<"$stamp_file")"
    now_ms="$(date +%s%3N)"
    if [[ "$closed_at" =~ ^[0-9]+$ ]] && (( now_ms - closed_at < 450 )); then
        exit 0
    fi
fi

"$popup_script" "$module" --pid-file "$pid_file" >/dev/null 2>&1 &
disown
