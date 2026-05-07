import { ExtensionContext } from "@foxglove/extension";
import { createRoot } from "react-dom/client";
import React from "react";
import VitessePanel from "./VitessePanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Vitesse",
    initPanel: (context) => {
      const div = document.createElement("div");
      div.style.width  = "100%";
      div.style.height = "100%";
      context.panelElement.appendChild(div);
      const root = createRoot(div);
      root.render(React.createElement(VitessePanel, { context }));
      return () => root.unmount();
    },
  });
}