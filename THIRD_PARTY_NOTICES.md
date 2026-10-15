# Third-party notices

voice-strudel is an independent application built with Strudel. The application as a whole is licensed under AGPL-3.0-or-later; upstream components retain their original copyrights and license terms.

## Strudel and audio engines

- **Strudel**: copyright the Strudel contributors, including Alex McLean and Felix Roos. The locked `@strudel/web` version is 1.3.0. The `@strudel/core`, `@strudel/draw`, `@strudel/mini`, `@strudel/tonal`, and `@strudel/transpiler` packages are 1.2.6; `@strudel/webaudio` is 1.3.0. All are licensed under **AGPL-3.0-or-later**. [Project](https://strudel.cc/) · [Source and contributors](https://codeberg.org/uzu/strudel).
- **SuperDough / SupraDough**: copyright Felix Roos and the Strudel contributors. The locked versions are `superdough` 1.3.0 and `supradough` 1.2.4, licensed under **AGPL-3.0-or-later**. [Source](https://codeberg.org/uzu/strudel).
- **Kabelsalat**: copyright Felix Roos and the Kabelsalat contributors. The locked versions are `@kabelsalat/core` 0.4.0, `@kabelsalat/lib` 0.4.1, and `@kabelsalat/web` 0.4.1, licensed under **AGPL-3.0-or-later**. [Source](https://github.com/felixroos/kabelsalat).

These dependencies are consumed as published, without local modifications. voice-strudel adds its own voice interface, Realtime session bridge, pattern approval flow, and landing page. The AGPL license and source notices were added on 2026-10-15; subsequent changes and their dates are recorded in Git history.

The full AGPL text is provided in [LICENSE.txt](LICENSE.txt). The exact dependency versions, integrity hashes, and npm package download URLs are recorded in `package-lock.json`; install them with `npm ci`. The published Strudel packages include their module sources and license files.

## Other dependencies

Other components, including React and Express, retain their upstream licenses. Production builds include `THIRD_PARTY_LICENSES.txt` with the license texts for the dependencies actually bundled in the browser application. Installed package directories contain their own license notices for server and development tools.

The Remotion development tools retain their own license terms; see their installed license files before using the optional demo-video tooling. They are not bundled in the browser application.

## Samples

The audio runtime fetches [tidalcycles/Dirt-Samples](https://github.com/tidalcycles/Dirt-Samples) on first use. Samples are separate media with their own notices; they are not relicensed by the application's AGPL license. Preserve the sample collection's upstream notices when redistributing samples.
