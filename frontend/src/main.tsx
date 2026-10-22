import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { CheckoutApp } from "./components/checkout-app";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CheckoutApp />
  </StrictMode>,
);
