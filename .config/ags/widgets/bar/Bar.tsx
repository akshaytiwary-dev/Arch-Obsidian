import App from "ags/gtk4/app";
import { createComputed, With } from "ags";
import Workspaces from "./components/Workspaces";
import Information from "./components/Information";
import Utilities from "./components/Utilities";
import {
  barMenuOpen,
  emptyWorkspace,
  fullscreenClient,
  globalSettings,
  globalMargin,
} from "../../variables";
import { getMonitorName } from "../../utils/monitor";
import { WidgetSelector } from "../../interfaces/widgetSelector.interface";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import { LeftPanelVisibility } from "../leftPanel/LeftPanel";
import app from "ags/gtk4/app";

export default ({
  monitor,
  setup,
}: {
  monitor: Gdk.Monitor;
  setup: (self: Gtk.Window) => void;
}) => {
  const monitorName = getMonitorName(monitor)!;

  return (
    <window
      gdkmonitor={monitor}
      name={`bar-${monitorName}`}
      namespace="bar"
      class="Bar"
      application={App}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={globalSettings(({ bar }) => {
        return bar.orientation.value
          ? Astal.WindowAnchor.TOP |
              Astal.WindowAnchor.LEFT |
              Astal.WindowAnchor.RIGHT
          : Astal.WindowAnchor.BOTTOM |
              Astal.WindowAnchor.LEFT |
              Astal.WindowAnchor.RIGHT;
      })}
      marginTop={5}
      marginRight={globalMargin}
      marginLeft={globalMargin}
      visible={createComputed(() => {
        return (
          !fullscreenClient() &&
          (globalSettings().bar.lock || barMenuOpen())
        ); // Hide when a client is fullscreen
      })}
      $={(self) => {
        setup(self);
        (self as any).monitorName = monitorName;
        let hideTimeout: ReturnType<typeof setTimeout> | null = null;

        const clearHideTimeout = () => {
          if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
          }
        };

        const motion = new Gtk.EventControllerMotion();
        motion.connect("enter", clearHideTimeout);
        motion.connect("leave", () => {
          if (globalSettings.peek().bar.lock) return;

          clearHideTimeout();
          hideTimeout = setTimeout(() => {
            hideTimeout = null;

            if (!globalSettings.peek().bar.lock && !barMenuOpen.peek()) {
              app.get_window(`bar-${monitorName}`)?.hide();
            }
          }, 300);
        });
        self.add_controller(motion);
        self.connect("destroy", clearHideTimeout);
      }}
    >
      <box
        spacing={5}
        class={emptyWorkspace((empty) => (empty ? "bar empty" : "bar full"))}
      >
        <LeftPanelVisibility />

        <box class="bar-center" hexpand>
          <With value={globalSettings(({ bar }) => bar.layout)}>
            {(layout: WidgetSelector[]) => (
              <centerbox hexpand>
                {layout
                  .filter((widget) => widget.enabled)
                  .map((widget: WidgetSelector, key) => {
                    const types =
                      layout.length === 1
                        ? ["center"]
                        : layout.length === 2
                          ? ["start", "end"]
                          : ["start", "center", "end"];
                    const type = types[key];
                    const halign =
                      type === "start"
                        ? Gtk.Align.START
                        : type === "center"
                          ? Gtk.Align.CENTER
                          : Gtk.Align.END;
                    switch (widget.name) {
                      case "workspaces":
                        return <Workspaces halign={halign} $type={type} />;
                      case "information":
                        return <Information halign={halign} $type={type} />;
                      case "utilities":
                        return <Utilities halign={halign} $type={type} />;
                      default:
                        return <box />;
                    }
                  })}
              </centerbox>
            )}
          </With>
        </box>
      </box>
    </window>
  );
};
