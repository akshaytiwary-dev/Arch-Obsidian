#!/usr/bin/env bash

# ==============================================================================
#  Custom Arch Hyprland Dotfiles Installer
# ==============================================================================

set -eo pipefail

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}${BOLD}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          Custom Hyprland Rice & Dotfiles Installer            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 1. Prevent running directly as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}${BOLD}[ERROR] Please do NOT execute this script as root / sudo!${NC}"
    echo "Run it as your normal user. Sudo will be requested automatically when needed."
    exit 1
fi

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_USER="$USER"
TARGET_HOME="$HOME"

# 2. Check for Arch Linux
if [ ! -f /etc/arch-release ]; then
    echo -e "${YELLOW}${BOLD}[WARNING] This rice is configured specifically for Arch Linux.${NC}"
    read -rp "Proceed anyway? [y/N]: " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
fi

# 3. Request sudo password upfront and keep alive
echo -e "\n${BLUE}[1/8] 🔐 Requesting sudo credentials...${NC}"
sudo -v
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &

# 4. Check for or install AUR helper (yay/paru)
echo -e "\n${BLUE}[2/8] ⚙️  Checking for an AUR helper...${NC}"
AUR_HELPER=""
if command -v yay &>/dev/null; then
    AUR_HELPER="yay"
elif command -v paru &>/dev/null; then
    AUR_HELPER="paru"
else
    echo -e "${YELLOW}Neither 'yay' nor 'paru' was found. Installing yay-bin...${NC}"
    sudo pacman -S --needed --noconfirm git base-devel
    BUILD_DIR=$(mktemp -d)
    git clone https://aur.archlinux.org/yay-bin.git "$BUILD_DIR"
    (cd "$BUILD_DIR" && makepkg -si --noconfirm)
    rm -rf "$BUILD_DIR"
    AUR_HELPER="yay"
fi
echo -e "${GREEN}✓ Using AUR helper: ${BOLD}${AUR_HELPER}${NC}"

# 5. Install required packages
echo -e "\n${BLUE}[3/8] 📦 Installing dependencies and packages...${NC}"
if [ -f "$DOTFILES_DIR/pkglist.txt" ]; then
    mapfile -t PKGS < <(grep -vE '^\s*#|^\s*$' "$DOTFILES_DIR/pkglist.txt")
    echo -e "Installing ${#PKGS[@]} verified packages via ${BOLD}${AUR_HELPER}${NC}..."
    if ! $AUR_HELPER -S --needed --noconfirm "${PKGS[@]}"; then
        echo -e "${YELLOW}Bulk installation had partial failures; retrying remaining packages individually...${NC}"
        for pkg in "${PKGS[@]}"; do
            $AUR_HELPER -S --needed --noconfirm "$pkg" 2>/dev/null || echo -e "${RED}✗ Note: $pkg could not be auto-installed (optional or conflicting)${NC}"
        done
    fi
    echo -e "${GREEN}✓ Packages installation completed.${NC}"
else
    echo -e "${YELLOW}pkglist.txt not found. Skipping package installation.${NC}"
fi

# 6. Safely backup existing user configurations
BACKUP_DIR="$TARGET_HOME/.dotfiles_backup_$(date +%Y%m%d_%H%M%S)"
echo -e "\n${BLUE}[4/8] 💾 Creating safe backup of current configurations...${NC}"
mkdir -p "$BACKUP_DIR"

CONFIG_ITEMS=(hypr ags eww kitty fastfetch cava btop swaync wallust wallpapers starship.toml gtk-3.0 Kvantum nwg-look swappy qt5ct qt6ct pipewire waybar)
for item in "${CONFIG_ITEMS[@]}"; do
    if [ -e "$TARGET_HOME/.config/$item" ]; then
        cp -r "$TARGET_HOME/.config/$item" "$BACKUP_DIR/"
    fi
done

[ -f "$TARGET_HOME/.zshrc" ] && cp "$TARGET_HOME/.zshrc" "$BACKUP_DIR/.zshrc"
[ -f "$TARGET_HOME/.face.icon" ] && cp "$TARGET_HOME/.face.icon" "$BACKUP_DIR/.face.icon"
echo -e "${GREEN}✓ Existing configurations safely backed up to:${NC} ${BOLD}${BACKUP_DIR}${NC}"

# 7. Deploy new configurations
echo -e "\n${BLUE}[5/8] 📋 Deploying new dotfiles to ~/.config and ~...${NC}"
mkdir -p "$TARGET_HOME/.config"

# Copy entire .config directory
cp -r "$DOTFILES_DIR/.config/"* "$TARGET_HOME/.config/"

# Copy home files
[ -f "$DOTFILES_DIR/.zshrc" ] && cp "$DOTFILES_DIR/.zshrc" "$TARGET_HOME/.zshrc"
[ -f "$DOTFILES_DIR/.face.icon" ] && cp "$DOTFILES_DIR/.face.icon" "$TARGET_HOME/.face.icon"

# Normalize any leftover hardcoded paths dynamically to match target user
find "$TARGET_HOME/.config" -type f \( -name "*.conf" -o -name "*.json" -o -name "*.jsonc" -o -name "*.css" -o -name "*.scss" -o -name "*.sh" \) -exec sed -i "s|/home/akshay|$TARGET_HOME|g" {} + 2>/dev/null || true

echo -e "${GREEN}✓ Dotfiles deployed.${NC}"

# 8. Monitor auto-adaptation for wallpaper daemon & hyprpaper
echo -e "\n${BLUE}[6/8] 🖥️  Adapting monitor and wallpaper configuration...${NC}"
CONNECTED_MONITORS=$(hyprctl monitors 2>/dev/null | awk '/Monitor/{print $2}' || true)
if [ -z "$CONNECTED_MONITORS" ]; then
    CONNECTED_MONITORS="eDP-1"
fi

for mon in $CONNECTED_MONITORS; do
    mkdir -p "$TARGET_HOME/.config/hypr/wallpaper-daemon/config/$mon"
    mkdir -p "$TARGET_HOME/.config/hypr/hyprpaper/config/$mon"
    
    # Generate workspace wallpaper config with user's target home directory
    FIRST_WALLPAPER=$(find "$TARGET_HOME/.config/wallpapers" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) 2>/dev/null | head -n 1)
    if [ -n "$FIRST_WALLPAPER" ]; then
        cat << WPEOF > "$TARGET_HOME/.config/hypr/wallpaper-daemon/config/$mon/defaults.conf"
w-1=$FIRST_WALLPAPER
w-2=$FIRST_WALLPAPER
w-3=$FIRST_WALLPAPER
w-4=$FIRST_WALLPAPER
w-5=$FIRST_WALLPAPER
w-6=$FIRST_WALLPAPER
w-7=$FIRST_WALLPAPER
w-8=$FIRST_WALLPAPER
w-9=$FIRST_WALLPAPER
w-0=$FIRST_WALLPAPER
WPEOF
        cp "$TARGET_HOME/.config/hypr/wallpaper-daemon/config/$mon/defaults.conf" "$TARGET_HOME/.config/hypr/hyprpaper/config/$mon/defaults.conf"
        echo "$FIRST_WALLPAPER" > "$TARGET_HOME/.config/hypr/wallpaper-daemon/config/current.conf"
        echo "$FIRST_WALLPAPER" > "$TARGET_HOME/.config/hypr/hyprpaper/config/current.conf"
    fi
done
echo -e "${GREEN}✓ Wallpaper and monitor daemon configured for: ${BOLD}${CONNECTED_MONITORS}${NC}"

# 9. Ensure executable permissions on all scripts
echo -e "\n${BLUE}[7/8] 🔑 Setting executable permissions on scripts...${NC}"
find "$TARGET_HOME/.config/hypr" -type f -name "*.sh" -exec chmod +x {} + 2>/dev/null || true
find "$TARGET_HOME/.config/ags" -type f \( -name "*.sh" -o -name "*.py" \) -exec chmod +x {} + 2>/dev/null || true
find "$TARGET_HOME/.config/eww" -type f \( -name "*.sh" -o -name "*.py" \) -exec chmod +x {} + 2>/dev/null || true
find "$TARGET_HOME/.config/waybar" -type f \( -name "*.sh" -o -name "*.py" \) -exec chmod +x {} + 2>/dev/null || true
find "$TARGET_HOME/.config/fastfetch" -type f -name "*.sh" -exec chmod +x {} + 2>/dev/null || true
echo -e "${GREEN}✓ Scripts are now executable.${NC}"

# 10. Configure default shell to Zsh
echo -e "\n${BLUE}[8/8] 🐚 Setting default shell to Zsh...${NC}"
if [ "$SHELL" != "$(which zsh)" ]; then
    chsh -s "$(which zsh)" "$TARGET_USER" || true
    echo -e "${GREEN}✓ Default shell changed to Zsh.${NC}"
else
    echo -e "${GREEN}✓ Zsh is already default shell.${NC}"
fi

# 11. Enable essential background services
echo -e "\n${BLUE}[*] 🔌 Enabling system background services...${NC}"
sudo systemctl enable --now bluetooth.service 2>/dev/null || true
sudo systemctl enable --now cronie.service 2>/dev/null || true
sudo systemctl enable --now power-profiles-daemon.service 2>/dev/null || true
echo -e "${GREEN}✓ Bluetooth, Cronie, and Power Profiles daemons enabled.${NC}"

# Initial pywal color generation if wallpaper exists
if command -v wal &>/dev/null && [ -n "$FIRST_WALLPAPER" ]; then
    echo -e "\n${MAGENTA}🎨 Generating initial color palette from wallpaper...${NC}"
    wal -i "$FIRST_WALLPAPER" -n -q || true
fi

echo -e "\n${GREEN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✨ Installation Completed Successfully! ✨                   ${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "• Previous configs backed up at: ${CYAN}${BACKUP_DIR}${NC}"
echo -e "• Log out of your current session and select ${BOLD}Hyprland${NC} at login."
echo -e "• Enjoy your new rice!\n"
