# ⌨️ Arch-Obsidian Keybindings & Shortcuts Reference

This document provides a comprehensive reference of all keybindings and hardware shortcuts configured in the **Arch-Obsidian** Hyprland environment.

> **Note**: The default modifier key is **`SUPER`** (the Windows / Command key).

---

## 🔘 Dedicated Hardware & Special Keys

These buttons map directly to laptop and keyboard hardware keys:

| Key / Shortcut | Target Action | Details |
| :--- | :--- | :--- |
| **`HP Omen Key`** (`XF86Launch2`) | **Zen Browser** | Launches Zen Browser with a built-in 1-second debounce script to prevent accidental double-launches. |
| **`Calculator Key`** (`XF86Calculator`) | **Thunar File Manager** | Directly opens the file manager. |
| **`XF86AudioRaiseVolume`** / `Alt + F12` | Volume Up | Increases audio volume by `+5%` via WirePlumber (`wpctl`). |
| **`XF86AudioLowerVolume`** / `Alt + F11` | Volume Down | Decreases audio volume by `-5%` via WirePlumber (`wpctl`). |
| **`XF86AudioMute`** | Mute Audio | Toggles mute on the default audio sink. |
| **`XF86MonBrightnessUp`** / `Alt + F3` | Brightness Up | Increases screen brightness by `+10%` via `brightnessctl`. |
| **`XF86MonBrightnessDown`** / `Alt + F2` | Brightness Down | Decreases screen brightness by `-10%` via `brightnessctl`. |
| **`Alt + F10`** | Switch Keyboard Layout | Toggles between Dvorak and Qwerty layout profiles (`dvorak-qwerty.sh`). |

---

## 🚀 Applications & Launchers

| Keybinding | Action | Description |
| :--- | :--- | :--- |
| `Super + Return` | **Kitty Terminal** | Opens standard Kitty terminal. |
| `Super + Ctrl + Return` | **Floating Terminal** | Opens a floating Kitty window. |
| `Super` (Tap) / `Super + Space` | **App Launcher** | Opens the AGS application launcher (apps, emojis, calculator, URLs). |
| `Super + Shift + B` | **Zen Browser** | Opens your default web browser. |
| `Super + Shift + T` | **Thunar File Manager** | Opens graphical file manager. |
| `Super + P` | **Btop System Monitor** | Automatically launches Btop assigned to Workspace 5. |
| `Super + O` | **OneDrive Terminal** | Opens the OneDrive sync terminal client. |
| `Super + Shift + V` | **Clipboard History** | Opens the graphical clipboard manager via AGS. |
| `Super + .` (period) | **Emoji Picker** | Opens the interactive emoji picker. |
| `Super + Shift + N` | **Notes App** | Opens the quick scratchpad notes widget. |

---

## 🪟 Window Management

| Keybinding | Action | Description |
| :--- | :--- | :--- |
| `Super + Q` | **Kill Active Window** | Closes the focused window immediately. |
| `Super + F` | **Fullscreen** | Toggles fullscreen mode on the focused window. |
| `Super + Space` | **Toggle Floating** | Switches between tiled and floating modes. |
| `Super + Ctrl + Space` | **Pin Window** | Pins a floating window to remain visible across all workspaces. |

---

## 🧭 Window Navigation, Movement & Resizing

Supports both **Arrow Keys** and **H / N / C / T** (Dvorak/Vim equivalents):

### 1. Moving Focus
| Keybinding | Direction |
| :--- | :--- |
| `Super + Left` / `Super + H` | Focus left window |
| `Super + Right` / `Super + N` | Focus right window |
| `Super + Up` / `Super + C` | Focus window above |
| `Super + Down` / `Super + T` | Focus window below |

### 2. Moving Windows
| Keybinding | Direction |
| :--- | :--- |
| `Super + Ctrl + Left` / `Super + Ctrl + H` | Move window left |
| `Super + Ctrl + Right` / `Super + Ctrl + N` | Move window right |
| `Super + Ctrl + Up` / `Super + Ctrl + C` | Move window up |
| `Super + Ctrl + Down` / `Super + Ctrl + T` | Move window down |

### 3. Resizing Windows
| Keybinding | Direction |
| :--- | :--- |
| `Super + Shift + Left` / `Super + Shift + H` | Shrink width (`-50px`) |
| `Super + Shift + Right` / `Super + Shift + N` | Expand width (`+50px`) |
| `Super + Shift + Up` / `Super + Shift + C` | Shrink height (`-50px`) |
| `Super + Shift + Down` | Expand height (`+50px`) |

### 4. Mouse Controls
| Action | Binding |
| :--- | :--- |
| **Move Window** | Hold `Super` + Left Mouse Click & Drag |
| **Resize Window** | Hold `Super` + Right Mouse Click & Drag |

---

## 🗂️ Workspaces & Scratchpad

| Keybinding | Action |
| :--- | :--- |
| `Super + 1` .. `Super + 0` | Switch to Workspace `1` through `10` |
| `Super + Ctrl + 1` .. `Super + Ctrl + 0` | Move active window to Workspace `1` through `10` and follow |
| `Super + Shift + 1` .. `Super + Shift + 0` | Silently send active window to Workspace `1` through `10` |
| `Super + Mouse Scroll Down` | Switch to next workspace (`e+1`) |
| `Super + Mouse Scroll Up` | Switch to previous workspace (`e-1`) |
| `Super + S` | **SuperSpace** (Toggle Special Workspace / Scratchpad overlay) |
| `Super + Ctrl + S` | Move focused window into **SuperSpace** |
| `Super + Tab` | Toggle Quickshell Workspace Overview |

---

## 🎨 Panels, Wallpaper & UI Widgets

| Keybinding | Action |
| :--- | :--- |
| `Super + W` / `Super + Ctrl + W` | **Wallpaper Switcher** (workspace-specific wallpaper selector) |
| `Super + M` | **Media Panel** (toggle AGS media control widget) |
| `Super + L` | **Left Panel** (toggle AI chatbot & quick settings) |
| `Super + Escape` | **User Session Panel** (lock, logout, suspend, power controls) |
| `Super + B` | **Refresh Status Bar** (restarts AGS/Waybar status bar) |

---

## 📸 Screenshots & Screen Recording

| Keybinding | Action | Tool |
| :--- | :--- | :--- |
| `Super + Shift + S` | Capture full workspace | `grimblast` (`screenshot.sh --now`) |
| `Super + Ctrl + Shift + S` | Capture selected rectangular area | `grimblast` (`screenshot.sh --area`) |
| `Super + Shift + R` | Screen record full workspace | `wf-recorder` (`screenrecord.sh --now`) |
| `Super + Ctrl + Shift + R` | Screen record selected area | `wf-recorder` (`screenrecord.sh --area`) |

---

## 🔒 System & Power Management

| Keybinding | Action | Description |
| :--- | :--- | :--- |
| `Super + Shift + Escape` | **Lock Screen** | Triggers `hyprlock` security screen. |
| `Super + Ctrl + Escape` | **Hibernate / Suspend** | Suspends system to disk/RAM. |
| `Super + Ctrl + Shift + Escape` | **Shutdown** | Executes emergency shutdown immediately (`shutdown now`). |
