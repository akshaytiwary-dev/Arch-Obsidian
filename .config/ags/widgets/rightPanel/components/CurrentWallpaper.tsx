import { createState, createBinding, Accessor, createComputed } from "ags";
import { execAsync } from "ags/process";
import { Gtk } from "ags/gtk4";
import { focusedWorkspace, globalSettings } from "../../../variables";
import Picture from "../../Picture";
import GLib from "gi://GLib";
import { timeout } from "ags/time";
import Gio from "gi://Gio";

const [currentWallpaper, setCurrentWallpaper] = createState<string>("");

const updateWallpaper = async () => {
    try {
        const workspace = focusedWorkspace ? focusedWorkspace.peek() : null;
        if (!workspace) return;
        
        const monitorName = "eDP-1"; 
        const output = await execAsync(`bash ${GLib.get_home_dir()}/.config/ags/scripts/get-wallpapers.sh --current ${monitorName}`);
        if (!output) return;
        
        const wallpapers = JSON.parse(output);
        const wp = wallpapers[workspace.id - 1] || "";
        
        // Ensure the path is a valid string and exists
        if (wp && typeof wp === "string" && wp.trim() !== "") {
            const file = Gio.File.new_for_path(wp);
            if (file.query_exists(null)) {
                setCurrentWallpaper(wp);
                return;
            }
        }
        setCurrentWallpaper("");
    } catch (err) {
        setCurrentWallpaper("");
    }
};

// Delay subscription to ensure focusedWorkspace is initialized
timeout(1000, () => {
    if (focusedWorkspace && focusedWorkspace.subscribe) {
        focusedWorkspace.subscribe(updateWallpaper);
        updateWallpaper();
    }
});

export default ({ className }: { className?: string | Accessor<string> }) => {
    // Initial update
    updateWallpaper();

    // Use a fixed width to prevent expansion
    const widgetWidth = 230;

    return (
        <box
            class={"waifu"}
            orientation={Gtk.Orientation.VERTICAL}
            hexpand={false}
            vexpand={false}
            css={`
                min-width: ${widgetWidth}px;
                max-width: ${widgetWidth}px;
                min-height: 180px;
                max-height: 180px;
                border-radius: 10px;
                overflow: hidden;
            `}
        >
            {createComputed(() => {
                const wp = currentWallpaper();
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
                        width={widgetWidth}
                        height={180}
                    />
                );
            })}
        </box>
    );
};
