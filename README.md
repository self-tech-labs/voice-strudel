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
npm ci
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

## License and Attribution

Copyright (C) 2026 Elliot Vaucher and voice-strudel contributors.

voice-strudel is free software licensed under the **GNU Affero General Public License, version 3 or later** (`AGPL-3.0-or-later`). You may use, share, and modify it under those terms. It is distributed **without any warranty**, including the implied warranties of merchantability or fitness for a particular purpose. See [LICENSE.txt](LICENSE.txt) for the complete terms.

The application uses [Strudel](https://strudel.cc/), created by Alex McLean, Felix Roos, and the Strudel contributors. Strudel and its audio dependencies retain their own copyrights and licenses. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and Strudel's [integration licensing guidance](https://strudel.cc/technical-manual/project-start/#respect-the-license).

The license applies to the application as a whole, including the frontend, local server, and build scripts. Other dependencies retain their original licenses. The `private` package flag only prevents accidental publication to npm; it does not restrict the rights granted by the AGPL.

### Source and redistribution

The complete application source and build instructions are available in [this public repository](https://github.com/self-tech-labs/voice-strudel). The committed `package-lock.json` pins dependency versions and download locations; `npm ci` installs those versions. Upstream source locations are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

If you redistribute or host a modified version, preserve the copyright and license notices, document your changes and their dates, and offer the complete Corresponding Source under the AGPL at no charge, including the code and scripts needed to build, install, and run that version. Keep the source offer visible to remote users and make sure it matches the version they receive. See sections 4–6 and 13 of [LICENSE.txt](LICENSE.txt).

For a public build:

1. Commit and publish the exact source, including any modifications, in a publicly accessible repository.
2. Build that committed version with `npm ci` and `npm run build`. The production footer links to that Git commit, using `SOURCE_REVISION`, Vercel's `VERCEL_GIT_COMMIT_SHA`, or the checkout's `HEAD`, in that order. When building from a source archive without Git, set `SOURCE_REVISION` to the full public commit SHA.
3. If publishing a fork, set `SOURCE_REPOSITORY_URL` to your public GitHub repository URL before building so the source link points to your version.
4. Deploy the entire `dist/` directory. It includes the AGPL text, attribution notices, and `THIRD_PARTY_LICENSES.txt`, which Vite generates from the dependencies actually bundled. Keep these files and the linked Corresponding Source available with the deployment.

The license and source links appear on both the public landing page and the local voice rig. API keys and local `.env` files are not part of the source distribution; use `.env.example` to configure your own credentials.
