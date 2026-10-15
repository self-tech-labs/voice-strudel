// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Elliot Vaucher and voice-strudel contributors

import { evaluate, hush, initStrudel, samples } from "@strudel/web";

let initPromise: Promise<void> | null = null;

export function initStrudelRuntime() {
  if (!initPromise) {
    initPromise = initStrudel({
      prebake: () => samples("github:tidalcycles/dirt-samples"),
    }).then(() => undefined);
  }

  return initPromise;
}

export async function evaluateStrudel(code: string) {
  await initStrudelRuntime();
  const pattern = await evaluate(code);

  if (!pattern) {
    throw new Error("Strudel did not return a playable pattern. Check the generated code.");
  }
}

export function stopStrudel() {
  try {
    hush();
  } catch {
    // hush() only works after initStrudel has created the runtime.
  }
}
