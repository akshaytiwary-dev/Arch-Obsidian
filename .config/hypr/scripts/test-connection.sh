#!/usr/bin/env bash
# one-shot network health check
set -euo pipefail

TARGET="google.com"
URL="http://speedtest.tele2.net/1MB.zip"
DURATION=5   # seconds to test download

GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YELLOW=$'\033[0;33m'; NC=$'\033[0m'

log(){ printf "%b\n" "[$(date +"%F %T")] $*"; }

human(){ awk -v b="$1" 'BEGIN{
  if (b>=1073741824) printf("%.2f GB/s", b/1073741824);
  else if (b>=1048576) printf("%.2f MB/s", b/1048576);
  else if (b>=1024) printf("%.2f KB/s", b/1024);
  else printf("%.2f B/s", b);
}'; }

# 1. Check default gateway
gateway=$(ip route | awk '/default/ {print $3; exit}')
if ping -c1 -W1 "$gateway" >/dev/null 2>&1; then
  log "Gateway ${gateway}: ${GREEN}OK${NC}"
else
  log "Gateway ${gateway}: ${RED}FAILED${NC}"
fi

# 2. Check DNS resolution
if getent hosts "$TARGET" >/dev/null; then
  log "DNS for $TARGET: ${GREEN}OK${NC}"
else
  log "DNS for $TARGET: ${RED}FAILED${NC}"
fi

# 3. Ping external host
if ping_out=$(ping -c1 -W2 "$TARGET" 2>&1); then
  ip=$(printf "%s" "$ping_out" | head -n1 | awk -F'[()]' '{print $2}')
  rtt=$(printf "%s" "$ping_out" | grep -Eo 'time=[0-9]+([.][0-9]+)?' | cut -d= -f2)
  log "to $TARGET ($ip): ${GREEN}OK${NC} - ${rtt} ms"
else
  log "to $TARGET: ${RED}FAILED${NC}"
fi

# 4. HTTP reachability
if curl -Is --max-time 5 "http://$TARGET" | head -n1 | grep -q "200\|301\|302"; then
  log "HTTP to $TARGET: ${GREEN}OK${NC}"
else
  log "HTTP to $TARGET: ${RED}FAILED${NC}"
fi

# 5. Bandwidth test (tiny download)
if command -v curl >/dev/null; then
  log "${YELLOW}Downloading for ${DURATION}s to measure speed...${NC}"
  sp=$(curl -s --max-time "$DURATION" --output /dev/null --write-out "%{speed_download}" "$URL" || echo 0)

  if [ "$sp" != "0" ]; then
    hr=$(human "$sp")                             # human-readable in B/s
    mbps=$(awk -v b="$sp" 'BEGIN{printf("%.2f", b*8/1000000)}')  # convert to megabits/s
    log "speed: ${GREEN}${hr}${NC} (~${mbps} Mb/s)"
  fi
else
  log "${YELLOW}curl not available, skipping speed test${NC}"
fi
