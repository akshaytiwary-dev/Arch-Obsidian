#!/usr/bin/env python3
import subprocess
import threading
import sys
import json
import time
import os

# Thread-safe global state for music info
state = {
    "status": "Stopped",
    "artist": "",
    "title": "",
    "album": "",
    "art_url": "",
    "visualizer": ""
}
state_lock = threading.Lock()
status_changed = threading.Event()

def metadata_worker():
    """
    Subprocess listener that reads 'playerctl metadata --follow' continuously
    to track title, artist, and playing state shifts instantly.
    """
    while True:
        try:
            # We track status, artist, title, album, and artwork url
            cmd = [
                "playerctl", "metadata", "--follow", "--format", 
                "{{status}}///{{artist}}///{{title}}///{{album}}///{{mpris:artUrl}}"
            ]
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
            
            for line in proc.stdout:
                line = line.strip()
                parts = line.split("///")
                if len(parts) >= 5:
                    with state_lock:
                        old_status = state["status"]
                        state["status"] = parts[0]
                        state["artist"] = parts[1]
                        state["title"] = parts[2]
                        state["album"] = parts[3]
                        state["art_url"] = parts[4]
                        
                        # Trigger wake-up if status changes
                        if old_status != parts[0]:
                            status_changed.set()
            proc.wait()
        except Exception:
            pass
        
        # Reset state on failure / player close
        with state_lock:
            old_status = state["status"]
            state["status"] = "Stopped"
            state["artist"] = ""
            state["title"] = ""
            state["album"] = ""
            state["art_url"] = ""
            if old_status != "Stopped":
                status_changed.set()
        
        # Avoid rapid cycling loops when no player exists
        status_changed.wait(timeout=2.0)
        status_changed.clear()

def get_visualizer_char(val):
    """Maps integers 0-8 to unicode block levels"""
    char_map = [" ", " ", "▂", "▃", "▄", "▅", "▆", "▇", "█"]
    return char_map[min(max(0, val), 8)]

def stop_cava(proc):
    if proc is not None:
        try:
            proc.terminate()
            proc.wait(timeout=0.2)
        except Exception:
            pass
    return None

def main():
    # Run the metadata follow thread in the background
    t = threading.Thread(target=metadata_worker, daemon=True)
    t.start()
    
    cava_proc = None
    cava_config_path = os.path.expanduser("~/.config/waybar/cava.conf")
    
    # Fallback to local script folder config if the waybar folder does not contain it yet
    if not os.path.exists(cava_config_path):
        cava_config_path = os.path.expanduser("~/waybar-music-rice/waybar/cava.conf")
        
    while True:
        with state_lock:
            status = state["status"]
            artist = state["artist"]
            title = state["title"]
            album = state["album"]
            
        if status == "Playing":
            # Spawn cava dynamically only when playing to save CPU cycles
            if cava_proc is None or cava_proc.poll() is not None:
                cava_cmd = ["cava", "-p", cava_config_path]
                cava_proc = subprocess.Popen(cava_cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
            
            try:
                line = cava_proc.stdout.readline()
                if not line:
                    cava_proc = stop_cava(cava_proc)
                    time.sleep(0.5)
                    continue
                
                # Parse Cava string output e.g., "1;2;0;5;4;1;0;3;"
                parts = [x for x in line.strip().split(';') if x]
                visualizer = ""
                for p in parts:
                    try:
                        visualizer += get_visualizer_char(int(p))
                    except ValueError:
                        visualizer += " "
                
                # Formatting limits for Waybar length styling
                display_title = title[:22] + "..." if len(title) > 22 else title
                display_artist = artist[:18] + "..." if len(artist) > 18 else artist
                
                text = f"{visualizer}"
                tooltip = f"Song: {title}\nArtist: {artist}\nAlbum: {album}"
                
                output = {
                    "text": text,
                    "tooltip": tooltip,
                    "class": "playing",
                    "alt": "playing"
                }
                print(json.dumps(output))
                sys.stdout.flush()
                
            except Exception:
                cava_proc = stop_cava(cava_proc)
                time.sleep(0.5)
        else:
            # Terminate Cava visualizer when music is stopped/paused to conserve CPU
            cava_proc = stop_cava(cava_proc)
            
            if status == "Paused":
                text = ""
                tooltip = f"Song: {title}\nArtist: {artist}\nAlbum: {album} (Paused)"
                cls = "paused"
            else:
                text = ""
                tooltip = "No active media player running"
                cls = "stopped"
                
            output = {
                "text": text,
                "tooltip": tooltip,
                "class": cls,
                "alt": cls
            }
            print(json.dumps(output))
            sys.stdout.flush()
            
            # Smart blocking wait: sleep up to 2 seconds or wake up instantly when status changes to "Playing"
            status_changed.wait(timeout=2.0)
            status_changed.clear()

if __name__ == "__main__":
    main()
