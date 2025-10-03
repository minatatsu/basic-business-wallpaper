import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { LoadingProvider } from "./context/LoadingContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <LoadingProvider>
    <App />
  </LoadingProvider>,
);
