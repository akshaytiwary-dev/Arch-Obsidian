import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";
import { notify } from "../../../utils/notification";
import {
  globalSettings,
  setGlobalSetting,
} from "../../../variables";
import { refreshCss } from "../../../utils/scss";
import { defaultSettings } from "../../../constants/settings.constants";

const hyprCustomDir: string = "$HOME/.config/hypr/configs/custom";

const applyHyprlandSetting = (fullKey: string, value: any) => {
  execAsync(
    `bash -c "echo -e '${fullKey} = ${value}' > ${hyprCustomDir}/${fullKey}.conf && hyprctl keyword ${fullKey} ${value}"`,
  ).catch((err) => notify(err));
};

const updateValue = (
  settingPath: string,
  newValue: number,
  hyprlandKey?: string,
  extra?: () => void,
) => {
  setGlobalSetting(settingPath, newValue);
  if (hyprlandKey) {
    applyHyprlandSetting(hyprlandKey, newValue);
  }
  if (extra) extra();
};

export default () => {
  const waybarOpacity = globalSettings.peek().ui.opacity.value;
  const appsOpacity = globalSettings.peek().hyprland.decoration.active_opacity.value;
  const rounding = globalSettings.peek().hyprland.decoration.rounding.value;
  const gapsOut = globalSettings.peek().hyprland.general.gaps_out.value;
  const scale = globalSettings.peek().ui.scale.value;
  const fontSize = globalSettings.peek().ui.fontSize.value;

  const resets: (() => void)[] = [];

  const SliderRow = ({
    label,
    initialValue,
    defaultValue,
    min,
    max,
    step,
    onChange,
  }: {
    label: string;
    initialValue: number;
    defaultValue: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
  }) => {
    const infoLabel = (<label label={initialValue.toFixed(initialValue >= 1 ? 0 : 2)} />) as Gtk.Label;
    const sliderWidget = (
      <slider
        widthRequest={200}
        drawValue={false}
        min={min}
        max={max}
        value={initialValue}
        step={step}
        onValueChanged={(self) => {
          const val = self.get_value();
          const normalized = step < 1 ? Number(val.toFixed(2)) : Math.round(val);
          infoLabel.label = normalized.toFixed(normalized >= 1 ? 0 : 2);
          onChange(normalized);
        }}
      />
    ) as any;

    resets.push(() => {
      sliderWidget.set_value(defaultValue);
    });

    return (
      <box class="setting" spacing={5}>
        <label hexpand xalign={0} label={label} />
        {sliderWidget}
        {infoLabel}
      </box>
    );
  };

  return (
    <scrolledwindow vexpand>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={16} class="appearance">
        <box class="category" orientation={Gtk.Orientation.VERTICAL} spacing={16}>
          <label label={"Appearance"} halign={Gtk.Align.START} />
          
          {SliderRow({
            label: "Waybar opacity",
            min: 0,
            max: 1,
            step: 0.05,
            initialValue: waybarOpacity,
            defaultValue: defaultSettings.ui.opacity.value,
            onChange: (value) => updateValue("ui.opacity.value", value, undefined, refreshCss)
          })}
          
          {SliderRow({
            label: "App opacity (active)",
            min: 0,
            max: 1,
            step: 0.05,
            initialValue: appsOpacity,
            defaultValue: defaultSettings.hyprland.decoration.active_opacity.value,
            onChange: (value) => updateValue(
              "hyprland.decoration.active_opacity.value",
              value,
              "decoration:active_opacity"
            )
          })}

          {SliderRow({
            label: "Window corner roundness",
            min: 0,
            max: 40,
            step: 1,
            initialValue: rounding,
            defaultValue: defaultSettings.hyprland.decoration.rounding.value,
            onChange: (value) => updateValue(
              "hyprland.decoration.rounding.value",
              value,
              "decoration:rounding"
            )
          })}

          {SliderRow({
            label: "Workspace gap spacing",
            min: 0,
            max: 40,
            step: 1,
            initialValue: gapsOut,
            defaultValue: defaultSettings.hyprland.general.gaps_out.value,
            onChange: (value) => updateValue(
              "hyprland.general.gaps_out.value",
              value,
              "general:gaps_out"
            )
          })}

          {SliderRow({
            label: "UI Scale",
            min: 10,
            max: 30,
            step: 1,
            initialValue: scale,
            defaultValue: defaultSettings.ui.scale.value,
            onChange: (value) => updateValue("ui.scale.value", value, undefined, refreshCss)
          })}

          {SliderRow({
            label: "Font Size",
            min: 10,
            max: 30,
            step: 1,
            initialValue: fontSize,
            defaultValue: defaultSettings.ui.fontSize.value,
            onChange: (value) => updateValue("ui.fontSize.value", value, undefined, refreshCss)
          })}

          <button
            class="reset-button"
            label="Reset to Default"
            halign={Gtk.Align.END}
            onClicked={() => {
              resets.forEach(reset => reset());
            }}
          />
        </box>
      </box>
    </scrolledwindow>
  );
};

