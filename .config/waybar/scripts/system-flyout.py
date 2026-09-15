#!/usr/bin/env python3

import argparse
import atexit
import os
import pathlib
import re
import signal
import subprocess
import time
from types import SimpleNamespace

import gi

gi.require_version("Gdk", "3.0")
gi.require_version("Gtk", "3.0")
gi.require_version("GtkLayerShell", "0.1")

from gi.repository import Gdk, GLib, Gtk, GtkLayerShell, Pango


WAYBAR_CONFIG = pathlib.Path.home() / ".config" / "waybar" / "config.jsonc"
WINDOW_WIDTH = 380
WINDOW_MAX_HEIGHT = 420


def run_command(args, timeout=20):
    try:
        return subprocess.run(
            args,
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except Exception as exc:  # pragma: no cover - defensive fallback
        return SimpleNamespace(returncode=1, stdout="", stderr=str(exc))


def spawn_command(args):
    try:
        subprocess.Popen(
            args,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
    except Exception:
        return False
    return True


def first_message(result):
    combined = "\n".join(part.strip() for part in (result.stderr, result.stdout) if part.strip())
    for line in combined.splitlines():
        text = line.strip()
        if text:
            return text
    return "Command failed."


def split_escaped(text, separator=":"):
    parts = []
    current = []
    escaped = False
    for char in text:
        if escaped:
            current.append(char)
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == separator:
            parts.append("".join(current))
            current = []
            continue
        current.append(char)
    if escaped:
        current.append("\\")
    parts.append("".join(current))
    return parts


def read_waybar_geometry():
    position = "top"
    height = 30

    try:
        content = WAYBAR_CONFIG.read_text(encoding="utf-8")
    except OSError:
        return position, height

    match = re.search(r'"position"\s*:\s*"([^"]+)"', content)
    if match:
        position = match.group(1).strip().lower()

    match = re.search(r'"height"\s*:\s*([0-9]+)', content)
    if match:
        height = int(match.group(1))

    return position, height


def parse_key_values(text):
    values = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        values[key.strip()] = value.strip()
    return values


def get_network_state():
    devices = []
    result = run_command(["nmcli", "-t", "-f", "DEVICE,TYPE,STATE,CONNECTION", "device", "status"])
    for raw_line in result.stdout.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        device, dev_type, state, connection = (split_escaped(line) + ["", "", "", ""])[:4]
        devices.append(
            {
                "device": device,
                "type": dev_type,
                "state": state,
                "connection": connection,
            }
        )

    wifi_enabled = run_command(["nmcli", "radio", "wifi"]).stdout.strip().lower() == "enabled"
    wifi_device = next((item["device"] for item in devices if item["type"] == "wifi"), "")
    wifi_connected = next(
        (item for item in devices if item["type"] == "wifi" and item["state"] == "connected"),
        None,
    )
    ethernet_connected = next(
        (item for item in devices if item["type"] == "ethernet" and item["state"] == "connected"),
        None,
    )

    return {
        "devices": devices,
        "wifi_enabled": wifi_enabled,
        "wifi_device": wifi_device,
        "wifi_connected": wifi_connected,
        "ethernet_connected": ethernet_connected,
    }


def get_wifi_networks():
    result = run_command(
        [
            "nmcli",
            "-t",
            "-f",
            "IN-USE,SSID,SIGNAL,SECURITY,BARS",
            "device",
            "wifi",
            "list",
            "--rescan",
            "auto",
        ],
        timeout=25,
    )
    if result.returncode != 0:
        return [], first_message(result)

    best_by_ssid = {}
    for raw_line in result.stdout.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        in_use, ssid, signal, security, bars = (split_escaped(line) + ["", "", "", "", ""])[:5]
        ssid = ssid.strip()
        if not ssid:
            continue
        try:
            signal_value = int(signal)
        except ValueError:
            signal_value = 0
        item = {
            "active": in_use == "*",
            "ssid": ssid,
            "signal": signal_value,
            "security": security.strip(),
            "bars": bars.strip(),
        }
        existing = best_by_ssid.get(ssid)
        if existing is None or item["active"] or item["signal"] > existing["signal"]:
            best_by_ssid[ssid] = item

    networks = sorted(
        best_by_ssid.values(),
        key=lambda item: (not item["active"], -item["signal"], item["ssid"].lower()),
    )
    return networks, ""


def get_bluetooth_state():
    adapter_result = run_command(["bluetoothctl", "show"], timeout=10)
    adapter_output = "\n".join(part for part in (adapter_result.stdout, adapter_result.stderr) if part)

    if adapter_result.returncode != 0 or "No default controller available" in adapter_output:
        return None, [], "No Bluetooth adapter available."

    adapter = parse_key_values(adapter_result.stdout)
    paired_result = run_command(["bluetoothctl", "devices"], timeout=10)
    devices = []

    for raw_line in paired_result.stdout.splitlines():
        match = re.match(r"Device\s+(\S+)\s+(.+)", raw_line.strip())
        if not match:
            continue
        address, name = match.groups()
        info_result = run_command(["bluetoothctl", "info", address], timeout=10)
        info = parse_key_values(info_result.stdout)
        paired = info.get("Paired", "no").lower() == "yes"
        trusted = info.get("Trusted", "no").lower() == "yes"
        connected = info.get("Connected", "no").lower() == "yes"
        if not (paired or trusted or connected):
            continue
        devices.append(
            {
                "address": address,
                "name": info.get("Alias") or info.get("Name") or name,
                "connected": connected,
                "paired": paired,
                "trusted": trusted,
            }
        )

    devices.sort(key=lambda item: (not item["connected"], item["name"].lower()))

    adapter_state = {
        "alias": adapter.get("Alias", "Bluetooth"),
        "powered": adapter.get("Powered", "no").lower() == "yes",
        "address": adapter.get("Controller", ""),
    }
    return adapter_state, devices, ""


class FlyoutWindow:
    def __init__(self, module):
        self.module = module
        self.closed = False
        self.dialog_open = False
        self.notice_text = ""
        self.notice_is_error = False
        self.network_state = None
        self.bluetooth_state = None
        self.opened_at = time.monotonic()

        self.window = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
        self.window.set_name("waybar-flyout-window")
        self.window.set_title(f"waybar-{module}-flyout")
        self.window.set_decorated(False)
        self.window.set_resizable(True)
        
        screen = self.window.get_screen()
        visual = screen.get_rgba_visual()
        if visual is not None:
            self.window.set_visual(visual)
        self.window.set_app_paintable(True)
        
        self.window.set_skip_taskbar_hint(True)
        self.window.set_skip_pager_hint(True)
        self.window.set_type_hint(Gdk.WindowTypeHint.POPUP_MENU)
        self.window.set_accept_focus(True)
        self.window.set_can_focus(True)
        self.window.add_events(
            Gdk.EventMask.KEY_PRESS_MASK | 
            Gdk.EventMask.FOCUS_CHANGE_MASK | 
            Gdk.EventMask.BUTTON_PRESS_MASK
        )

        self.window.connect("destroy", self.on_destroy)
        self.window.connect("focus-out-event", self.on_focus_out)
        self.window.connect("key-press-event", self.on_key_press)

        self.configure_layer_shell()
        self.install_css()
        self.build_ui()
        self.populate()

        self.window.show_all()
        GLib.idle_add(self.present_window)
        GLib.timeout_add_seconds(20, self.periodic_refresh)

    def configure_layer_shell(self):
        GtkLayerShell.init_for_window(self.window)
        GtkLayerShell.set_namespace(self.window, f"waybar-flyout-{self.module}")
        GtkLayerShell.set_layer(self.window, GtkLayerShell.Layer.OVERLAY)
        
        # Anchor to all four edges to make it full screen
        GtkLayerShell.set_anchor(self.window, GtkLayerShell.Edge.TOP, True)
        GtkLayerShell.set_anchor(self.window, GtkLayerShell.Edge.BOTTOM, True)
        GtkLayerShell.set_anchor(self.window, GtkLayerShell.Edge.LEFT, True)
        GtkLayerShell.set_anchor(self.window, GtkLayerShell.Edge.RIGHT, True)

        GtkLayerShell.set_keyboard_mode(self.window, GtkLayerShell.KeyboardMode.ON_DEMAND)

    def install_css(self):
        css = b"""
#waybar-flyout-window {
    background-color: transparent;
    background: transparent;
}

#flyout-bg {
    background-color: transparent;
    background: transparent;
}

#flyout-card {
    background-color: rgba(24, 30, 37, 0.97);
    border: 1px solid rgba(100, 114, 125, 0.92);
    border-radius: 14px;
    padding: 14px;
}

#flyout-title {
    color: #ffffff;
    font-size: 16px;
    font-weight: 700;
}

#flyout-subtitle {
    color: #c6d3df;
    font-size: 11px;
}

#flyout-status {
    color: #ffffff;
}

#flyout-notice {
    color: #d7e6f3;
}

#flyout-notice.error {
    color: #ff9c9c;
}

#flyout-placeholder {
    color: #c6d3df;
    padding: 8px 2px;
}

button.flyout-action,
button.flyout-item,
button.flyout-close {
    background-color: rgba(52, 67, 82, 0.96);
    border: 1px solid rgba(97, 118, 140, 0.54);
    border-radius: 10px;
    color: #ffffff;
    box-shadow: none;
    text-shadow: none;
}

button.flyout-action:hover,
button.flyout-item:hover,
button.flyout-close:hover {
    background-color: rgba(68, 84, 102, 0.98);
}

button.flyout-item.active {
    background-color: rgba(41, 128, 185, 0.32);
    border-color: rgba(41, 128, 185, 0.92);
}

separator {
    background-color: rgba(255, 255, 255, 0.08);
}
"""

        provider = Gtk.CssProvider()
        provider.load_from_data(css)
        screen = Gdk.Screen.get_default()
        if screen is not None:
            Gtk.StyleContext.add_provider_for_screen(
                screen,
                provider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
            )

    def build_ui(self):
        self.bg_box = Gtk.EventBox()
        self.bg_box.set_name("flyout-bg")
        self.bg_box.set_visible_window(True)
        self.bg_box.connect("button-press-event", self.on_bg_click)
        self.window.add(self.bg_box)

        self.card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        self.card.set_name("flyout-card")
        self.bg_box.add(self.card)

        # Set size request and alignment on the card
        self.card.set_size_request(WINDOW_WIDTH, -1)
        self.card.set_halign(Gtk.Align.END)
        
        position, height = read_waybar_geometry()
        gap = height + 10
        if position == "bottom":
            self.card.set_valign(Gtk.Align.END)
            self.card.set_margin_bottom(gap)
        else:
            self.card.set_valign(Gtk.Align.START)
            self.card.set_margin_top(gap)
        
        self.card.set_margin_right(10)

        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        self.card.pack_start(header, False, False, 0)

        title_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        header.pack_start(title_box, True, True, 0)

        self.title_label = Gtk.Label(xalign=0)
        self.title_label.set_name("flyout-title")
        title_box.pack_start(self.title_label, False, False, 0)

        self.subtitle_label = Gtk.Label(xalign=0)
        self.subtitle_label.set_name("flyout-subtitle")
        self.subtitle_label.set_text("Click outside to dismiss.")
        title_box.pack_start(self.subtitle_label, False, False, 0)

        close_button = Gtk.Button.new_with_label("Close")
        close_button.set_relief(Gtk.ReliefStyle.NONE)
        close_button.get_style_context().add_class("flyout-close")
        close_button.connect("clicked", self.close)
        header.pack_end(close_button, False, False, 0)

        self.status_label = Gtk.Label(xalign=0)
        self.status_label.set_name("flyout-status")
        self.status_label.set_line_wrap(True)
        self.card.pack_start(self.status_label, False, False, 0)

        self.actions_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        self.actions_box.set_homogeneous(True)
        self.card.pack_start(self.actions_box, False, False, 0)

        self.card.pack_start(Gtk.Separator.new(Gtk.Orientation.HORIZONTAL), False, False, 0)

        self.scrolled = Gtk.ScrolledWindow()
        self.scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.scrolled.set_min_content_height(160)
        self.scrolled.set_max_content_height(260)
        self.scrolled.set_propagate_natural_height(True)
        self.card.pack_start(self.scrolled, True, True, 0)

        viewport = Gtk.Viewport()
        viewport.set_shadow_type(Gtk.ShadowType.NONE)
        self.scrolled.add(viewport)

        self.items_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        viewport.add(self.items_box)

        self.notice_label = Gtk.Label(xalign=0)
        self.notice_label.set_name("flyout-notice")
        self.notice_label.set_line_wrap(True)
        self.card.pack_start(self.notice_label, False, False, 0)

    def populate(self):
        if self.module == "network":
            self.populate_network()
        else:
            self.populate_bluetooth()

    def clear_box(self, box):
        for child in list(box.get_children()):
            box.remove(child)

    def set_notice(self, message="", error=False):
        self.notice_text = message
        self.notice_is_error = error
        self.notice_label.set_text(message)
        context = self.notice_label.get_style_context()
        if error:
            context.add_class("error")
        else:
            context.remove_class("error")

    def make_action_button(self, label, callback):
        button = Gtk.Button.new_with_label(label)
        button.set_relief(Gtk.ReliefStyle.NONE)
        button.get_style_context().add_class("flyout-action")
        button.connect("clicked", callback)
        return button

    def make_placeholder(self, text):
        label = Gtk.Label(xalign=0)
        label.set_name("flyout-placeholder")
        label.set_text(text)
        label.set_line_wrap(True)
        self.items_box.pack_start(label, False, False, 0)

    def make_item_button(self, title, subtitle, callback, active=False):
        button = Gtk.Button()
        button.set_relief(Gtk.ReliefStyle.NONE)
        button.get_style_context().add_class("flyout-item")
        if active:
            button.get_style_context().add_class("active")
        button.connect("clicked", callback)

        content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=3)
        content.set_border_width(10)

        title_label = Gtk.Label(xalign=0)
        title_label.set_text(title)
        title_label.set_ellipsize(Pango.EllipsizeMode.END)
        title_label.set_line_wrap(False)
        content.pack_start(title_label, False, False, 0)

        subtitle_label = Gtk.Label(xalign=0)
        subtitle_label.set_text(subtitle)
        subtitle_label.set_line_wrap(True)
        subtitle_label.set_opacity(0.82)
        content.pack_start(subtitle_label, False, False, 0)

        button.add(content)
        self.items_box.pack_start(button, False, False, 0)

    def populate_network(self):
        self.title_label.set_text("Wi-Fi")
        self.network_state = get_network_state()
        self.clear_box(self.actions_box)
        self.clear_box(self.items_box)

        wifi_enabled = self.network_state["wifi_enabled"]
        wifi_device = self.network_state["wifi_device"]
        wifi_connected = self.network_state["wifi_connected"]
        ethernet_connected = self.network_state["ethernet_connected"]

        if wifi_connected:
            self.status_label.set_text(
                f"{wifi_device} connected to {wifi_connected['connection']}."
            )
        elif wifi_enabled and ethernet_connected:
            self.status_label.set_text(
                f"Wi-Fi is on. Ethernet is active on {ethernet_connected['device']}."
            )
        elif wifi_enabled:
            device_text = f" on {wifi_device}" if wifi_device else ""
            self.status_label.set_text(f"Wi-Fi is enabled{device_text}. Select a network.")
        else:
            self.status_label.set_text("Wi-Fi is disabled.")

        toggle_label = "Turn Wi-Fi Off" if wifi_enabled else "Turn Wi-Fi On"
        self.actions_box.pack_start(
            self.make_action_button(toggle_label, self.toggle_wifi),
            True,
            True,
            0,
        )
        if wifi_connected and wifi_device:
            self.actions_box.pack_start(
                self.make_action_button("Disconnect", self.disconnect_wifi),
                True,
                True,
                0,
            )
        self.actions_box.pack_start(
            self.make_action_button("Refresh", self.refresh_view),
            True,
            True,
            0,
        )
        self.actions_box.pack_start(
            self.make_action_button("Settings", self.open_network_settings),
            True,
            True,
            0,
        )

        if not wifi_enabled:
            self.make_placeholder("Enable Wi-Fi to view nearby networks.")
            self.window.show_all()
            return

        networks, error_message = get_wifi_networks()
        if error_message:
            self.set_notice(error_message, error=True)

        if not networks:
            self.make_placeholder("No visible networks were found.")
            self.window.show_all()
            return

        for network in networks:
            if network["active"]:
                subtitle = "Connected now. Click to disconnect."
            elif network["security"]:
                subtitle = (
                    f"Signal {network['signal']}%. {network['security']}. Click to connect."
                )
            else:
                subtitle = f"Signal {network['signal']}%. Open network. Click to connect."

            if network["bars"]:
                title = f"{network['ssid']}   {network['bars']}"
            else:
                title = f"{network['ssid']}   {network['signal']}%"

            self.make_item_button(
                title,
                subtitle,
                lambda _button, item=network: self.handle_network(item),
                active=network["active"],
            )

        self.window.show_all()

    def populate_bluetooth(self):
        self.title_label.set_text("Bluetooth")
        self.bluetooth_state = get_bluetooth_state()
        self.clear_box(self.actions_box)
        self.clear_box(self.items_box)

        adapter, devices, error_message = self.bluetooth_state
        if error_message:
            self.status_label.set_text(error_message)
        elif adapter["powered"]:
            self.status_label.set_text(f"{adapter['alias']} is powered on.")
        else:
            self.status_label.set_text(f"{adapter['alias']} is powered off.")

        if adapter:
            power_label = "Turn Bluetooth Off" if adapter["powered"] else "Turn Bluetooth On"
            self.actions_box.pack_start(
                self.make_action_button(power_label, self.toggle_bluetooth_power),
                True,
                True,
                0,
            )

        self.actions_box.pack_start(
            self.make_action_button("Refresh", self.refresh_view),
            True,
            True,
            0,
        )
        self.actions_box.pack_start(
            self.make_action_button("Manage", self.open_bluetooth_manager),
            True,
            True,
            0,
        )

        if error_message:
            self.make_placeholder("bluetoothctl could not find a usable controller.")
            self.window.show_all()
            return

        if not adapter["powered"]:
            self.make_placeholder("Turn Bluetooth on to view paired devices.")
            self.window.show_all()
            return

        if not devices:
            self.make_placeholder("No paired devices found. Use Manage to pair a device.")
            self.window.show_all()
            return

        for device in devices:
            if device["connected"]:
                subtitle = "Connected now. Click to disconnect."
            else:
                subtitle = "Paired device. Click to connect."

            self.make_item_button(
                device["name"],
                subtitle,
                lambda _button, item=device: self.handle_bluetooth(item),
                active=device["connected"],
            )

        self.window.show_all()

    def toggle_wifi(self, _button):
        if self.network_state is None:
            self.network_state = get_network_state()

        target = "off" if self.network_state["wifi_enabled"] else "on"
        result = run_command(["nmcli", "radio", "wifi", target], timeout=15)
        if result.returncode == 0:
            self.set_notice(f"Wi-Fi turned {target}.")
        else:
            self.set_notice(first_message(result), error=True)
        self.populate_network()

    def disconnect_wifi(self, _button):
        if self.network_state is None or not self.network_state["wifi_device"]:
            self.set_notice("No Wi-Fi device is available.", error=True)
            return

        result = run_command(
            ["nmcli", "device", "disconnect", self.network_state["wifi_device"]],
            timeout=20,
        )
        if result.returncode == 0:
            self.set_notice("Wi-Fi disconnected.")
        else:
            self.set_notice(first_message(result), error=True)
        self.populate_network()

    def open_network_settings(self, _button):
        if spawn_command(["nm-connection-editor"]):
            self.close()
        else:
            self.set_notice("Failed to start nm-connection-editor.", error=True)

    def handle_network(self, network):
        if self.network_state is None:
            self.network_state = get_network_state()

        if network["active"]:
            self.disconnect_wifi(None)
            return

        device = self.network_state["wifi_device"]
        connect_args = ["nmcli", "--wait", "20", "device", "wifi", "connect", network["ssid"]]
        if device:
            connect_args.extend(["ifname", device])

        result = run_command(connect_args, timeout=30)
        if result.returncode == 0:
            self.set_notice(f"Connected to {network['ssid']}.")
            self.populate_network()
            return

        if network["security"]:
            password = self.prompt_for_password(network["ssid"])
            if password is None:
                self.set_notice("Connection cancelled.")
                return

            password_args = connect_args + ["password", password]
            result = run_command(password_args, timeout=30)
            if result.returncode == 0:
                self.set_notice(f"Connected to {network['ssid']}.")
            else:
                self.set_notice(first_message(result), error=True)
            self.populate_network()
            return

        self.set_notice(first_message(result), error=True)
        self.populate_network()

    def toggle_bluetooth_power(self, _button):
        adapter, _devices, error_message = self.bluetooth_state
        if error_message or not adapter:
            self.set_notice("No Bluetooth adapter is available.", error=True)
            return

        target = "off" if adapter["powered"] else "on"
        result = run_command(["bluetoothctl", "power", target], timeout=15)
        if result.returncode == 0:
            self.set_notice(f"Bluetooth turned {target}.")
        else:
            self.set_notice(first_message(result), error=True)
        self.populate_bluetooth()

    def open_bluetooth_manager(self, _button):
        if spawn_command(["blueman-manager"]):
            self.close()
        else:
            self.set_notice("Failed to start blueman-manager.", error=True)

    def handle_bluetooth(self, device):
        if device["connected"]:
            result = run_command(["bluetoothctl", "disconnect", device["address"]], timeout=20)
            if result.returncode == 0:
                self.set_notice(f"Disconnected {device['name']}.")
            else:
                self.set_notice(first_message(result), error=True)
        else:
            result = run_command(["bluetoothctl", "connect", device["address"]], timeout=25)
            if result.returncode == 0:
                self.set_notice(f"Connected {device['name']}.")
            else:
                self.set_notice(first_message(result), error=True)
        self.populate_bluetooth()

    def prompt_for_password(self, ssid):
        self.dialog_open = True

        dialog = Gtk.Dialog(
            title=f"Connect to {ssid}",
            transient_for=self.window,
            flags=Gtk.DialogFlags.MODAL,
        )
        dialog.add_button("Cancel", Gtk.ResponseType.CANCEL)
        dialog.add_button("Connect", Gtk.ResponseType.OK)
        dialog.set_default_response(Gtk.ResponseType.OK)
        dialog.set_resizable(False)

        box = dialog.get_content_area()
        box.set_spacing(8)
        box.set_border_width(12)

        label = Gtk.Label(xalign=0)
        label.set_text("Enter the Wi-Fi password:")
        box.pack_start(label, False, False, 0)

        entry = Gtk.Entry()
        entry.set_visibility(False)
        entry.set_invisible_char("*")
        entry.set_activates_default(True)
        box.pack_start(entry, False, False, 0)

        dialog.show_all()
        response = dialog.run()
        password = entry.get_text()
        dialog.destroy()
        self.dialog_open = False
        GLib.idle_add(self.present_window)

        if response != Gtk.ResponseType.OK or not password:
            return None
        return password

    def refresh_view(self, _button):
        self.populate()

    def periodic_refresh(self):
        if self.closed:
            return False
        self.populate()
        return True

    def present_window(self):
        if self.closed:
            return False
        self.window.present()
        self.window.grab_focus()
        return False

    def on_bg_click(self, widget, event):
        # Translate click coordinates to card local space to check bounds
        success, card_x, card_y = self.card.translate_coordinates(self.bg_box, 0, 0)
        if success:
            w = self.card.get_allocated_width()
            h = self.card.get_allocated_height()
            if card_x <= event.x <= card_x + w and card_y <= event.y <= card_y + h:
                return False  # click is inside the card, let GTK process it
        self.close()
        return True

    def on_focus_out(self, _window, _event):
        if self.dialog_open:
            return False
        if time.monotonic() - self.opened_at < 0.35:
            return False
        self.close()
        return False

    def on_key_press(self, _window, event):
        if event.keyval == Gdk.KEY_Escape:
            self.close()
            return True
        return False

    def on_destroy(self, *_args):
        self.closed = True
        Gtk.main_quit()

    def close(self, *_args):
        if self.closed:
            return
        self.closed = True
        self.window.destroy()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("module", choices=("network", "bluetooth"))
    parser.add_argument("--pid-file", required=True)
    args = parser.parse_args()

    pid_path = pathlib.Path(args.pid_file)
    pid_path.parent.mkdir(parents=True, exist_ok=True)
    pid_path.write_text(str(os.getpid()), encoding="utf-8")
    closed_stamp = pid_path.with_suffix(".closed-at")

    def cleanup():
        try:
            pid_path.unlink()
        except FileNotFoundError:
            pass
        try:
            closed_stamp.write_text(str(int(time.time() * 1000)), encoding="utf-8")
        except OSError:
            pass

    atexit.register(cleanup)

    signal.signal(signal.SIGTERM, lambda *_args: Gtk.main_quit())
    signal.signal(signal.SIGINT, lambda *_args: Gtk.main_quit())

    FlyoutWindow(args.module)
    Gtk.main()


if __name__ == "__main__":
    main()
