import { WidgetSelector } from "./widgetSelector.interface";
import { Api } from "./api.interface";

export interface AGSSetting {
  name: string;
  value: any;
  type: "int" | "float" | "string" | "bool" | "select";
  min: number;
  max: number;
  tooltip?: string;
}

export interface Settings {
  dateFormat: string;
  hyprsunset: {
    kelvin: number;
  };
  hyprland: {
    general: {
      border_size: AGSSetting;
      gaps_in: AGSSetting;
      gaps_out: AGSSetting;
    };
    decoration: {
      rounding: AGSSetting;
      active_opacity: AGSSetting;
      inactive_opacity: AGSSetting;
      blur: {
        enabled: AGSSetting;
        size: AGSSetting;
        passes: AGSSetting;
        xray?: AGSSetting;
      };
      shadow: {
        enabled: AGSSetting;
        range: AGSSetting;
        render_power: AGSSetting;
      };
    };
  };
  notifications: {
    dnd: boolean;
  };
  ui: {
    opacity: AGSSetting;
    scale: AGSSetting;
    fontSize: AGSSetting;
  };
  alwaysOnWidget: {
    visibility: AGSSetting;
  };
  autoWorkspaceSwitching: AGSSetting;
  dynamicThemeColors: AGSSetting;
  dynamicThemeVariants: AGSSetting;
  bar: {
    lock: boolean;
    orientation: AGSSetting;
    layout: WidgetSelector[];
  };
  waifuWidget: {
    visibility: boolean;
  };
  rightPanel: {
    exclusivity: boolean;
    width: number;
    widgets: WidgetSelector[];
    lock: boolean;
  };
  leftPanel: {
    exclusivity: boolean;
    width: number;
    lock: boolean;
    widget: WidgetSelector;
  };
  crypto: {
    favorite: {
      symbol: string;
      timeframe: string;
    };
  };
  fileManager: string;
  keyStrokeVisualizer: {
    visibility: AGSSetting;
    anchor: AGSSetting;
  };
  wallpaperSwitcher: {
    category: string;
  };
  apiKeys: {
    openrouter: {
      user: AGSSetting;
      key: AGSSetting;
    };
  };
}
