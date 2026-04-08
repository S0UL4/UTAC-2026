import { PanelExtensionContext } from "@foxglove/extension";

export function initVehiclePanel(context: PanelExtensionContext): () => void {
  const root = context.panelElement;
  root.style.padding = "16px";
  root.style.fontFamily = "Arial, sans-serif";
  root.style.background = "#f7f7f7";

  const title = document.createElement("h2");
  title.textContent = "Vehicle Supervision Panel";

  const text = document.createElement("p");
  text.textContent = "Foxglove custom panel is working.";

  root.appendChild(title);
  root.appendChild(text);

  context.onRender = (_, done) => {
    done();
  };

  return () => {
    root.innerHTML = "";
  };
}