import { initBatteriePanel } from "./BatteriePanel";
import { ExtensionContext } from "@foxglove/extension";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Batterie",
    initPanel: initBatteriePanel,
  });
}