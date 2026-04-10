import { ExtensionContext, PanelExtensionContext } from "@foxglove/studio";
import ReactDOM from "react-dom/client";
import React from "react";
import { ControlPanel } from "./ControlPanel";

export function activate(extensionContext: ExtensionContext) {
  extensionContext.registerPanel({
    name: "Centre de Contrôle Flotte",
    initPanel: (context: PanelExtensionContext) => {
      const root = ReactDOM.createRoot(context.panelElement);
      root.render(React.createElement(ControlPanel, { context }));
    },
  });
}