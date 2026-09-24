import type { BrowserCommand } from 'vitest/node'
import type * as commands from './commands'

type ToBrowserCommand<T> = T extends BrowserCommand<infer Payload, infer Return>
  ? (...payload: Payload) => Promise<Awaited<Return>>
  : never

type CustomCommands = { [K in keyof typeof commands]: ToBrowserCommand<(typeof commands)[K]> }

declare module 'vitest/browser' {
  interface BrowserCommands extends CustomCommands {}
}
