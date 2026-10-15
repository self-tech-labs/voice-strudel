// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Elliot Vaucher and voice-strudel contributors

import { Composition } from "remotion";
import { VoiceStrudelDemo } from "./VoiceStrudelDemo";

export function RemotionRoot() {
  return (
    <Composition
      id="VoiceStrudelDemo"
      component={VoiceStrudelDemo}
      durationInFrames={480}
      fps={30}
      width={1280}
      height={720}
    />
  );
}
