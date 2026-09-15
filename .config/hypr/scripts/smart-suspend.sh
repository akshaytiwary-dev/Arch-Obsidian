#!/bin/bash

# Check if any AC power supply is connected (online)
ac_online=0
for supply in /sys/class/power_supply/*/online; do
    if [ -f "$supply" ]; then
        if [ "$(cat "$supply")" == "1" ]; then
            ac_online=1
            break
        fi
    fi
done

if [ "$1" == "battery" ]; then
    if [ "$ac_online" == "0" ]; then
        systemctl hibernate
    fi
elif [ "$1" == "ac" ]; then
    if [ "$ac_online" == "1" ]; then
        systemctl hibernate
    fi
fi
