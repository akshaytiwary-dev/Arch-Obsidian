#!/bin/bash
BIN_DIR=/tmp
SRC=$HOME/.config/hypr/scripts-c
hyprDir=$HOME/.config/hypr # hypr directory

# Kill existing awww-daemon and auto.sh to prevent memory leak
killall awww-daemon 2>/dev/null
pkill -f "wallpaper-loop" 2>/dev/null

nohup awww-daemon > /dev/null 2>&1 &

sleep 1 # Give awww-daemon a moment to start

rm "$BIN_DIR/wallpaper-loop" 2>/dev/null

gcc "$SRC/wallpaper-loop.c"  -o "$BIN_DIR/wallpaper-loop"

pkill -f "wallpaper-loop"

nohup "$BIN_DIR/wallpaper-loop" > /dev/null 2>&1 &
disown
