#!/usr/bin/env bash
# Real-time Cava visualizer stream for Eww popup

CHARS=(" " " " "▂" "▃" "▄" "▅" "▆" "▇" "█")
EMPTY_BAR="              "
CONFIG="$HOME/.config/eww/cava.conf"

cleanup() {
    pkill -P $$ cava 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

while true; do
    # Check if any player is playing
    status=$(playerctl status 2>/dev/null)
    if [ "$status" = "Playing" ]; then
        cava -p "$CONFIG" 2>/dev/null | while read -r line; do
            # Format: e.g. "0;2;5;4;1;..."
            output=""
            IFS=';' read -ra ADDR <<< "$line"
            for val in "${ADDR[@]}"; do
                if [ -n "$val" ]; then
                    if [ "$val" -gt 8 ] 2>/dev/null; then val=8; fi
                    if [ "$val" -lt 0 ] 2>/dev/null; then val=0; fi
                    output+="${CHARS[$val]}"
                fi
            done
            [ -n "$output" ] && echo "$output"
        done
    else
        echo "$EMPTY_BAR"
        sleep 1
    fi
done
