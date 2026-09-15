import Hyprland from "gi://AstalHyprland";

import {
  date_less,
  date_more,
  focusedClient,
  globalSettings,
  setGlobalSetting,
  musicData,
} from "../../../variables";
import { execAsync } from "ags/process";
import { Accessor, createBinding, With } from "ags";
import { Gtk } from "ags/gtk4";
import CustomRevealer from "../../CustomRevealer";
import { dateFormats } from "../../../constants/date.constants";
import Pango from "gi://Pango";
import { Eventbox } from "../../Custom/Eventbox";
import Crypto from "../../Crypto";
// import Cava from "../../Cava";
import Bandwidth from "./sub-components/Bandwidth";
import GLib from "gi://GLib";

function Clock() {
  const revealer = <label class="revealer" label={date_more}></label>;

  const trigger = (
    <label class="clock" label={date_less}></label>
  ) as Gtk.Label;

  return (
    <Eventbox
      onClick={() => {
        const currentFormat = globalSettings.peek().dateFormat;
        const currentIndex = dateFormats.indexOf(currentFormat);
        setGlobalSetting(
          "dateFormat",
          dateFormats[(currentIndex + 1) % dateFormats.length],
        );

        // update the date immediately without waiting for the next tick
        trigger.set_label(
          GLib.DateTime.new_now_local().format(
            globalSettings.peek().dateFormat,
          )!,
        );
      }}
    >
      <CustomRevealer
        trigger={trigger}
        child={revealer}
        custom_class="clock"
        transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
      />
    </Eventbox>
  );
}

function ClientTitle({
  focusedClient,
}: {
  focusedClient: Accessor<Hyprland.Client>;
}) {
  return (
    <box visible={focusedClient((c) => !!c)}>
      <With value={focusedClient}>
        {(client) =>
          client && (
            <label
              class="client-title"
              ellipsize={Pango.EllipsizeMode.END}
              maxWidthChars={20}
              label={createBinding(client, "title")((title) => title || "No Title")}
              tooltipMarkup={createBinding(client, "class")((klass) => klass || "")}
            />
          )
        }
      </With>
    </box>
  );
}

function MusicWidget() {
  return (
    <Eventbox
      onClick={() => {
        execAsync(["playerctl", "play-pause"]);
      }}
    >
      <box class="music-widget">
        <label
          class={musicData((m) => `music-text ${m?.class || "stopped"}`)}
          label={musicData((m) => m?.text || "")}
          tooltipText={musicData((m) => m?.tooltip || "")}
        />
      </box>
    </Eventbox>
  );
}

export default ({ halign }: { halign?: Gtk.Align | Accessor<Gtk.Align> }) => {
  return (
    <box class="information" spacing={5} halign={halign}>
      <Clock />
      <MusicWidget />
      <ClientTitle focusedClient={focusedClient} />
      <box>
        <With
          value={globalSettings(({ crypto }) => crypto.favorite)}
        >
          {(crypto: { symbol?: string; timeframe?: string }) => {
            if (!crypto || !crypto.symbol) {
              return null;
            }
            return (
              <Eventbox
                tooltipText={"click to remove"}
                onClick={() =>
                  setGlobalSetting("crypto.favorite", {
                    symbol: "",
                    timeframe: "",
                  })
                }
              >
                <Crypto
                  symbol={crypto.symbol}
                  timeframe={crypto.timeframe}
                  showPrice={true}
                  showGraph={true}
                  orientation={Gtk.Orientation.HORIZONTAL}
                />
              </Eventbox>
            );
          }}
        </With>
      </box>
    </box>
  );
};
