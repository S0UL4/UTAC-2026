
import { ExtensionContext } from "@foxglove/extension";

import { initStopPanel } from "./StopPanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({ name: "Panel Stop", initPanel: initStopPanel });
}
