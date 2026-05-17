import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const starterCode = `setcpm(124 / 4)
stack(
  s("bd*4").gain(0.95),
  s("~ hh ~ hh").gain(0.38).hpf(6000),
  s("~ ~ sd ~").room(0.35).delay(0.2),
  note("c2 ~ eb2 g1").sound("sawtooth")
)`;

const acidCode = `setcpm(132 / 4)
stack(
  s("bd*4").gain(0.98),
  s("~ cp ~ cp").room(0.22),
  s("hh*8").gain(0.28).hpf(7000),
  note("c2 eb2 g2 bb1").sound("sawtooth")
    .cutoff("500 1200 650 1500").resonance(14)
)`;

const instruction = "make it faster and more acid";

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

function fade(frame: number, start: number, duration = 18) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
}

function slide(frame: number, start: number, distance = 20) {
  const value = fade(frame, start);
  return distance - value * distance;
}

function AppFrame() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const selected = frame >= 52 ? "Acid Line" : "Dubby Pulse";
  const typedLength = Math.floor(interpolate(frame, [2.9 * fps, 5.2 * fps], [0, instruction.length], clamp));
  const typedText = instruction.slice(0, typedLength);
  const isThinking = frame >= 172 && frame < 226;
  const hasProposal = frame >= 226 && frame < 326;
  const hasApplied = frame >= 326;
  const status = isThinking ? "thinking" : hasProposal ? "proposal" : hasApplied ? "playing" : "ready";
  const code = hasApplied ? acidCode : starterCode;

  const proposalOpacity = hasProposal ? fade(frame, 226, 16) : hasApplied ? 0 : 0;
  const appliedOpacity = fade(frame, 326, 16);
  const cursorOpacity = Math.round(frame / 12) % 2 ? 0.25 : 1;

  return (
    <div style={styles.appShell}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.appTitle}>voice-strudel</div>
          <div style={styles.appSubhead}>Realtime voice to Strudel pattern</div>
        </div>
        <div style={{ ...styles.status, ...statusStyles[status] }}>{status}</div>
      </div>

      <div style={styles.starterGrid}>
        {["Dubby Pulse", "Acid Line", "Broken Breaks", "Minor Drift"].map((name, index) => {
          const active = selected === name;

          return (
            <div key={name} style={{ ...styles.starterCard, ...(active ? styles.starterCardActive : null) }}>
              <div style={styles.cardGenre}>{["Dub techno", "Acid house", "Jungle", "Ambient"][index]}</div>
              <div style={styles.cardName}>{name}</div>
              <div style={styles.cardText}>
                {index === 1
                  ? "Squelchy bass, tight drums, resonant motion."
                  : "A small starter groove for quick experiments."}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.transport}>
        <Control label="Play" active={frame >= 30 && frame < 54} />
        <Control label="Stop" />
        <Control label="Record" />
      </div>

      {isThinking ? (
        <div style={{ ...styles.processing, opacity: fade(frame, 172, 12), transform: `translateY(${slide(frame, 172)}px)` }}>
          <div style={styles.pulse}>
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                style={{
                  ...styles.pulseBar,
                  height: 12 + ((frame + index * 6) % 24),
                }}
              />
            ))}
          </div>
          <div>
            <div style={styles.panelTitle}>Processing typed demo input</div>
            <div style={styles.panelText}>The normal app listens through the microphone.</div>
          </div>
        </div>
      ) : null}

      <div style={styles.typedRow}>
        <div style={styles.input}>
          {typedText}
          {frame >= 86 && frame < 160 ? <span style={{ opacity: cursorOpacity }}>|</span> : null}
        </div>
        <div style={{ ...styles.sendButton, ...(frame >= 160 && frame < 178 ? styles.sendActive : null) }}>Send</div>
      </div>

      <div style={styles.feedbackSlot}>
        {hasProposal ? (
          <div
            style={{
              ...styles.proposal,
              opacity: proposalOpacity,
              transform: `translateY(${(1 - proposalOpacity) * 18}px)`,
            }}
          >
            <div style={styles.panelTitle}>Proposed change</div>
            <div style={styles.heard}>Heard: {instruction}</div>
            <div style={styles.panelText}>Raise the tempo and swap in a resonant acid bassline.</div>
            <div style={styles.proposalActions}>
              <div style={{ ...styles.applyButton, ...(frame >= 302 ? styles.applyActive : null) }}>Implement change</div>
              <div style={styles.refuseButton}>Refuse</div>
            </div>
          </div>
        ) : null}
        {hasApplied ? (
          <div
            style={{
              ...styles.notice,
              opacity: appliedOpacity,
              transform: `translateY(${(1 - appliedOpacity) * 18}px)`,
            }}
          >
            proposal applied - the browser is playing the new Strudel pattern
          </div>
        ) : null}
      </div>

      <div style={styles.codePanel}>
        <div style={styles.summary}>{hasApplied ? "Faster acid bassline applied." : `${selected} selected.`}</div>
        <pre style={styles.code}>{code}</pre>
      </div>
    </div>
  );
}

function Control({ label, active = false }: { label: string; active?: boolean }) {
  return <div style={{ ...styles.control, ...(active ? styles.controlActive : null) }}>{label}</div>;
}

function Caption({ children, start }: { children: ReactNode; start: number }) {
  const frame = useCurrentFrame();
  const opacity = fade(frame, start, 18);

  return (
    <div
      style={{
        ...styles.caption,
        opacity,
        transform: `translateY(${(1 - opacity) * 16}px)`,
      }}
    >
      {children}
    </div>
  );
}

export function VoiceStrudelDemo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appScale = spring({
    frame,
    fps,
    config: {
      damping: 28,
      stiffness: 70,
      mass: 0.7,
    },
  });
  const progress = interpolate(frame, [0, 480], [0, 1], clamp);

  return (
    <AbsoluteFill style={styles.stage}>
      <div style={styles.paperGrid} />
      <div style={styles.videoChrome}>
        <div style={styles.videoHeader}>
          <div style={styles.brandDot} />
          <div>
            <div style={styles.videoTitle}>tiny demo: typed input route</div>
            <div style={styles.videoMeta}>normal use is voice - this render makes the flow visible</div>
          </div>
        </div>
        <div
          style={{
            ...styles.appWrap,
            opacity: fade(frame, 12),
            transform: `scale(${0.965 + appScale * 0.035})`,
          }}
        >
          <AppFrame />
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressBar, transform: `scaleX(${progress})` }} />
        </div>
      </div>
      <Caption start={28}>Pick a starter groove.</Caption>
      <Caption start={88}>Type the instruction here because this video has no microphone.</Caption>
      <Caption start={178}>The Realtime tool proposes full Strudel code first.</Caption>
      <Caption start={304}>Normal users approve a voice-made change before it plays.</Caption>
    </AbsoluteFill>
  );
}

const statusStyles: Record<string, CSSProperties> = {
  ready: { borderColor: "#86a86a", color: "#286423", background: "#eff8df" },
  thinking: { borderColor: "#d9ab24", color: "#7a5300", background: "#fff2bb" },
  proposal: { borderColor: "#d9ab24", color: "#7a5300", background: "#fff2bb" },
  playing: { borderColor: "#86a86a", color: "#286423", background: "#eff8df" },
};

const styles = {
  stage: {
    background: "#f4f0dd",
    color: "#12120f",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    overflow: "hidden",
  },
  paperGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(18,18,15,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(18,18,15,0.045) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },
  videoChrome: {
    position: "absolute",
    left: 70,
    right: 70,
    top: 54,
    bottom: 54,
    border: "2px solid #12120f",
    borderRadius: 8,
    background: "#fbf8e9",
    boxShadow: "12px 12px 0 #12120f",
    overflow: "hidden",
  },
  videoHeader: {
    height: 78,
    display: "flex",
    alignItems: "center",
    gap: 16,
    borderBottom: "2px solid #12120f",
    padding: "0 28px",
  },
  brandDot: {
    width: 34,
    height: 34,
    border: "2px solid #12120f",
    borderRadius: 8,
    background: "#ef5148",
    boxShadow: "6px 0 0 #f3c744, 12px 0 0 #68a9e8",
  },
  videoTitle: {
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 760,
    letterSpacing: 0,
  },
  videoMeta: {
    marginTop: 4,
    color: "#676458",
    fontFamily: "'SFMono-Regular', Consolas, monospace",
    fontSize: 14,
    lineHeight: 1.25,
  },
  appWrap: {
    position: "absolute",
    left: 36,
    top: 102,
    width: 810,
    height: 476,
    transformOrigin: "center",
  },
  appShell: {
    width: "100%",
    height: "100%",
    border: "2px solid #12120f",
    borderRadius: 8,
    background: "#11110f",
    color: "#f4f0dd",
    padding: 18,
    overflow: "hidden",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #383832",
    paddingBottom: 14,
  },
  appTitle: {
    fontSize: 29,
    lineHeight: 1,
    fontWeight: 760,
    letterSpacing: 0,
  },
  appSubhead: {
    marginTop: 6,
    color: "#aaa99c",
    fontSize: 14,
  },
  status: {
    minWidth: 96,
    border: "1px solid #383832",
    borderRadius: 999,
    padding: "8px 12px",
    textAlign: "center",
    fontSize: 14,
    fontFamily: "'SFMono-Regular', Consolas, monospace",
  },
  starterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
    marginTop: 14,
  },
  starterCard: {
    minHeight: 96,
    border: "1px solid #30302a",
    borderRadius: 7,
    background: "#171714",
    padding: 10,
  },
  starterCardActive: {
    borderColor: "#f3c744",
    background: "#211f13",
    boxShadow: "inset 0 0 0 1px #f3c744",
  },
  cardGenre: {
    color: "#f3c744",
    fontFamily: "'SFMono-Regular', Consolas, monospace",
    fontSize: 10,
  },
  cardName: {
    marginTop: 7,
    fontWeight: 750,
    fontSize: 14,
  },
  cardText: {
    marginTop: 5,
    color: "#bdb9a8",
    fontSize: 11,
    lineHeight: 1.3,
  },
  transport: {
    display: "flex",
    gap: 10,
    marginTop: 14,
  },
  control: {
    minWidth: 78,
    height: 34,
    display: "grid",
    placeItems: "center",
    border: "1px solid #4b4b45",
    borderRadius: 6,
    background: "#eeeedf",
    color: "#11110f",
    fontSize: 13,
    fontWeight: 720,
  },
  controlActive: {
    background: "#f3c744",
  },
  processing: {
    position: "absolute",
    left: 18,
    right: 18,
    top: 242,
    display: "flex",
    alignItems: "center",
    gap: 14,
    border: "1px solid #6c5b2b",
    borderRadius: 8,
    background: "#171714",
    padding: 12,
  },
  pulse: {
    width: 54,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  pulseBar: {
    width: 8,
    borderRadius: 999,
    background: "#f3c744",
  },
  typedRow: {
    display: "flex",
    gap: 10,
    marginTop: 14,
  },
  input: {
    flex: 1,
    height: 36,
    border: "1px solid #383832",
    borderRadius: 6,
    background: "#1a1a17",
    color: "#f4f0dd",
    padding: "9px 11px",
    fontSize: 13,
  },
  sendButton: {
    width: 78,
    height: 36,
    display: "grid",
    placeItems: "center",
    border: "1px solid #4b4b45",
    borderRadius: 6,
    background: "#eeeedf",
    color: "#11110f",
    fontSize: 13,
    fontWeight: 720,
  },
  sendActive: {
    background: "#ef5148",
    color: "#fff9ed",
  },
  feedbackSlot: {
    position: "relative",
    height: 91,
    marginTop: 12,
  },
  proposal: {
    position: "absolute",
    inset: 0,
    border: "1px solid #30302a",
    borderRadius: 8,
    background: "#171714",
    padding: 12,
  },
  notice: {
    position: "absolute",
    inset: "16px 0 auto 0",
    border: "1px solid #86a86a",
    borderRadius: 8,
    background: "#eff8df",
    color: "#286423",
    padding: 13,
    fontSize: 14,
    fontWeight: 680,
  },
  panelTitle: {
    fontWeight: 760,
    fontSize: 14,
  },
  panelText: {
    marginTop: 4,
    color: "#d7d6cb",
    fontSize: 13,
    lineHeight: 1.35,
  },
  heard: {
    marginTop: 5,
    color: "#aaa99c",
    fontSize: 12,
    fontFamily: "'SFMono-Regular', Consolas, monospace",
  },
  proposalActions: {
    display: "flex",
    gap: 8,
    marginTop: 9,
  },
  applyButton: {
    height: 28,
    display: "grid",
    placeItems: "center",
    border: "1px solid #4b4b45",
    borderRadius: 6,
    background: "#eeeedf",
    color: "#11110f",
    padding: "0 10px",
    fontSize: 11,
    fontWeight: 740,
  },
  applyActive: {
    background: "#86a86a",
  },
  refuseButton: {
    height: 28,
    display: "grid",
    placeItems: "center",
    border: "1px solid #4b4b45",
    borderRadius: 6,
    background: "#24241f",
    color: "#f4f0dd",
    padding: "0 10px",
    fontSize: 11,
  },
  codePanel: {
    height: 146,
    border: "1px solid #30302a",
    borderRadius: 8,
    overflow: "hidden",
  },
  summary: {
    borderBottom: "1px solid #30302a",
    color: "#d7d6cb",
    padding: "9px 12px",
    fontSize: 12,
  },
  code: {
    margin: 0,
    padding: 11,
    color: "#efeee4",
    fontFamily: "'SFMono-Regular', Consolas, monospace",
    fontSize: 10,
    lineHeight: 1.42,
    whiteSpace: "pre-wrap",
  },
  progressTrack: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 30,
    height: 10,
    border: "2px solid #12120f",
    borderRadius: 999,
    overflow: "hidden",
    background: "#f4f0dd",
  },
  progressBar: {
    width: "100%",
    height: "100%",
    background: "#ef5148",
    transformOrigin: "left center",
  },
  caption: {
    position: "absolute",
    right: 94,
    top: 204,
    width: 282,
    border: "2px solid #12120f",
    borderRadius: 8,
    background: "#f3c744",
    boxShadow: "8px 8px 0 #12120f",
    padding: "18px 20px",
    fontSize: 29,
    lineHeight: 1.03,
    fontWeight: 790,
    letterSpacing: 0,
  },
} satisfies Record<string, CSSProperties>;
