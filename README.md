<div align="center">

# 🌌 Arch-Obsidian

### A Modern, Minimalist & Aesthetic Hyprland Rice for Arch Linux
*Featuring dynamic wallpaper-driven color palettes, custom widgets, zero-lag media popup, and fluid animations.*

[![Arch Linux](https://img.shields.io/badge/Arch%20Linux-1793D1?logo=arch-linux&logoColor=fff&style=flat-square)](https://archlinux.org/)
[![Hyprland](https://img.shields.io/badge/Hyprland-00aaee?logo=wayland&logoColor=fff&style=flat-square)](https://hyprland.org/)
[![AGS](https://img.shields.io/badge/AGS-Astal%20GTK4-blueviolet?style=flat-square)](https://github.com/Aylur/ags)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## 📸 Highlights & System Architecture

- **Window Compositor**: [Hyprland](https://hyprland.org/) (Wayland) with custom animations, glassmorphic blur, and smart tiling.
- **Top Bar & Overview**: [Aylur's GTK Shell (AGS)](https://github.com/Aylur/ags) / Astal GTK4 with active workspace monitors, system tray, battery/network indicators, and wallpaper switcher.
- **Animated Media Player**: [Eww](https://github.com/elkowar/eww) zero-lag MPRIS music player card featuring live album art rendering, smooth slide animations, and an embedded [Cava](https://github.com/karlstav/cava) audio visualizer.
- **Colorscheme Engine**: Dynamic extraction via [Pywal](https://github.com/dylanaraps/pywal) & [Wallust](https://codeberg.org/explosion-mental/wallust) — your entire desktop (terminal, bar, notifications, widgets) adapts colors to match your current wallpaper.
- **Shell & Prompt**: [Zsh](https://www.zsh.org/) + [Starship](https://starship.rs/) prompt with autosuggestions, syntax highlighting, and substring history search.
- **Terminal Emulator**: [Kitty](https://sw.kovidgoyal.net/kitty/) with custom opacity and pre-configured color themes.
- **Notification Daemon**: [SwayNotificationCenter (SwayNC)](https://github.com/ErikReider/SwayNotificationCenter) with dark theme styling.
- **System Monitoring**: [Btop](https://github.com/aristocratos/btop) and [Fastfetch](https://github.com/fastfetch-cli/fastfetch).

---

## 🚀 Quick Start Installation

> [!IMPORTANT]
> This configuration is built and tested for **Arch Linux** (and Arch-based distributions like EndeavourOS). Make sure your base system and graphics drivers are up to date before installing.

### 1. One-Line Clone & Install

Run the following commands in your terminal as your normal user (**do NOT run with sudo**):

```bash
git clone https://github.com/akshaytiwary-dev/Arch-Obsidian.git ~/dotfiles
cd ~/dotfiles
chmod +x install.sh
./install.sh
```

---

## 🛠️ What the Automated Installer Does

When you execute `./install.sh`, it safely and automatically handles the entire setup:

1. **🛡️ Safe Backup**: Before changing any file, it creates a timestamped backup of your existing configurations at `~/.dotfiles_backup_<timestamp>`.
2. **⚙️ AUR Helper Detection**: Checks for `yay` or `paru`. If neither is found, it automatically compiles and installs `yay-bin`.
3. **📦 Dependency Management**: Automatically installs all required packages, Wayland utilities, widgets, and fonts listed in [`pkglist.txt`](pkglist.txt).
4. **📋 Dotfile Deployment**: Copies the configurations to `~/.config/` and sets up `~/.zshrc`.
5. **🖥️ Hardware & Monitor Auto-Adaptation**: Automatically queries `hyprctl monitors` to detect your primary display (e.g. laptop `eDP-1` or desktop `DP-1` / `HDMI-A-1`) and generates your initial wallpaper daemon profile.
6. **🔑 Permissions Fix**: Automatically applies `chmod +x` on all shell scripts and Python workers in `~/.config/hypr`, `~/.config/ags`, and `~/.config/eww`.
7. **🐚 Default Shell**: Configures Zsh as your default login shell.
8. **🎨 Palette Initialization**: Extracts colors from the default wallpaper using Pywal/Wallust so your desktop launches fully styled.

---

## ⌨️ Keybindings Cheat Sheet

The default modifier key is **`SUPER`** (the Windows key).

### 🪟 Window Management
| Keybinding | Action |
| :--- | :--- |
| `Super + Q` | Close / kill active window |
| `Super + F` | Toggle fullscreen |
| `Super + Space` | Toggle floating mode for active window |
| `Super + Ctrl + Space` | Pin active floating window across workspaces |
| `Super + Arrow Keys` / `H/J/K/L` | Move focus to adjacent window |
| `Super + Ctrl + Arrow Keys` | Move active window position |
| `Super + Shift + Arrow Keys` | Resize active window |

### 🚀 Applications & Launchers
| Keybinding | Action |
| :--- | :--- |
| `Super + Return` | Open Kitty terminal |
| `Super + Ctrl + Return` | Open floating Kitty terminal |
| `Super + Space` / Tap `Super` | Open AGS Application Launcher |
| `Super + Shift + B` | Launch Web Browser |
| `Super + Shift + T` | Open File Manager (Thunar) |
| `Super + P` | Open Btop System Monitor (Workspace 5) |
| `Super + Shift + V` | Open Clipboard History Manager |
| `Super + .` | Open Emoji Picker |

### 🎨 Panels, Wallpaper & Media
| Keybinding | Action |
| :--- | :--- |
| `Super + W` | Open Wallpaper Switcher (Workspace specific) |
| `Super + M` | Toggle AGS Media Player Panel |
| `Super + L` | Toggle Left Panel (ChatBot & Settings) |
| `Super + Escape` | Open User Session Panel |
| `Super + B` | Restart / Refresh Top Status Bar |
| `Super + Shift + Escape` | Lock screen (`hyprlock`) |

### 📸 Screenshots & Recordings
| Keybinding | Action |
| :--- | :--- |
| `Super + Shift + S` | Capture full workspace screenshot |
| `Super + Ctrl + Shift + S` | Select area screenshot (`grimblast`) |
| `Super + Shift + R` | Screen record current workspace |
| `Super + Ctrl + Shift + R` | Screen record selected area |

---

## 🎨 Customization & Personalization

### 1. Adding & Switching Wallpapers
* Press **`Super + W`** to open the graphical wallpaper selector.
* To add custom wallpapers, simply copy your image files (`.jpg`, `.png`) into:
  ```bash
  ~/.config/wallpapers/custom/
  ```
  The wallpaper daemon and Pywal will automatically index them.

### 2. Fine-Tuning Hyprland (Borders, Opacity, Rounding)
Your configuration has modular overrides located in:
```text
~/.config/hypr/configs/custom/
├── decoration:active_opacity.conf    # Active window transparency
├── decoration:inactive_opacity.conf  # Inactive window transparency
├── decoration:rounding.conf          # Corner radius
├── general:border_size.conf          # Border thickness
├── general:gaps_in.conf              # Gaps between windows
└── general:gaps_out.conf             # Gaps to screen edge
```
Edit any of these files and Hyprland will reload instantly on save.

### 3. Personal Avatar Icon
Replace `~/.face.icon` with your own square image (PNG or JPG) to customize the user panel and lockscreen avatar.

---

## ❓ Frequently Asked Questions & Troubleshooting

<details>
<summary><b>1. Icons or glyphs are showing up as rectangles or missing?</b></summary>
<br>
Ensure the JetBrains Mono Nerd Font and Font Awesome packages are installed and the font cache is refreshed:

```bash
fc-cache -fv
```
</details>

<details>
<summary><b>2. Running on an NVIDIA GPU?</b></summary>
<br>
Add the following lines to <code>~/.config/hypr/configs/exec.conf</code> or your Hyprland environment:

```ini
env = LIBVA_DRIVER_NAME,nvidia
env = XDG_SESSION_TYPE,wayland
env = GBM_BACKEND,nvidia-drm
env = __GLX_VENDOR_LIBRARY_NAME,nvidia
env = NVD_BACKEND,direct
```
</details>

<details>
<summary><b>3. How do I restore my previous configurations?</b></summary>
<br>
The installer created a backup in your home directory named <code>~/.dotfiles_backup_YYYYMMDD_HHMMSS/</code>. To restore any specific configuration:

```bash
cp -r ~/.dotfiles_backup_*/hypr ~/.config/
```
</details>

---

## 📁 Repository Directory Tree

```text
Arch-Obsidian/
├── .config/
│   ├── hypr/               # Hyprland configs, binds, wallpaper daemon
│   │   └── configs/custom/ # Granular customization overrides
│   ├── ags/                # Astal GTK4 bar, app launcher, widgets
│   ├── eww/                # Zero-lag MPRIS media player card & scripts
│   ├── kitty/              # Kitty terminal themes and settings
│   ├── fastfetch/          # System information fetcher
│   ├── cava/               # Audio visualizer configurations
│   ├── btop/               # System resource monitor theme
│   ├── swaync/             # Notification daemon styling
│   ├── wallust/            # Wallpaper-based color schemes
│   ├── waybar/             # Backup/alternative status bar
│   └── wallpapers/         # Curated wallpaper library
├── .zshrc                  # Shell prompt, aliases, and syntax highlighting
├── .face.icon              # Default user avatar
├── pkglist.txt             # Pacman and AUR package dependencies
├── install.sh              # Automated setup and installer script
└── README.md               # Documentation and guides
```

---

<div align="center">
Built with ❤️ for the Linux ricing community.
</div>
