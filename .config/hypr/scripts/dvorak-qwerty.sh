#!/bin/bash

set -eu

file="${HOME}/.config/hypr/configs/custom/keyboard.conf"

if [ ! -f "$file" ]; then
    cat >"$file" <<'EOF'
input {
    kb_layout = us
    kb_variant =
    kb_options =
}
EOF
fi

current_variant="$(
    sed -n 's/^[[:space:]]*kb_variant[[:space:]]*=[[:space:]]*//p' "$file" |
        head -n1 |
        tr -d '[:space:]'
)"

if [ "$current_variant" = "dvorak" ]; then
    new_variant=""
    layout_name="Qwerty"
else
    new_variant="dvorak"
    layout_name="Dvorak"
fi

if grep -Eq '^[[:space:]]*kb_variant[[:space:]]*=' "$file"; then
    sed -Ei "s/^[[:space:]]*kb_variant[[:space:]]*=.*/    kb_variant = ${new_variant}/" "$file"
else
    cat >"$file" <<EOF
input {
    kb_layout = us
    kb_variant = ${new_variant}
    kb_options =
}
EOF
fi

hyprctl reload >/dev/null 2>&1 || true
notify-send "Keyboard Layout" "$layout_name"
