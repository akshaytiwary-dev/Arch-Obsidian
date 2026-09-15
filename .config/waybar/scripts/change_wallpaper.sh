#!/bin/bash
# Script to change wallpaper, run pywal, and dynamically reload bar / widgets.

if [ -z "$1" ]; then
    echo "Usage: $0 /path/to/wallpaper.jpg"
    exit 1
fi

WALLPAPER="$1"

# Check if wallpaper file exists
if [ ! -f "$WALLPAPER" ]; then
    echo "Error: File $WALLPAPER not found."
    exit 1
fi

# 1. Update background wallpaper using feh, swww, hyprpaper, or similar
# We use swww or hyprpaper in Hyprland usually. Let's attempt swww first.
if command -v swww &> /dev/null; then
    swww img "$WALLPAPER" --transition-type type --transition-step 30
elif command -v hyprpaper &> /dev/null; then
    # Simple hyprpaper reload sequence
    hyprctl hyprpaper unload all
    hyprctl hyprpaper preload "$WALLPAPER"
    # Find active monitor
    MONITOR=$(hyprctl monitors | grep "Monitor" | awk '{print $2}' | head -n1)
    hyprctl hyprpaper wallpaper "$MONITOR,$WALLPAPER"
fi

# 2. Run pywal to extract color palette and generate configuration themes
if command -v wal &> /dev/null; then
    echo "Extracting color scheme using pywal..."
    wal -i "$WALLPAPER" -n --cols16
else
    echo "Pywal ('wal' command) not found. Dynamic coloring will rely on cached scheme."
fi

# 3. Reload Eww config and styles
# Eww parses its scss (which imports colors.scss from pywal)
if command -v eww &> /dev/null; then
    echo "Reloading Eww configuration..."
    eww reload
fi

# 4. Reload Waybar configuration & styling dynamically
# SIGUSR2 is the standard way to trigger styling updates in Waybar without restarting the bar.
if pgrep waybar > /dev/null; then
    echo "Reloading Waybar stylesheet..."
    killall -SIGUSR2 waybar
fi

echo "Wallpaper and color harmonization updated successfully!"
