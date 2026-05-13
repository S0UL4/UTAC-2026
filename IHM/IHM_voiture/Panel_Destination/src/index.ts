import { ExtensionContext } from "@foxglove/extension";
<<<<<<< Updated upstream
import { createRoot } from "react-dom/client";
import React from "react";
import DestinationPanel from "./DestinationPanel";
=======
import { initDestinationPanel } from "./DestinationPanel";
>>>>>>> Stashed changes

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Destination",
<<<<<<< Updated upstream
    initPanel: (context) => {
      const div = document.createElement("div");
      div.style.width  = "100%";
      div.style.height = "100%";
      context.panelElement.appendChild(div);
      const root = createRoot(div);
      root.render(React.createElement(DestinationPanel, { context }));
      return () => root.unmount();
    },
=======
    initPanel: initDestinationPanel,
>>>>>>> Stashed changes
  });
}
