#!/bin/bash

log_dir="${XDG_CACHE_HOME:-$HOME/.cache}/hypr"
log_file="${log_dir}/resume-display.log"

mkdir -p "${log_dir}"

{
  printf '\n[%s] resume-display start\n' "$(date --iso-8601=seconds)"

  # Give the compositor a short window to reconnect to the display stack,
  # and retry if it fails.
  sleep 2
  
  for i in {1..5}; do
    if hyprctl dispatch dpms on; then
      printf '[%s] dpms on succeeded on attempt %d\n' "$(date --iso-8601=seconds)" "$i"
      break
    else
      printf '[%s] dpms on failed on attempt %d\n' "$(date --iso-8601=seconds)" "$i"
      sleep 1
    fi
  done
  # Restart status bar on resume to prevent freeze issues
  "$HOME/.config/hypr/scripts/bar.sh" &
  
} >> "${log_file}" 2>&1 || true

