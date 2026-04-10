import { ExtensionContext } from "@foxglove/studio";
import ReactDOM from "react-dom/client";
import React from "react";
import { PcMapPanel } from "./ExamplePanel";

export function activate(extensionContext: ExtensionContext) {
  extensionContext.registerPanel({
    name: "Localisation PC",
    initPanel: (context) => {
      const root = ReactDOM.createRoot(context.panelElement);
      root.render(React.createElement(PcMapPanel, { context }));
    },
  });
}