import { initControlesPanel } from "./ControlesPanel";
import { ExtensionContext } from "@foxglove/extension";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Controles Vehicule",
    initPanel: initControlesPanel,
  });
}
