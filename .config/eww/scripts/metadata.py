#!/usr/bin/env python3
import subprocess
import json
import time
import sys
import os
import hashlib
import urllib.request
import threading

cache_dir = os.path.expanduser("~/.cache/eww-music")
os.makedirs(cache_dir, exist_ok=True)
default_art = os.path.expanduser("~/.config/eww/assets/default_cover.png")

class MediaTracker:
    def __init__(self):
        self.lock = threading.Lock()
        self.state_updated = threading.Event()
        self.current_position = 0.0
        self.last_position_update = time.time()
        self.current_track_title = ""
        self.state = {
            "title": "No media playing",
            "artist": "Unknown Artist",
            "album": "Unknown Album",
            "art": default_art,
            "status": "Stopped",
            "status_icon": "",
            "position": 0,
            "position_str": "00:00",
            "duration_str": "00:00",
            "duration": 0,
        }

    def format_time(self, seconds):
        seconds = max(0, int(seconds))
        mins = seconds // 60
        secs = seconds % 60
        return f"{mins:02d}:{secs:02d}"

    def resolve_art(self, art_url):
        if not art_url:
            return default_art
        if art_url.startswith("file://"):
            local_path = art_url[7:]
            if os.path.exists(local_path):
                return local_path
            return default_art
        if art_url.startswith("http://") or art_url.startswith("https://"):
            url_hash = hashlib.md5(art_url.encode()).hexdigest()
            cached_file = os.path.join(cache_dir, f"{url_hash}.png")
            if os.path.exists(cached_file):
                return cached_file
            def _fetch():
                try:
                    urllib.request.urlretrieve(art_url, cached_file)
                    with self.lock:
                        if self.state.get("_current_url") == art_url:
                            self.state["art"] = cached_file
                            self.state_updated.set()
                except Exception:
                    pass
            threading.Thread(target=_fetch, daemon=True).start()
            return default_art
        if os.path.exists(art_url):
            return art_url
        return default_art

    def sync_position(self):
        try:
            pos_str = subprocess.check_output(
                ["playerctl", "position"], text=True, stderr=subprocess.DEVNULL
            ).strip()
            new_pos = float(pos_str)
            if new_pos > 1.0 or self.current_position < 1.0:
                self.current_position = new_pos
                self.last_position_update = time.time()
        except Exception:
            pass

    def listener_loop(self):
        while True:
            try:
                cmd = [
                    "playerctl", "metadata", "--follow", "--format",
                    "{{status}}///{{artist}}///{{title}}///{{album}}///{{mpris:artUrl}}///{{mpris:length}}"
                ]
                proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
                for line in proc.stdout:
                    line = line.strip()
                    if not line:
                        continue
                    parts = line.split("///")
                    if len(parts) >= 3:
                        status = parts[0] or "Stopped"
                        artist = parts[1] or "Unknown Artist"
                        title = parts[2] or "No Title"
                        album = parts[3] if len(parts) > 3 else ""
                        art_url = parts[4] if len(parts) > 4 else ""
                        
                        duration_sec = 0
                        if len(parts) > 5 and parts[5].strip().isdigit():
                            duration_sec = int(parts[5].strip()) // 1000000
                            
                        if duration_sec == 0:
                            try:
                                len_out = subprocess.check_output(
                                    ["playerctl", "metadata", "mpris:length"],
                                    text=True, stderr=subprocess.DEVNULL
                                ).strip()
                                if len_out.isdigit():
                                    duration_sec = int(len_out) // 1000000
                            except Exception:
                                duration_sec = 0

                        art_file = self.resolve_art(art_url)
                        
                        if title != self.current_track_title:
                            self.current_track_title = title
                            self.current_position = 0.0
                            self.last_position_update = time.time()
                        else:
                            self.sync_position()

                        with self.lock:
                            self.state["_current_url"] = art_url
                            self.state["status"] = status
                            self.state["title"] = title
                            self.state["artist"] = artist
                            self.state["album"] = album
                            self.state["art"] = art_file
                            self.state["duration"] = duration_sec
                            self.state["duration_str"] = self.format_time(duration_sec)
                            self.state["status_icon"] = "" if status == "Playing" else ""
                            
                            pct = (self.current_position / duration_sec * 100) if duration_sec > 0 else 0
                            self.state["position"] = min(100, max(0, pct))
                            self.state["position_str"] = self.format_time(self.current_position)
                            
                        self.state_updated.set()
                proc.wait()
            except Exception:
                pass
            time.sleep(1.0)

    def run(self):
        t = threading.Thread(target=self.listener_loop, daemon=True)
        t.start()
        
        last_sync = time.time()

        while True:
            self.state_updated.wait(timeout=0.5)
            self.state_updated.clear()
            
            now = time.time()
            seek_file = "/tmp/eww_music_seek"
            if os.path.exists(seek_file):
                try:
                    with open(seek_file, "r") as sf:
                        seek_pos = float(sf.read().strip())
                    os.remove(seek_file)
                    self.current_position = seek_pos
                    self.last_position_update = now
                except Exception:
                    pass

            with self.lock:
                if self.state["status"] == "Playing":
                    elapsed = now - self.last_position_update
                    self.current_position += elapsed
                    self.last_position_update = now
                    
                    if now - last_sync > 4.0:
                        last_sync = now
                        self.sync_position()
                        
                    duration = self.state["duration"]
                    if duration > 0:
                        pct = (self.current_position / duration * 100)
                        self.state["position"] = min(100, max(0, pct))
                    else:
                        self.state["position"] = 0
                    self.state["position_str"] = self.format_time(self.current_position)
                    
                print(json.dumps(self.state))
                sys.stdout.flush()

if __name__ == "__main__":
    try:
        tracker = MediaTracker()
        tracker.run()
    except (BrokenPipeError, KeyboardInterrupt):
        sys.exit(0)
