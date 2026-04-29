import { ExtensionContext } from "@foxglove/extension";
import { initPanel } from "./WaymoDashboardPanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "UTAC Dashboard",
    initPanel,
  });
}

