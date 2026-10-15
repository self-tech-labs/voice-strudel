// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Elliot Vaucher and voice-strudel contributors

import { execFileSync } from "node:child_process";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendPort = env.PORT || "8787";
  const sourceRepositoryUrl = (
    env.SOURCE_REPOSITORY_URL || "https://github.com/self-tech-labs/voice-strudel"
  ).replace(/\/+$/, "");
  let sourceUrl = sourceRepositoryUrl;

  if (command === "build") {
    const revision =
      env.SOURCE_REVISION ||
      env.VERCEL_GIT_COMMIT_SHA ||
      execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (!/^[a-f\d]{40}$/i.test(revision)) {
      throw new Error("SOURCE_REVISION must be the full public Git commit SHA for this build.");
    }
    sourceUrl = `${sourceRepositoryUrl}/tree/${revision}`;
  }

  return {
    plugins: [react()],
    define: {
      __SOURCE_URL__: JSON.stringify(sourceUrl),
    },
    build: {
      license: { fileName: "THIRD_PARTY_LICENSES.txt" },
      rolldownOptions: {
        output: {
          postBanner: "/*! voice-strudel: AGPL-3.0-or-later. Dependency licenses: /THIRD_PARTY_LICENSES.txt. */",
        },
      },
    },
    server: {
      proxy: {
        "/session": {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
