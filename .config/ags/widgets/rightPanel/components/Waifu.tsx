import { createState, createComputed, Accessor } from "ags";
import { execAsync } from "ags/process";
import { Gtk } from "ags/gtk4";
import { focusedWorkspace, globalSettings } from "../../../variables";
import Picture from "../../Picture";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import { timeout } from "ags/time";

export default ({ className, height }: { className?: string | Accessor<string>, height?: number | Accessor<number> }) => {
    const [currentWallpaper, setCurrentWallpaper] = createState<string>("");
    let monitorName = "eDP-1";

    const updateWallpaper = async () => {
        try {
            const workspace = focusedWorkspace ? focusedWorkspace.peek() : null;
            if (!workspace) return;
            
            const output = await execAsync(`bash ${GLib.get_home_dir()}/.config/ags/scripts/get-wallpapers.sh --current ${monitorName}`);
            if (!output) return;
            
            const wallpapers = JSON.parse(output);
            // Array from get-wallpapers.sh is 0-indexed where index 0 is workspace 1
            const wp = wallpapers[workspace.id - 1] || "";
            
            if (wp && typeof wp === "string" && wp.trim() !== "") {
                const file = Gio.File.new_for_path(wp);
                if (file.query_exists(null)) {
                    setCurrentWallpaper(wp);
                    return;
                }
            }
            setCurrentWallpaper("");
        } catch (err) {
            console.error(err);
            setCurrentWallpaper("");
        }
    };

    return (
        <box
            class={createComputed(() => {
                const name = typeof className === "function" ? className() : (className || "");
                return `waifu ${name}`;
            })}
            orientation={Gtk.Orientation.VERTICAL}
            hexpand={false}
            vexpand={false}
            css={createComputed(() => {
                const w = globalSettings.peek().rightPanel.width - 20;
                // keep aspect ratio of 16:9 to avoid changing panel height dramatically
                const h = Math.floor(w * 9 / 16);
                return `
                    min-width: ${w}px;
                    max-width: ${w}px;
                    min-height: ${h}px;
                    max-height: ${h}px;
                    border-radius: 10px;
                    overflow: hidden;
                `;
            })}
            $={(self) => {
                timeout(100, () => {
                    const root = self.get_root() as any;
                    if (root && root.monitorName) {
                        monitorName = root.monitorName;
                    }
                    if (focusedWorkspace && focusedWorkspace.subscribe) {
                        focusedWorkspace.subscribe(updateWallpaper);
                        updateWallpaper(); // Initial fetch
                    }
                });
            }}
        >
            {createComputed(() => {
                const wp = currentWallpaper();
                const w = globalSettings.peek().rightPanel.width - 20;
                const h = Math.floor(w * 9 / 16);

                if (!wp) {
                    return (
                        <box
                            halign={Gtk.Align.CENTER}
                            valign={Gtk.Align.CENTER}
                            class="no-image"
                            hexpand={true}
                            vexpand={true}
                        >
                            <label label="No Wallpaper" />
                        </box>
                    );
                }
                return (
                    <Picture
                        class="wallpaper"
                        file={wp}
                        contentFit={Gtk.ContentFit.COVER}
                        width={w}
                        height={h}
                    />
                );
            })}
        </box>
    );
};