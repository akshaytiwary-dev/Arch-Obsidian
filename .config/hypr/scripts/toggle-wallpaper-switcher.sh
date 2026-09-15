#!/bin/bash

# Find focused monitor name using hyprctl
MONITOR=$(hyprctl monitors -j | jq -r '.[] | select(.focused == true) | .name 2>/dev/null' || true)

if [ -z "$MONITOR" ] || [ "$MONITOR" = "null" ]; then
    MONITOR=$(hyprctl monitors -j | jq -r '.[0].name 2>/dev/null' || true)
fi

if [ -z "$MONITOR" ] || [ "$MONITOR" = "null" ]; then
    MONITOR="eDP-1"
fi

ags toggle "wallpaper-switcher-${MONITOR}"
