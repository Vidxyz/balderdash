/// <reference types="vite/client" />

declare module 'phoenix' {
  export class Socket {
    constructor(endPoint: string, opts?: Record<string, unknown>)
    connect(): void
    disconnect(callback?: () => void): void
    channel(topic: string, chanParams?: Record<string, unknown>): Channel
  }

  export class Channel {
    join(timeout?: number): Push
    leave(timeout?: number): Push
    push(event: string, payload: Record<string, unknown>): Push
    on(event: string, callback: (payload: unknown) => void): void
  }

  export class Push {
    receive(status: string, callback: (response?: unknown) => void): Push
  }
}
