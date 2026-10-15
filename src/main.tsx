// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Elliot Vaucher and voice-strudel contributors

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
