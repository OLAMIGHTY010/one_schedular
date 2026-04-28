import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import ToasterProvider from "./components/ToasterProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToasterProvider />
    <App />
  </StrictMode>
);