import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import "./styles.css";

function installBuilderSelectionGuard() {
  document.addEventListener(
    "selectionchange",
    (event) => {
      event.stopImmediatePropagation();
    },
    { capture: true },
  );
}

installBuilderSelectionGuard();

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing #root container");
}

const router = getRouter();

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

window.setTimeout(() => {
  const loader = document.getElementById("app-loading");
  if (!loader) return;
  loader.style.opacity = "0";
  window.setTimeout(() => loader.remove(), 180);
}, 250);
