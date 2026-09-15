#!/bin/bash

set -euo pipefail

BIN_DIR=/tmp
SRC=$HOME/.config/hypr/scripts-c

mkdir -p "$BIN_DIR"

compile_if_needed() {
    local src="$1"
    local out="$2"

    if [ ! -x "$out" ] || [ "$src" -nt "$out" ]; then
        gcc -O2 "$src" -o "$out"
    fi
}

compile_if_needed "$SRC/battery-check.c" "$BIN_DIR/battery-check"
compile_if_needed "$SRC/updates-check.c" "$BIN_DIR/updates-check"
compile_if_needed "$SRC/posture-check.c" "$BIN_DIR/posture-check"
compile_if_needed "$SRC/wallpaper-loop.c" "$BIN_DIR/wallpaper-loop"

# Keep the wallpaper helper running, but leave AGS startup to bar.sh so the
# desktop session does not launch two bar instances.
pkill -x wallpaper-loop 2>/dev/null || true
nohup "$BIN_DIR/wallpaper-loop" > /dev/null 2>&1 &

# Run the maintenance helpers once at login.
"$BIN_DIR/battery-check" &
"$BIN_DIR/updates-check" &

# Check if cronie is running
if ! systemctl is-active --quiet cronie; then
    
    action=$(notify-send \
        --app-name="Hypr Scripts" \
        --expire-time=0 \
        --action=enable:"Enable Cronie" \
        "Cronie not running" \
    "Cron jobs will not execute")
    
    # FIRST action = index 0
    case "$action" in
        0)
            echo "Enabling Cronie..."
            pkexec systemctl enable --now cronie && systemctl start cronie
        ;;
    esac
fi

# Update crontab with session variables
{
    (crontab -l 2>/dev/null | grep -v "$BIN_DIR") || true
    # Added XDG_RUNTIME_DIR so notify-send can reach your desktop
    echo "*/5 * * * * XDG_RUNTIME_DIR=/run/user/$(id -u) $BIN_DIR/battery-check" # Check battery every 5 minutes
    echo "0 */6 * * * XDG_RUNTIME_DIR=/run/user/$(id -u) $BIN_DIR/updates-check" # Check for updates every 6 hours
    echo "0 * * * * XDG_RUNTIME_DIR=/run/user/$(id -u) $BIN_DIR/posture-check" # Check posture every hour
} | crontab - || notify-send "Error" "Failed to update crontab"
