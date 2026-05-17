import { useCallback, useEffect, useRef, useState } from "react";
import { evaluateStrudel, initStrudelRuntime, stopStrudel } from "./strudelRuntime";

type Status = "idle" | "connecting" | "ready" | "recording" | "thinking" | "proposal" | "playing" | "error";

type RealtimeEvent = {
  type?: string;
  [key: string]: unknown;
};

type ToolCall = {
  call_id?: string;
  name?: string;
  arguments?: string;
};

type StrudelToolArgs = {
  intent: "musical_instruction" | "random";
  intended_modification: string;
  code: string;
  user_query: string;
  confidence: number;
};

type PendingProposal = {
  callId?: string;
  code: string;
  confidence: number;
  intendedModification: string;
  userQuery: string;
};

type StarterTrack = {
  id: string;
  name: string;
  genre: string;
  description: string;
  code: string;
};

const starterTracks: StarterTrack[] = [
  {
    id: "dub-techno",
    name: "Dubby Pulse",
    genre: "Dub techno",
    description: "Four-on-the-floor kick, offbeat hats, echoing snare, dark filtered bass.",
    code: `setcpm(124 / 4)
stack(
  s("bd*4").gain(0.95),
  s("~ hh ~ hh").gain(0.38).hpf(6000),
  s("~ ~ sd ~").room(0.35).delay(0.2).delaytime(0.25).delayfeedback(0.35),
  note("c2 ~ eb2 g1").sound("sawtooth").cutoff(650).resonance(8).gain(0.45)
)`,
  },
  {
    id: "acid-house",
    name: "Acid Line",
    genre: "Acid house",
    description: "Tight 128 BPM drums with a resonant squelchy bass pattern.",
    code: `setcpm(128 / 4)
stack(
  s("bd*4").gain(0.95),
  s("~ cp ~ cp").gain(0.42).room(0.18),
  s("hh*8").gain(0.24).hpf(7000),
  note("c2 eb2 g2 bb1").sound("sawtooth").cutoff("500 900 650 1200").resonance(12).decay(0.18).gain(0.48)
)`,
  },
  {
    id: "broken-jungle",
    name: "Broken Breaks",
    genre: "Jungle",
    description: "Fast broken drums, sub notes, and bright shuffled hats.",
    code: `setcpm(164 / 4)
stack(
  s("bd ~ [~ bd] ~").gain(0.9),
  s("~ sd ~ [sd ~]").gain(0.55).room(0.2),
  s("[hh hh] ~ hh [~ hh]").gain(0.25).hpf(6500),
  note("c1 ~ c1 eb1").sound("sine").gain(0.55)
)`,
  },
  {
    id: "ambient-minor",
    name: "Minor Drift",
    genre: "Ambient",
    description: "Slow minor tones, soft pulses, delay, and a muted low drone.",
    code: `setcpm(82 / 4)
stack(
  note("c3 eb3 g3 bb3").sound("sawtooth").slow(4).cutoff(900).room(0.65).delay(0.35).gain(0.32),
  note("c1 ~ ~ g1").sound("sine").gain(0.35),
  s("~ rim ~ ~").gain(0.22).room(0.7).delay(0.4)
)`,
  },
];

const defaultStarter = starterTracks[0];

const starterCode = defaultStarter.code;

function parseToolArgs(value: string): StrudelToolArgs {
  const parsed = JSON.parse(value) as Partial<StrudelToolArgs>;

  if (parsed.intent !== "musical_instruction" && parsed.intent !== "random") {
    throw new Error("Tool call did not include a valid intent.");
  }

  if (typeof parsed.intended_modification !== "string") {
    throw new Error("Tool call did not include an intended modification.");
  }

  if (typeof parsed.code !== "string") {
    throw new Error("Tool call did not include a code field.");
  }

  if (parsed.intent === "musical_instruction" && !parsed.code.trim()) {
    throw new Error("Musical instruction did not include Strudel code.");
  }

  return {
    intent: parsed.intent,
    intended_modification: parsed.intended_modification.trim(),
    code: parsed.code.trim(),
    user_query: typeof parsed.user_query === "string" ? parsed.user_query.trim() : "",
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
  };
}

function getResponseToolCalls(event: RealtimeEvent): ToolCall[] {
  const response = event.response;
  if (!response || typeof response !== "object" || !("output" in response)) {
    return [];
  }

  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return [];
  }

  return output.filter((item): item is ToolCall => {
    return Boolean(
      item &&
        typeof item === "object" &&
        (item as { type?: unknown }).type === "function_call" &&
        typeof (item as ToolCall).arguments === "string",
    );
  });
}

function eventLabel(event: RealtimeEvent) {
  if (typeof event.type !== "string") {
    return "unknown event";
  }

  if (event.type === "response.function_call_arguments.done") {
    return `route: ${String(event.name ?? "unknown")}`;
  }

  if (event.type === "conversation.item.input_audio_transcription.completed") {
    return `heard: ${String(event.transcript ?? "")}`;
  }

  return event.type;
}

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [lastCode, setLastCode] = useState(starterCode);
  const [lastSummary, setLastSummary] = useState(`${defaultStarter.name} selected.`);
  const [selectedStarterId, setSelectedStarterId] = useState(defaultStarter.id);
  const [typedInstruction, setTypedInstruction] = useState("");
  const [pendingProposal, setPendingProposal] = useState<PendingProposal | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micTrackRef = useRef<MediaStreamTrack | null>(null);
  const connectionPromiseRef = useRef<Promise<void> | null>(null);
  const handledCallIds = useRef(new Set<string>());

  const logEvent = useCallback((label: string) => {
    setEvents((current) => [label, ...current].slice(0, 8));
  }, []);

  const sendRealtimeEvent = useCallback((event: Record<string, unknown>) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") {
      throw new Error("Realtime data channel is not open.");
    }

    dc.send(
      JSON.stringify({
        event_id: crypto.randomUUID(),
        ...event,
      }),
    );
  }, []);

  const sendToolResult = useCallback(
    (callId: string | undefined, result: Record<string, unknown>) => {
      if (!callId || !dcRef.current || dcRef.current.readyState !== "open") {
        return;
      }

      sendRealtimeEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify(result),
        },
      });
    },
    [sendRealtimeEvent],
  );

  const runToolCall = useCallback(
    async (call: ToolCall) => {
      if (call.name !== "set_strudel_pattern" || typeof call.arguments !== "string") {
        return;
      }

      const callId = call.call_id ?? call.arguments;
      if (handledCallIds.current.has(callId)) {
        return;
      }
      handledCallIds.current.add(callId);

      try {
        const args = parseToolArgs(call.arguments);

        if (args.intent === "random") {
          setPendingProposal(null);
          setNotice(args.intended_modification || "No musical instruction detected.");
          setStatus("ready");
          logEvent("ignored: not a musical instruction");
          sendToolResult(call.call_id, {
            ok: true,
            route: "random",
            message: args.intended_modification,
          });
          return;
        }

        setNotice(null);
        setPendingProposal({
          callId: call.call_id,
          code: args.code,
          confidence: args.confidence,
          intendedModification: args.intended_modification,
          userQuery: args.user_query,
        });
        setStatus("proposal");
        logEvent(`proposal: ${args.intended_modification}`);
      } catch (toolError) {
        const message = toolError instanceof Error ? toolError.message : String(toolError);
        setStatus("error");
        setError(message);
        logEvent(`tool error: ${message}`);
        sendToolResult(call.call_id, { ok: false, error: message });
      }
    },
    [logEvent, sendToolResult],
  );

  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      logEvent(eventLabel(event));

      switch (event.type) {
        case "session.created":
        case "session.updated":
          setStatus((current) => (current === "connecting" ? "ready" : current));
          break;
        case "input_audio_buffer.speech_started":
          setStatus("recording");
          break;
        case "input_audio_buffer.speech_stopped":
          if (micTrackRef.current) {
            micTrackRef.current.enabled = false;
          }
          setStatus("thinking");
          break;
        case "response.created":
          setStatus("thinking");
          break;
        case "response.function_call_arguments.done":
          void runToolCall({
            call_id: typeof event.call_id === "string" ? event.call_id : undefined,
            name: typeof event.name === "string" ? event.name : undefined,
            arguments: typeof event.arguments === "string" ? event.arguments : undefined,
          });
          break;
        case "response.done":
          for (const call of getResponseToolCalls(event)) {
            void runToolCall(call);
          }
          break;
        case "error":
          setStatus("error");
          setError(JSON.stringify(event.error ?? event));
          break;
      }
    },
    [logEvent, runToolCall],
  );

  const disconnect = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    dcRef.current = null;
    pcRef.current = null;
    streamRef.current = null;
    micTrackRef.current = null;
    connectionPromiseRef.current = null;
    setPendingProposal(null);
    setStatus("idle");
    logEvent("session closed");
  }, [logEvent]);

  const ensureRealtimeSession = useCallback(async () => {
    if (dcRef.current?.readyState === "open" && pcRef.current?.connectionState === "connected") {
      return;
    }

    if (connectionPromiseRef.current) {
      return connectionPromiseRef.current;
    }

    connectionPromiseRef.current = (async () => {
      setError(null);
      setNotice(null);
      setStatus("connecting");
      handledCallIds.current.clear();

      await initStrudelRuntime();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const pc = new RTCPeerConnection();
      const dc = pc.createDataChannel("oai-events");
      const [micTrack] = stream.getAudioTracks();

      if (!micTrack) {
        throw new Error("No microphone audio track was created.");
      }

      micTrack.enabled = false;
      pc.addTrack(micTrack, stream);

      pc.onconnectionstatechange = () => {
        logEvent(`webrtc: ${pc.connectionState}`);
        if (pc.connectionState === "connected") {
          setStatus((current) => (current === "connecting" ? "ready" : current));
        }
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          setStatus(pc.connectionState === "closed" ? "idle" : "error");
        }
      };

      const dataChannelOpen = new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("Realtime data channel did not open.")), 15000);

        dc.onopen = () => {
          window.clearTimeout(timeout);
          logEvent("data channel open");
          setStatus("ready");
          resolve();
        };
      });

      dc.onclose = () => logEvent("data channel closed");
      dc.onerror = () => {
        setStatus("error");
        setError("Realtime data channel failed.");
      };
      dc.onmessage = (message) => {
        try {
          handleRealtimeEvent(JSON.parse(message.data) as RealtimeEvent);
        } catch (parseError) {
          logEvent(`bad event: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
      };

      pcRef.current = pc;
      dcRef.current = dc;
      streamRef.current = stream;
      micTrackRef.current = micTrack;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdp = pc.localDescription?.sdp;
      if (!sdp) {
        throw new Error("Browser did not create an SDP offer.");
      }

      const sessionResponse = await fetch("/session", {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: sdp,
      });

      const answerSdp = await sessionResponse.text();
      if (!sessionResponse.ok) {
        throw new Error(answerSdp);
      }

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      logEvent("SDP answer applied");
      await dataChannelOpen;
    })();

    try {
      await connectionPromiseRef.current;
    } catch (connectError) {
      disconnect();
      throw connectError;
    } finally {
      connectionPromiseRef.current = null;
    }
  }, [disconnect, handleRealtimeEvent, logEvent]);

  useEffect(() => {
    return () => {
      dcRef.current?.close();
      pcRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function toggleRecording() {
    if (status === "recording") {
      if (micTrackRef.current) {
        micTrackRef.current.enabled = false;
      }
      setStatus("ready");
      logEvent("recording stopped");
      return;
    }

    try {
      setError(null);
      setNotice(null);
      setPendingProposal(null);
      await ensureRealtimeSession();
      if (!micTrackRef.current) {
        throw new Error("Microphone is not ready.");
      }
      micTrackRef.current.enabled = true;
      setStatus("recording");
      logEvent("recording started");
    } catch (recordError) {
      const message = recordError instanceof Error ? recordError.message : String(recordError);
      setStatus("error");
      setError(message);
    }
  }

  async function playCurrent() {
    setError(null);
    try {
      await evaluateStrudel(lastCode);
      setStatus("playing");
      logEvent("play");
    } catch (playError) {
      setError(playError instanceof Error ? playError.message : String(playError));
      setStatus("error");
    }
  }

  function stopAudio() {
    stopStrudel();
    if (micTrackRef.current) {
      micTrackRef.current.enabled = false;
    }
    setStatus((current) => (current === "recording" || current === "playing" ? "ready" : current));
    logEvent("stop");
  }

  async function applyProposal() {
    if (!pendingProposal) {
      return;
    }

    try {
      setError(null);
      await evaluateStrudel(pendingProposal.code);
      setLastCode(pendingProposal.code);
      setLastSummary(pendingProposal.intendedModification);
      setNotice(null);
      sendToolResult(pendingProposal.callId, {
        ok: true,
        applied: true,
        intended_modification: pendingProposal.intendedModification,
      });
      setPendingProposal(null);
      setStatus("playing");
      logEvent("proposal applied");
    } catch (applyError) {
      const message = applyError instanceof Error ? applyError.message : String(applyError);
      setError(message);
      setStatus("error");
      sendToolResult(pendingProposal.callId, { ok: false, applied: false, error: message });
    }
  }

  function refuseProposal() {
    if (!pendingProposal) {
      return;
    }

    sendToolResult(pendingProposal.callId, {
      ok: true,
      applied: false,
      reason: "User rejected the proposed musical change.",
    });
    setPendingProposal(null);
    setNotice("Change refused. The current track was left untouched.");
    setStatus("ready");
    logEvent("proposal refused");
  }

  async function sendTextInstruction() {
    const text = typedInstruction.trim();
    if (!text) {
      return;
    }

    try {
      setError(null);
      setNotice(null);
      setPendingProposal(null);
      await ensureRealtimeSession();
      sendRealtimeEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      });
      sendRealtimeEvent({
        type: "response.create",
        response: {
          output_modalities: ["text"],
        },
      });
      setTypedInstruction("");
      setStatus("thinking");
      logEvent(`sent: ${text}`);
    } catch (textError) {
      setError(textError instanceof Error ? textError.message : String(textError));
      setStatus("error");
    }
  }

  const isBusy = status === "connecting" || status === "thinking" || status === "proposal";
  const recordLabel = status === "recording" ? "Stop recording" : "Record";
  const isProcessing = status === "connecting" || status === "recording" || status === "thinking";
  const processingTitle =
    status === "recording" ? "Listening" : status === "connecting" ? "Preparing microphone" : "Processing audio";
  const processingMessage =
    status === "recording"
      ? "Speak one instruction. Recording stops automatically when the turn ends."
      : status === "connecting"
        ? "Opening the realtime session and checking the microphone."
        : "The model is classifying the turn and preparing a proposed change.";

  function selectStarter(track: StarterTrack) {
    if (status === "playing") {
      stopStrudel();
    }
    setSelectedStarterId(track.id);
    setLastCode(track.code);
    setLastSummary(`${track.name} selected.`);
    setPendingProposal(null);
    setNotice(null);
    setError(null);
    if (status === "idle" || status === "playing") {
      setStatus("ready");
    }
    logEvent(`selected: ${track.name}`);
  }

  return (
    <main className="app">
      <section className="topbar">
        <div>
          <h1>voice-strudel</h1>
          <p>Realtime voice to Strudel pattern</p>
        </div>
        <div className={`status status-${status}`}>{status}</div>
      </section>

      <section className="starters" aria-label="Starter tracks">
        <div className="sectionHeader">
          <h2>Starter tracks</h2>
          <p>Select a base pattern, then press Play or Record a change.</p>
        </div>
        <div className="starterGrid">
          {starterTracks.map((track) => {
            const selected = selectedStarterId === track.id;

            return (
              <button
                className={`starterCard ${selected ? "selected" : ""}`}
                key={track.id}
                onClick={() => selectStarter(track)}
                type="button"
              >
                <span className="genre">{track.genre}</span>
                <strong>{track.name}</strong>
                <span>{track.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="transport" aria-label="Transport controls">
        <button onClick={playCurrent}>Play</button>
        <button onClick={stopAudio}>Stop</button>
        <button className={status === "recording" ? "recording" : ""} onClick={toggleRecording} disabled={isBusy}>
          {recordLabel}
        </button>
      </section>

      {isProcessing ? (
        <section className="processingBox" aria-live="polite">
          <div className="pulse" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <h2>{processingTitle}</h2>
            <p>{processingMessage}</p>
          </div>
        </section>
      ) : null}

      <section className="typed">
        <input
          value={typedInstruction}
          onChange={(event) => setTypedInstruction(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void sendTextInstruction();
            }
          }}
          placeholder="Optional typed instruction"
          disabled={isBusy || status === "recording"}
        />
        <button onClick={sendTextInstruction} disabled={isBusy || status === "recording" || !typedInstruction.trim()}>
          Send
        </button>
      </section>

      {pendingProposal ? (
        <section className="proposalBox">
          <h2>Proposed change</h2>
          {pendingProposal.userQuery ? <p className="heard">Heard: {pendingProposal.userQuery}</p> : null}
          <p>{pendingProposal.intendedModification}</p>
          <div className="proposalActions">
            <button onClick={applyProposal}>Implement change</button>
            <button className="secondary" onClick={refuseProposal}>
              Refuse
            </button>
          </div>
        </section>
      ) : null}

      {notice ? <section className="notice">{notice}</section> : null}
      {error ? <pre className="error">{error}</pre> : null}

      <section className="output">
        <div className="summary">{lastSummary}</div>
        <pre className="code">{lastCode}</pre>
      </section>

      <section className="events">
        <h2>Events</h2>
        {events.length ? (
          <ul>
            {events.map((event, index) => (
              <li key={`${event}-${index}`}>{event}</li>
            ))}
          </ul>
        ) : (
          <p>No events yet.</p>
        )}
      </section>
    </main>
  );
}
