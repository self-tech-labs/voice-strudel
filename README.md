# voice-strudel

Speak a music idea. Preview what the model thinks you meant. Let Strudel play it in the browser.

`voice-strudel` is a tiny local proof of concept for voice-controlled live coding. It uses the OpenAI Realtime API over WebRTC to listen to your microphone, routes each turn as either casual speech or a musical instruction, then proposes complete Strudel code that you can accept or refuse before it changes the track.

It is intentionally small: no accounts, no database, no DAW, no MIDI, no embedded Strudel editor. Just a fast little idea loop for making patterns.

The hosted landing page is only a public presentation for the project. The working voice rig is designed to be cloned and run locally so your OpenAI API key stays on your machine.

## Features

- Local Vite + React + TypeScript browser app.
- Tiny Node + Express backend that keeps your OpenAI API key out of the browser.
- OpenAI Realtime WebRTC session creation through `/v1/realtime/calls`.
- Realtime function tool: `set_strudel_pattern`.
- `@strudel/web` execution in the browser.
- Starter tracks in a few genres so you can begin with a groove instead of silence.
- Proposal step before changing the music: `Implement change` or `Refuse`.
- Visible listening and processing states.

## Quick Start

Requirements:

- Node 22+
- npm
- OpenAI API key with Realtime API access

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
OPENAI_API_KEY=sk-...
REALTIME_MODEL=gpt-realtime-2
PORT=8787
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

Then:

1. Pick a starter track.
2. Press `Play`.
3. Press `Record`.
4. Say one musical instruction.
5. Review the proposed change.
6. Press `Implement change` or `Refuse`.

## Things To Say

Try short, direct instructions:

```text
Make it faster and more acid.
```

```text
Remove the bass and make the drums more broken.
```

```text
Add a dark minor bassline with a low-pass filter sweep.
```

```text
Add dub delay and reverb to the snare.
```

```text
Make this more ambient and spacious.
```

Random speech should be ignored. Musical instructions should become a previewable change.

## How It Works

```text
Browser microphone
  -> WebRTC SDP offer
  -> local Express /session endpoint
  -> OpenAI Realtime /v1/realtime/calls
  -> Realtime data channel events
  -> set_strudel_pattern tool call
  -> user approval
  -> @strudel/web evaluate(code)
```

The browser never receives your OpenAI API key. It sends only an SDP offer to the local backend. The backend attaches the Realtime session config and forwards the request to OpenAI with server-side auth.

## Realtime Tool Contract

The app configures one Realtime function tool:

```text
set_strudel_pattern
```

The model must classify every turn as:

- `random`: no music change should be made.
- `musical_instruction`: return the intended modification plus complete Strudel code.

For musical instructions, the app does not execute the code immediately. It shows the proposal first, then applies it only after user approval.

## Project Layout

```text
server/index.ts       Express SDP bridge and Realtime session config
src/App.tsx           React UI, WebRTC flow, routing, proposals
src/strudelRuntime.ts @strudel/web initialization and evaluation
src/styles.css        Minimal app styling
.env.example          Local environment template
```

## Scripts

```bash
npm run dev
```

Starts the backend and frontend together.

```bash
npm run dev:server
```

Starts the Express backend on `PORT`, defaulting to `8787`.

```bash
npm run dev:client
```

Starts Vite, usually at `http://127.0.0.1:5173`.

```bash
npm run build
```

Runs TypeScript checks and builds the frontend.

## Model

Default:

```bash
REALTIME_MODEL=gpt-realtime-2
```

For cheaper experiments, try:

```bash
REALTIME_MODEL=gpt-realtime-mini
```

Availability depends on your OpenAI account and current model access.

## Security Notes

- Do not put `OPENAI_API_KEY` in frontend code.
- Do not commit `.env`.
- This is a local proof of concept, not a production voice agent.
- There is no auth, rate limiting, persistence, quota guard, or abuse protection.
- Generated Strudel code is model output. Review before using this pattern in a broader app.

## Troubleshooting

### `/session` fails

Check that `.env` exists and contains `OPENAI_API_KEY`. Restart `npm run dev` after changing `.env`.

You can also check the backend health endpoint:

```bash
curl http://127.0.0.1:8787/health
```

You want:

```json
{"ok":true,"model":"gpt-realtime-2","hasApiKey":true}
```

### Microphone permission fails

Use `http://127.0.0.1:5173` or `localhost`. Browser microphone access requires a secure context, and local loopback origins are allowed.

### The first sound is slow

The app initializes `@strudel/web` and loads `github:tidalcycles/dirt-samples` on first use. The first pattern can take a moment.

### The model proposes strange code

Keep the instruction short and concrete. The generated code is visible in the app, and changes are only applied after you press `Implement change`.

### The app ignores what you said

The Realtime model classified the turn as not being a musical instruction. Try a more explicit command:

```text
Change the track by adding offbeat hi-hats and a darker bassline.
```

## License Notes

This project depends on Strudel packages. Check dependency licenses before redistributing or shipping beyond local experiments.
