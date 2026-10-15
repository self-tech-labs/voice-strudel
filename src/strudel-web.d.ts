// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Elliot Vaucher and voice-strudel contributors

declare module "@strudel/web" {
  export function initStrudel(options?: {
    prebake?: () => unknown | Promise<unknown>;
    [key: string]: unknown;
  }): Promise<unknown>;

  export function evaluate(code: string, start?: boolean): Promise<unknown>;

  export function hush(): void;

  export function samples(source: string): unknown | Promise<unknown>;
}
