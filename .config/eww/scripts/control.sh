#!/usr/bin/env bash
action="$1"
value="$2"
duration="$3"

if [ "$action" = "seek" ] && [ -n "$duration" ] && [ "$duration" -gt 0 ]; then
    pct=${value%.*}
    pct=${pct:-0}
    target=$(( pct * duration / 100 ))
    echo "$target" > /tmp/eww_music_seek 2>/dev/null
    playerctl position "$target" 2>/dev/null
fi
