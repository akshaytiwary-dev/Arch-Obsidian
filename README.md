# 🌌 Custom Hyprland Dotfiles

A customized, performant, and aesthetic Hyprland rice on Arch Linux featuring dynamic wallpaper-driven color palettes, custom widgets, and smooth animations.

---

## 📸 Features & Components

- **Compositor**: [Hyprland](https://hyprland.org/) (Smooth animations, dynamic tiling, blur rules)
- **Top Bar & Overview**: [AGS (Aylur's GTK Shell)](https://github.com/Aylur/ags) / Astal
- **Media Popup Widget**: [Eww](https://github.com/elkowar/eww) (Zero-lag MPRIS music player card with dynamic album art and Cava audio visualizer)
- **Shell & Prompt**: [Zsh](https://www.zsh.org/) + [Starship](https://starship.rs/) + Autosuggestions & Syntax Highlighting
- **Terminal**: [Kitty](https://sw.kovidgoyal.net/kitty/)
- **Colorscheme**: [Pywal](https://github.com/dylanaraps/pywal) & [Wallust](https://codeberg.org/explosion-mental/wallust) dynamic wallpaper extraction
- **System Monitors**: [Btop](https://github.com/aristocratos/btop), [Fastfetch](https://github.com/fastfetch-cli/fastfetch), [Cava](https://github.com/karlstav/cava)
- **Notification Daemon**: [SwayNotificationCenter](https://github.com/ErikReider/SwayNotificationCenter)

---

## 🚀 Easy Installation (For Arch Linux)

Run the following commands on your Arch Linux system:

```bash
# 1. Clone this repository
git clone https://github.com/akshaytiwary-dev/Arch-Obsidian.git ~/dotfiles

# 2. Enter directory and run the installer
cd ~/dotfiles
chmod +x install.sh
./install.sh
```

> **Note**: The installer automatically creates a timestamped backup of your existing configs (`~/.dotfiles_backup_*`) before making any changes.

---

## ⌨️ Common Keybindings

| Keybinding | Action |
| :--- | :--- |
| `Super + Return` | Open Terminal (`kitty`) |
| `Super + Space` / `Super + D` | App Launcher |
| `Super + Q` | Close Active Window |
| `Super + E` | Open File Manager |
| `Super + W` | Open Wallpaper Selector |
| `Super + V` | Open Clipboard History |
| `Super + M` | Exit Hyprland |

---

## 📁 Repository Structure

```text
dotfiles/
├── .config/
│   ├── hypr/               # Hyprland window rules, binds, wallpaper daemon
│   ├── ags/                # Bar & widget configurations
│   ├── eww/                # Animated media popup card & MPRIS scripts
│   ├── kitty/              # Kitty terminal settings
│   ├── fastfetch/          # Fastfetch configuration
│   ├── cava/               # Audio visualizer config & shaders
│   ├── btop/               # Resource monitor theme & layout
│   ├── swaync/             # Notification daemon styling
│   ├── wallust/            # Dynamic color schemes
│   └── wallpapers/         # Desktop & lockscreen wallpapers
├── .zshrc                  # Shell aliases, prompt, and syntax highlighting
├── pkglist.txt             # Pacman and AUR dependencies
└── install.sh              # Automated setup and configuration script
```
