import { createRoot } from "react-dom/client";
import App from "./App.tsx";

document.querySelectorAll('head [data-rh="true"]').forEach((el) => el.remove());
createRoot(document.getElementById("root")!).render(<App />);
