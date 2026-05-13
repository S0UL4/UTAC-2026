import { ExtensionContext } from "@foxglove/extension";
import { initDestinationPanel } from "./DestinationPanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Destination",
    initPanel: initDestinationPanel,
  });
}
