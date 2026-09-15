import Brightness from "../../../services/brightness";
const brightness = Brightness.get_default();
import CustomRevealer from "../../CustomRevealer";
import {
  Accessor,
  createBinding,
  createComputed,
  createState,
  With,
} from "ags";
import { createSubprocess, execAsync } from "ags/process";
import app from "ags/gtk4/app";

import Wp from "gi://AstalWp";

import Notifd from "gi://AstalNotifd";
const notifd = Notifd.get_default();

import { Gtk } from "ags/gtk4";
import {
  globalSettings,
  globalTheme,
  globalTransition,
  holdBarOpen,
  setGlobalSetting,
  setGlobalTheme,
  systemResourcesData,
} from "../../../variables";
import { notify } from "../../../utils/notification";
import { For } from "ags";
import AstalTray from "gi://AstalTray";
import AstalBattery from "gi://AstalBattery";
import AstalPowerProfiles from "gi://AstalPowerProfiles";
import CircularProgress from "../../CircularProgress";
import { timeout, Timer } from "ags/time";
import SystemResources from "../../rightPanel/components/SystemResources";

import Hyprland from "gi://AstalHyprland";
import GLib from "gi://GLib";
const hyprland = Hyprland.get_default();

function BrightnessWidget() {
  const screen = createBinding(brightness, "screen");

  const label = (
    <label
      label={screen((v) => {
        switch (true) {
          case v > 0.75:
            return "󰃠";
          case v > 0.5:
            return "󰃟";
          case v > 0:
            return "󰃞";
          default:
            return "󰃞";
        }
      })}
    />
  );

  const percentage = (
    <label label={screen((v: number) => `${Math.round(v * 100)}%`)} />
  );

  const slider = (
    <slider
      widthRequest={100}
      class="slider"
      drawValue={false}
      onValueChanged={({ value }) => {
        if (value == screen.peek()) return;
        brightness.screen = value;
      }}
      value={screen}
    />
  );

  const trigger = (
    <box class="trigger" spacing={5} children={[label, percentage]} />
  );

  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let isHovering = false;
  let lastScreen = brightness.screen;
  let firstRender = true;

  const revealer = (
    <revealer
      revealChild={false}
      transitionDuration={globalTransition}
      transitionType={Gtk.RevealerTransitionType.SWING_LEFT}
      $={(self) => {
        const signalId = brightness.connect(`notify::screen`, () => {
          const currentScreen = brightness.screen;

          // Skip the initial notification on component mount
          if (firstRender) {
            firstRender = false;
            lastScreen = currentScreen;
            return;
          }

          // Ignore spurious notifications where value did not change
          if (currentScreen === lastScreen) {
            return;
          }

          lastScreen = currentScreen;
          self.reveal_child = true;

          if (hideTimeout) {
            clearTimeout(hideTimeout);
          }

          // Set new timeout to hide after 2 seconds of no brightness changes
          hideTimeout = setTimeout(() => {
            if (!isHovering) {
              self.reveal_child = false;
            }
          }, 2000);
        });

        self.connect("destroy", () => {
          brightness.disconnect(signalId);
          if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
          }
        });
      }}
    >
      {slider}
    </revealer>
  );

  return (
    <box
      tooltipText={screen((v) => `Brightness: ${Math.round(v * 100)}%`)}
      class={"custom-revealer"}
      visible={createBinding(brightness, "hasBacklight")}
    >
      <Gtk.EventControllerMotion
        onEnter={() => {
          isHovering = true;
          if (hideTimeout) {
            clearTimeout(hideTimeout);
          }
          (revealer as Gtk.Revealer).reveal_child = true;
        }}
        onLeave={() => {
          isHovering = false;
          if (hideTimeout) {
            clearTimeout(hideTimeout);
          }
          hideTimeout = setTimeout(() => {
            (revealer as Gtk.Revealer).reveal_child = false;
          }, 2000);
        }}
      ></Gtk.EventControllerMotion>
      <box class={"content"}>
        {trigger}
        {revealer}
      </box>
    </box>
  );
}

function Battery() {
  const battery = AstalBattery.get_default();
  const powerprofiles = AstalPowerProfiles.get_default();

  const percent = createBinding(
    battery,
    "percentage",
  )((p) => `${Math.floor(p * 100)}%`);
  const [activeProfile, setActiveProfile] = createState(
    powerprofiles.active_profile || "balanced",
  );

  const syncActiveProfile = async () => {
    try {
      const profile = (await execAsync(["powerprofilesctl", "get"])).trim();
      if (profile) setActiveProfile(profile);
      return profile;
    } catch {
      const profile = powerprofiles.active_profile || activeProfile.peek();
      setActiveProfile(profile);
      return profile;
    }
  };

  try {
    powerprofiles.connect("notify::active-profile", () => {
      setActiveProfile(powerprofiles.active_profile || activeProfile.peek());
    });
  } catch {}

  try {
    powerprofiles.connect("notify::active_profile", () => {
      setActiveProfile(powerprofiles.active_profile || activeProfile.peek());
    });
  } catch {}

  void syncActiveProfile();

  let popover: Gtk.Popover | null = null;

  const setProfile = async (profile: string) => {
    if (activeProfile.peek() === profile) {
      popover?.hide();
      return;
    }

    // Update the UI immediately, then confirm against the real backend state.
    setActiveProfile(profile);

    try {
      await execAsync(["powerprofilesctl", "set", profile]);
      await syncActiveProfile();
      popover?.hide();
    } catch (err) {
      await syncActiveProfile();
      notify({
        summary: "Power Profile",
        body: `Failed to switch to ${profile}: ${err}`,
      });
    }
  };

  return (
    <menubutton
      visible={createBinding(battery, "isPresent")}
      tooltipMarkup={createComputed(
        () => `Battery: ${percent()} \nProfile: ${activeProfile()}`,
      )}
    >
      <box spacing={5} class="battery">
        <image iconName={createBinding(battery, "iconName")} />
        <label label={percent} />
      </box>
      <popover
        $={(self) => {
          popover = self;
          self.connect("notify::visible", () => {
            if (self.visible) self.add_css_class("popover-open");
            else if (self.get_child()) self.remove_css_class("popover-open");
          });
        }}
      >
        <box orientation={Gtk.Orientation.VERTICAL}>
          {powerprofiles.get_profiles().map(({ profile }) => (
            <button
              sensitive={activeProfile((active) => active !== profile)}
              onClicked={() => setProfile(profile)}
            >
              <label
                label={activeProfile((active) =>
                  active === profile ? `• ${profile}` : profile,
                )}
                xalign={0}
              />
            </button>
          ))}
        </box>
      </popover>
    </menubutton>
  );
}

function Volume() {
  const speaker = Wp.get_default()?.audio.defaultSpeaker!;
  const volumeIcon = createBinding(speaker, "volumeIcon");
  const volume = createBinding(speaker, "volume");

  const icon = <image pixelSize={11} iconName={volumeIcon} />;

  const slider = (
    <slider
      // step={0.1} // Gtk.Scale doesn't have step prop directly in JSX usually, handled by adjustment or set_increment
      class="slider"
      widthRequest={100}
      onValueChanged={(self) => (speaker.volume = self.get_value())}
      value={volume((v: number) => (isNaN(v) || v < 0 ? 0 : v > 1 ? 1 : v))}
    />
  );

  const percentage = (
    <label label={volume((v: number) => `${Math.round(v * 100)}%`)} />
  );

  const trigger = (
    <box class="trigger" spacing={5} children={[icon, percentage]} />
  );

  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let isHovering = false;
  let lastVolume = speaker.volume;
  let firstRender = true;

  const revealer = (
    <revealer
      revealChild={false}
      transitionDuration={globalTransition}
      transitionType={Gtk.RevealerTransitionType.SWING_LEFT}
      $={(self) => {
        const signalId = speaker.connect(`notify::volume`, () => {
          const currentVolume = speaker.volume;

          // Skip the initial notification on component mount
          if (firstRender) {
            firstRender = false;
            lastVolume = currentVolume;
            return;
          }

          // Ignore spurious notifications where value did not change
          if (currentVolume === lastVolume) {
            return;
          }

          lastVolume = currentVolume;
          self.reveal_child = true;

          if (hideTimeout) {
            clearTimeout(hideTimeout);
          }

          // Set new timeout to hide after 2 seconds of no volume changes
          hideTimeout = setTimeout(() => {
            if (!isHovering) {
              self.reveal_child = false;
            }
          }, 2000);
        });

        self.connect("destroy", () => {
          speaker.disconnect(signalId);
          if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
          }
        });
      }}
    >
      {slider}
    </revealer>
  );
  return (
    <box
      tooltipText={volume(
        (v) => `Volume: ${Math.round(v * 100)}%\nClick to open Volume Mixer`,
      )}
      class={"custom-revealer"}
    >
      <Gtk.EventControllerMotion
        onEnter={() => {
          isHovering = true;
          if (hideTimeout) {
            clearTimeout(hideTimeout);
          }
          (revealer as Gtk.Revealer).reveal_child = true;
        }}
        onLeave={() => {
          isHovering = false;
          if (hideTimeout) {
            clearTimeout(hideTimeout);
          }
          hideTimeout = setTimeout(() => {
            (revealer as Gtk.Revealer).reveal_child = false;
          }, 2000);
        }}
      ></Gtk.EventControllerMotion>
      <Gtk.GestureClick
        onPressed={() => {
          execAsync(`pavucontrol`).catch((err) =>
            notify({ summary: "pavu", body: err }),
          );
        }}
      />
      <box class={"content"}>
        {trigger}
        {revealer}
      </box>
    </box>
  );
}

function Tray() {
  const tray = AstalTray.get_default();
  const items = createBinding(tray, "items");
  const MAX_VISIBLE = 3;

  const keepBarOpenForMenu = (btn: Gtk.MenuButton) => {
    let active = false;

    const update = () => {
      const nextActive = (btn as any).active === true;
      if (nextActive === active) return;

      active = nextActive;
      holdBarOpen(active);
    };

    const activeId = btn.connect("notify::active", update);

    btn.connect("destroy", () => {
      if (active) {
        holdBarOpen(false);
        active = false;
      }

      btn.disconnect(activeId);
    });
  };

  const init = (btn: Gtk.MenuButton, item: AstalTray.TrayItem) => {
    keepBarOpenForMenu(btn);

    const syncMenu = () => {
      btn.insert_action_group("dbusmenu", item.actionGroup);
      btn.menuModel = item.menuModel;
    };

    syncMenu();

    const actionGroupId = item.connect("notify::action-group", syncMenu);
    const menuModelId = item.connect("notify::menu-model", syncMenu);

    btn.connect("destroy", () => {
      item.disconnect(actionGroupId);
      item.disconnect(menuModelId);
    });
  };

  const visibleItems = items((itemList) => itemList.slice(0, MAX_VISIBLE));
  const hiddenItems = items((itemList) => itemList.slice(MAX_VISIBLE));
  const hasHidden = items((itemList) => itemList.length > MAX_VISIBLE);

  return (
    <box class="system-tray">
      <box spacing={2}>
        <For each={visibleItems}>
          {(item) => (
            <menubutton
              class="tray-icon"
              $={(self) => init(self, item)}
              tooltipText={item.tooltip_text}
            >
              <image pixelSize={11} gicon={createBinding(item, "gicon")} />
            </menubutton>
          )}
        </For>
      </box>
      <box spacing={2}>
        <With value={hasHidden}>
          {(hidden) =>
            hidden && (
              <menubutton
                class="tray-icon tray-overflow"
                tooltipText="More icons"
                $={(self) => keepBarOpenForMenu(self)}
              >
                <image pixelSize={11} iconName="view-more-symbolic" />
                <popover
                  $={(self) => {
                    self.connect("notify::visible", () => {
                      if (self.visible) self.add_css_class("popover-open");
                      else if (self.get_child())
                        self.remove_css_class("popover-open");
                    });
                  }}
                >
                  <box
                    class="tray-popover"
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={5}
                  >
                    <For each={hiddenItems}>
                      {(item) => (
                        <menubutton
                          class="tray-icon"
                          $={(self) => init(self, item)}
                          tooltipText={item.tooltip_text}
                        >
                          <box spacing={8}>
                            <image
                              pixelSize={11}
                              gicon={createBinding(item, "gicon")}
                            />
                            <label label={item.tooltip_text} xalign={0} />
                          </box>
                        </menubutton>
                      )}
                    </For>
                  </box>
                </popover>
              </menubutton>
            )
          }
        </With>
      </box>
    </box>
  );
}

function Theme() {
  return (
    <togglebutton
      active={globalTheme}
      onToggled={({ active }) =>
        globalTheme.peek() !== active && setGlobalTheme(active)
      }
      label={globalTheme((theme) => (theme ? "" : ""))}
      class="theme icon"
      tooltipMarkup={globalTheme((theme) =>
        theme ? `Switch to Dark Theme` : `Switch to Light Theme`,
      )}
    />
  );
}

function PinBar() {
  return (
    <togglebutton
      active={globalSettings(({ bar }) => bar.lock)}
      onToggled={({ active }) => {
        setGlobalSetting("bar.lock", active);
      }}
      class="panel-lock icon"
      label={globalSettings(({ bar }) => (bar.lock ? "" : ""))}
      tooltipMarkup={globalSettings(({ bar }) =>
        bar.lock ? `Unlock Bar` : `Lock Bar`,
      )}
    />
  );
}

function DndToggle() {
  const [hasPing, setHasPing] = createState(false);
  let pingTimeout: ReturnType<typeof setTimeout> | null = null;

  // Reset ping when DND is turned off
  const dndActive = globalSettings(({ notifications }) => {
    if (!notifications.dnd) {
      setHasPing(false);
    }
    return notifications.dnd;
  });

  return (
    <togglebutton
      active={dndActive}
      onToggled={({ active }) => {
        setGlobalSetting("notifications.dnd", active);
      }}
      // class="dnd-toggle icon"
      class={hasPing((ping) => (ping ? "dnd-toggle active" : "dnd-toggle"))}
      $={(self) => {
        const signalId = notifd.connect("notified", () => {
          if (!globalSettings.peek().notifications.dnd) {
            return;
          }

          setHasPing(true);

          if (pingTimeout) {
            clearTimeout(pingTimeout);
          }

          pingTimeout = setTimeout(() => {
            setHasPing(false);
            pingTimeout = null;
          }, 600);
        });

        self.connect("destroy", () => {
          notifd.disconnect(signalId);
          if (pingTimeout) {
            clearTimeout(pingTimeout);
            pingTimeout = null;
          }
        });
      }}
      tooltipMarkup={globalSettings(({ notifications }) =>
        notifications.dnd ? "Disable Do Not Disturb" : "Enable Do Not Disturb",
      )}
    >
      <label
        label={globalSettings(({ notifications }) =>
          notifications.dnd ? "" : "",
        )}
      ></label>
    </togglebutton>
  );
}

function ResourceMonitor() {
  return (
    <box
      class="resource-monitor"
      $={(self) => {
        const popover = new Gtk.Popover({
          has_arrow: true,
          position: Gtk.PositionType.BOTTOM,
          autohide: false,
        });

        popover.set_child(
          SystemResources({
            className: "resource-monitor-popover",
            orientation: Gtk.Orientation.HORIZONTAL,
          }) as unknown as Gtk.Widget,
        );
        popover.set_parent(self);

        let hideTimeout: Timer;

        const monitorMotion = new Gtk.EventControllerMotion();
        monitorMotion.connect("enter", () => {
          if (hideTimeout) {
            hideTimeout.cancel();
          }
          popover.show();
        });

        monitorMotion.connect("leave", () => {
          hideTimeout = timeout(80, () => {
            popover.hide();
            hideTimeout.cancel();
          });
        });

        self.add_controller(monitorMotion);

        const popoverMotion = new Gtk.EventControllerMotion();
        popoverMotion.connect("enter", () => {
          if (hideTimeout) {
            hideTimeout.cancel();
          }
        });

        popoverMotion.connect("leave", () => {
          popover.hide();
        });

        popover.add_controller(popoverMotion);
      }}
    >
      <Gtk.GestureClick
        onPressed={() => {
          hyprland.dispatch("workspace", "5");
        }}
      />
      <With value={systemResourcesData}>
        {(res) => (
          <box spacing={10}>
            <CircularProgress
              visible={res?.cpuLoad !== undefined}
              tooltipText={`CPU Usage ${res?.cpuLoad}%`}
              value={res?.cpuLoad ? res?.cpuLoad / 100 : 0}
              className="cpu-monitor"
              icon=""
            />
            <CircularProgress
              visible={res?.ramUsage !== undefined}
              tooltipText={`RAM Usage ${res?.ramUsage}%`}
              value={res?.ramUsage ? res?.ramUsage / 100 : 0}
              className="ram-monitor"
              icon=""
            />
            <CircularProgress
              visible={res?.gpuLoad !== undefined}
              tooltipText={`GPU Usage ${res?.gpuLoad}%`}
              value={res?.gpuLoad ? res?.gpuLoad / 100 : 0}
              className="gpu-monitor"
              icon="󱤟"
            />
          </box>
        )}
      </With>
    </box>
  );
}

function UserPanel() {
  return (
    <button
      class="user-panel"
      label=""
      onClicked={(self) => {
        const window = app.get_window(
          `user-panel-${(self.get_root() as any).monitorName}`,
        );
        if (window)
          window.is_visible()
            ? (window.visible = false)
            : (window.visible = true);
      }}
      tooltipMarkup={`User Panel\n<b>SUPER + ESC</b>`}
    />
  );
}

export default ({ halign }: { halign?: Gtk.Align | Accessor<Gtk.Align> }) => {
  return (
    <box class="utilities" spacing={5} halign={halign} hexpand>
      <Battery />
      <BrightnessWidget />
      <Volume />
      <Tray />
      <ResourceMonitor />
      <Theme />
      <PinBar />
      <DndToggle />
      <UserPanel />
    </box>
  );
};
