import "dotenv/config";
import express from "express";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const apiKey = process.env.OPENAI_API_KEY;
const realtimeModel = process.env.REALTIME_MODEL ?? "gpt-realtime-2";

app.use(express.text({ type: ["application/sdp", "text/plain"], limit: "1mb" }));

const instructions = `
You are voice-strudel, a realtime assistant that turns spoken music direction into Strudel code.

Your job is to classify every user turn and route it through the set_strudel_pattern function.

If the user is only saying something random, chatting, testing the microphone, or saying something that is not
a music-editing request, call set_strudel_pattern with intent "random", a short intended_modification explaining
why no track change is needed, and code as an empty string.

If the user asks for a musical change, call set_strudel_pattern with intent "musical_instruction", a concise
intended_modification describing the exact change you plan to make, and complete Strudel code. The browser will
show the intended modification to the user and will only execute the code if the user accepts it.

The browser will execute the returned code with @strudel/web's evaluate(code), after initStrudel has loaded
github:tidalcycles/dirt-samples. Return complete, self-contained Strudel REPL code that evaluates to a
pattern. Do not wrap it in markdown. Do not include imports. Do not append .play().

Keep the full current pattern in memory. Every tool call must contain the complete pattern, not just a diff.

Prefer stable, simple Strudel that works in the browser:
- Use setcpm(BPM / 4) for BPM, because one Strudel cycle is treated as one four-beat bar here.
- Use stack(...) for multi-part arrangements.
- Use common dirt samples such as bd, sd, cp, hh, oh, rim, perc.
- Use simple synth basslines with note(...).sound("sawtooth") or note(...).sound("square").
- Use effects sparingly: gain, room, delay, delaytime, delayfeedback, cutoff, resonance, lpf, hpf, shape, pan.
- Use mini-notation in double quotes.
- Keep patterns short enough to read and robust enough to execute.

Good example:
setcpm(124 / 4)
stack(
  s("bd*4").gain(0.95),
  s("~ hh ~ hh").gain(0.38).hpf(6000),
  s("~ ~ sd ~").room(0.35).delay(0.2).delaytime(0.25).delayfeedback(0.35),
  note("c2 ~ eb2 g1").sound("sawtooth").cutoff(650).resonance(8).gain(0.45)
)
`;

function sessionConfig() {
  return {
    type: "realtime",
    model: realtimeModel,
    output_modalities: ["text"],
    audio: {
      input: {
        turn_detection: {
          type: "semantic_vad",
        },
      },
    },
    instructions,
    tool_choice: "required",
    tools: [
      {
        type: "function",
        name: "set_strudel_pattern",
        description:
          "Classify the user turn. For musical instructions, propose the full Strudel pattern for the browser to show before applying. For random speech, return no code.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            intent: {
              type: "string",
              enum: ["musical_instruction", "random"],
              description:
                "Use musical_instruction only when the user is asking to add, remove, or change musical content. Use random otherwise.",
            },
            intended_modification: {
              type: "string",
              description:
                "For musical instructions, the exact track change the app should preview. For random speech, why no musical change is needed.",
            },
            code: {
              type: "string",
              description:
                "Complete Strudel REPL code for musical_instruction. Use an empty string for random.",
            },
            user_query: {
              type: "string",
              description: "Brief transcript or paraphrase of what the user asked.",
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "How confident you are in the route and proposed modification.",
            },
          },
          required: ["intent", "intended_modification", "code", "user_query", "confidence"],
        },
      },
    ],
  };
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    model: realtimeModel,
    hasApiKey: Boolean(apiKey),
  });
});

app.post("/session", async (req, res) => {
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set. Add it to .env before creating a Realtime session.");
    res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    return;
  }

  if (!req.body || typeof req.body !== "string" || !req.body.includes("v=0")) {
    res.status(400).json({ error: "Expected a raw SDP offer in the request body." });
    return;
  }

  const fd = new FormData();
  fd.set("sdp", req.body);
  fd.set("session", JSON.stringify(sessionConfig()));

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: fd,
    });

    const answerSdp = await response.text();

    if (!response.ok) {
      console.error("OpenAI Realtime session creation failed", {
        status: response.status,
        statusText: response.statusText,
        body: answerSdp,
      });
      res.status(502).json({
        error: "OpenAI Realtime session creation failed.",
        status: response.status,
        detail: answerSdp,
      });
      return;
    }

    res.type("application/sdp").send(answerSdp);
  } catch (error) {
    console.error("Unexpected /session error", error);
    res.status(500).json({ error: "Unexpected error while creating the Realtime session." });
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`voice-strudel server listening on http://127.0.0.1:${port}`);
  console.log(`Realtime model: ${realtimeModel}`);
  if (!apiKey) {
    console.warn("OPENAI_API_KEY is not set. /session will fail until .env is configured.");
  }
});
