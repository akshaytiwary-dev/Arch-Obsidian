#!/bin/bash
# Transition delay helper for music popup auto-close.
# Checks if the cursor is still hovering on either the bar widget or the popup card.

sleep 0.7

if [ ! -f /tmp/ags_music_hovered ] && [ ! -f /tmp/eww_music_hovered ]; then
    eww close music_player
fi
