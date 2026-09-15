#!/usr/bin/env bash
# Robust PID-debounced lifecycle manager for Eww music player popup

ACTION="$1"
PID_FILE="/tmp/eww_music_close.pid"
BAR_FLAG="/tmp/eww_music_hover_bar"
POPUP_FLAG="/tmp/eww_music_hover_popup"

cancel_close_timer() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
        fi
        rm -f "$PID_FILE"
    fi
}

schedule_close() {
    cancel_close_timer
    (
        sleep 0.35
        if [ ! -f "$BAR_FLAG" ] && [ ! -f "$POPUP_FLAG" ]; then
            eww close music_player 2>/dev/null
        fi
        rm -f "$PID_FILE"
    ) &
    echo $! > "$PID_FILE"
}

open_popup() {
    cancel_close_timer
    # Only run eww open if window is not already active to avoid client lockups
    if ! eww active-windows 2>/dev/null | grep -q "music_player"; then
        eww open music_player 2>/dev/null
    fi
}

case "$ACTION" in
    enter-bar)
        touch "$BAR_FLAG"
        open_popup
        ;;
    leave-bar)
        rm -f "$BAR_FLAG"
        schedule_close
        ;;
    enter-popup)
        touch "$POPUP_FLAG"
        cancel_close_timer
        ;;
    leave-popup)
        rm -f "$POPUP_FLAG"
        schedule_close
        ;;
    toggle)
        cancel_close_timer
        rm -f "$BAR_FLAG" "$POPUP_FLAG"
        if eww active-windows 2>/dev/null | grep -q "music_player"; then
            eww close music_player 2>/dev/null
        else
            eww open music_player 2>/dev/null
        fi
        ;;
    close-now)
        cancel_close_timer
        rm -f "$BAR_FLAG" "$POPUP_FLAG"
        eww close music_player 2>/dev/null
        ;;
    *)
        echo "Usage: $0 {enter-bar|leave-bar|enter-popup|leave-popup|toggle|close-now}"
        exit 1
        ;;
esac
