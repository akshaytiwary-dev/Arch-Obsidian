import AstalMpris from "gi://AstalMpris";
import { getImageRatio } from "../utils/image";
import { Gtk } from "ags/gtk4";
import {
  createBinding,
  createState,
  Accessor,
} from "ags";
import Picture from "./Picture";
import GLib from "gi://GLib";
import Pango from "gi://Pango";
import AstalApps from "gi://AstalApps";

export default ({
  player,
  width,
  height,
  className,
}: {
  player: AstalMpris.Player;
  width?: Accessor<number> | number;
  height?: Accessor<number> | number;
  className?: string;
}) => {
  const apps = new AstalApps.Apps();
  const [isDragging, setIsDragging] = createState(false);
  const [parentWidth, setParentWidth] = createState(0);

  function lengthStr(length: number) {
    const min = Math.floor(length / 60);
    const sec = Math.floor(length % 60);
    const sec0 = sec < 10 ? "0" : "";
    return `${min}:${sec0}${sec}`;
  }

  const title = (
    <label
      class="title"
      ellipsize={Pango.EllipsizeMode.END}
      halign={Gtk.Align.START}
      label={createBinding(player, "title")((t) => t || "Unknown Track")}
    ></label>
  );

  const artist = (
    <label
      class="artist"
      maxWidthChars={20}
      halign={Gtk.Align.START}
      ellipsize={Pango.EllipsizeMode.END}
      label={createBinding(player, "artist")((a) => a || "Unknown Artist")}
    ></label>
  );

  const positionSlider = (
    <slider
      class="slider"
      $={(self) => {
        let unsubscribe: (() => void) | null = null;

        const updateValue = () => {
          if (!isDragging.get()) {
            const pos = player.position;
            const len = player.length;
            self.set_value(len > 0 ? pos / len : 0);
          }
        };

        const gestureClick = new Gtk.GestureDrag();

        gestureClick.connect("drag-begin", () => {
          setIsDragging(true);
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
        });

        gestureClick.connect("drag-update", () => {
          player.position = self.get_value() * player.length;
        });

        gestureClick.connect("drag-end", () => {
          player.position = self.get_value() * player.length;
          setIsDragging(false);
          unsubscribe = createBinding(player, "position").subscribe(
            updateValue,
          );
        });

        self.add_controller(gestureClick);
        unsubscribe = createBinding(player, "position").subscribe(
          updateValue,
        );

        self.connect("destroy", () => {
          if (unsubscribe) {
            unsubscribe();
          }
        });
      }}
      visible={createBinding(player, "length")((l) => l > 0)}
    />
  );

  const positionLabel = (
    <label
      class="position time"
      halign={Gtk.Align.START}
      label={createBinding(player, "position")(lengthStr)}
      visible={createBinding(player, "length")((l) => l > 0)}
    ></label>
  );

  const lengthLabel = (
    <label
      class="length time"
      halign={Gtk.Align.END}
      visible={createBinding(player, "length")((l) => l > 0)}
      label={createBinding(player, "length")(lengthStr)}
    ></label>
  );

  const Icon = () => (
    <box hexpand halign={Gtk.Align.END} valign={Gtk.Align.START}>
      <image
        class="icon"
        tooltip_text={createBinding(player, "identity")((i) => i || "")}
        iconName={createBinding(player, "entry")((entry) => {
          if (!entry) return "audio-x-generic";
          return apps.exact_query(entry)[0]?.iconName || "audio-x-generic";
        })}
      />
    </box>
  );

  const playPause = (
    <button
      onClicked={() => player.play_pause()}
      class="play-pause"
      visible={createBinding(player, "can_play")((c) => c)}
    >
      <label
        label={createBinding(
          player,
          "playbackStatus",
        )((s) => {
          switch (s) {
            case AstalMpris.PlaybackStatus.PLAYING:
              return "";
            case AstalMpris.PlaybackStatus.PAUSED:
            case AstalMpris.PlaybackStatus.STOPPED:
              return "";
            default:
              return "";
          }
        })}
      />
    </button>
  );

  const prev = (
    <button
      onClicked={() => player.previous()}
      visible={createBinding(player, "can_go_previous")((c) => c)}
    >
      <label label="󰒮" />
    </button>
  );

  const next = (
    <button
      onClicked={() => player.next()}
      visible={createBinding(player, "can_go_next")((c) => c)}
    >
      <label label="󰒭" />
    </button>
  );

  const bottomBar = (
    <box
      class="bottom-bar"
      spacing={5}
      orientation={Gtk.Orientation.VERTICAL}
      hexpand
    >
      <box class="top-row" spacing={10}>
        <Picture
          class={createBinding(
            player,
            "playbackStatus",
          )((s) =>
            s === AstalMpris.PlaybackStatus.PLAYING
              ? "cover-art-spinner playing"
              : "cover-art-spinner paused",
          )}
          height={40}
          width={40}
          file={createBinding(player, "coverArt")}
        />
        <box class="info" orientation={Gtk.Orientation.VERTICAL}>
          {title}
          {artist}
        </box>
        <Icon />
      </box>

      <box class={"separator"} vexpand></box>

      <centerbox>
        <box $type="start">{positionLabel}</box>
        <box $type="center" spacing={5}>
          {prev}
          {playPause}
          {next}
        </box>
        <box $type="end">{lengthLabel}</box>
      </centerbox>
      {positionSlider}
    </box>
  );

  return (
    <overlay
      class={`player ${className || ""}`}
      hexpand
      $={(self) => {
        const controller = new Gtk.EventControllerMotion();

        controller.connect("enter", () => {
          const alloc = self.get_allocation();
          if (alloc) {
            setParentWidth(alloc.width);
          }
        });

        const checkWidth = () => {
          const alloc = self.get_allocation();
          if (alloc && alloc.width > 0 && alloc.width !== parentWidth.get()) {
            setParentWidth(alloc.width);
          }
          return true;
        };

        const timeoutId = GLib.timeout_add(
          GLib.PRIORITY_DEFAULT,
          100,
          checkWidth,
        );

        self.connect("destroy", () => {
          if (timeoutId) {
            GLib.source_remove(timeoutId);
          }
        });

        self.add_controller(controller);
        checkWidth();
      }}
    >
      <Picture
        class="img"
        height={height}
        file={createBinding(player, "coverArt")}
        width={width}
      />

      <box
        $type="overlay"
        orientation={Gtk.Orientation.VERTICAL}
        valign={Gtk.Align.END}
      >
        {bottomBar}
      </box>
    </overlay>
  );
};
