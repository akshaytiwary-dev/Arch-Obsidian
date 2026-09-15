#!/bin/bash

# Define variables
hyprdir=$HOME/.config/hypr
monitor=$1
wallpaper=$2 # This is passed as an argument to the script

# Stop any running mpvpaper instance on this monitor when switching to static wallpaper
pkill -f "mpvpaper.*${monitor}" 2>/dev/null

# Ensure awww-daemon is running
if ! pgrep -x "awww-daemon" >/dev/null; then
    awww-daemon &
    sleep 0.5
fi

# Apply wallpaper using awww (swww) with transition effects
awww img "$wallpaper" -o "$monitor" -t wipe --transition-angle 45 --transition-duration 1.6

sleep 2 # Wait for wallpaper to be set (removes stuttering)

# Set wallpaper theme
"$hyprdir/theme/scripts/wal-theme.sh" "$wallpaper"
