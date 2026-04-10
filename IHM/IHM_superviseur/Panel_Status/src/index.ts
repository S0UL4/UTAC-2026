import { ExtensionContext } from "@foxglove/extension";
import { initVehicleStatusPanel } from "./VehicleStatusPanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "vehicle-status",
    initPanel: initVehicleStatusPanel,
  });
}