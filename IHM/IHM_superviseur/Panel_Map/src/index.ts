import { ExtensionContext } from "@foxglove/extension";
import { initVehiclePanel } from "./VehiclePanel";

export function activate(extensionContext: ExtensionContext) {
  extensionContext.registerPanel({
    name: "Vehicle Supervision Panel",
    initPanel: initVehiclePanel,
  });
}