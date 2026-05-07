import { ExtensionContext } from "@foxglove/extension";
import VitessePanel from "./VitessePanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Vitesse",
    initPanel: (context) => {
      const div = document.createElement("div");
      div.style.height = "100%";
      context.panelElement.appendChild(div);
      const React = require("react");
      const ReactDOM = require("react-dom");
      ReactDOM.render(React.createElement(VitessePanel, { context }), div);
    },
  });
}
