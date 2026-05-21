# js-web-adapter-core

Framework-agnostic TypeScript SDK for BootDesk Chat. Real-time messaging via HTTP + broadcasting (Pusher/Laravel Echo).

## key commands
```
npm run build           # tsup (ESM + CJS + DTS)
npm run test            # vitest run
npm run lint            # eslint src
npm run format          # prettier --write
npm run format:check    # prettier --check
npm run typecheck       # tsc --noEmit
```

## files
- `src/client/WebChatClient.ts` — main chat client (HTTP + event system)
- `src/client/BroadcastClient.ts` — broadcast interface
- `src/client/PusherBroadcastClient.ts` — Pusher implementation
- `src/client/LaravelEchoBroadcastClient.ts` — Laravel Echo implementation
- `src/client/HttpClient.ts` — HTTP transport
- `src/events/` — typed event classes (MessagePosted, Edited, Deleted, Reactions, Typing, Streaming, DM)
- `src/push/` — Web Push API integration (PushManager, subscription handlers)
- `src/types.ts` — core types (Message, User, Card, etc.)
- `src/utils/eventIdGenerator.ts` — unique ID generation

## entrypoints
- `WebChatClient` — primary client (connect, send, listen)
- `PusherBroadcastClient` / `LaravelEchoBroadcastClient` — real-time backends
- `PushManager` — web push subscriptions

## peer deps (optional)
- `laravel-echo` — Laravel Echo broadcasting
- `pusher-js` — Pusher broadcasting

## testing
- Vitest with `globals: true`, `environment: node`
- Tests in `tests/` mirroring `src/` structure
- Tests use explicit `vi.fn()` mocks (no real network)
- Run: `npm test`

## conventions
- All events extend `ChatEvent`
- `on*` methods return `Unsubscribe` (callable to remove listener)
- `generateId()` uses crypto.randomUUID with fallback
- `format: ["esm", "cjs"]` with DTS, peer deps kept external
