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
