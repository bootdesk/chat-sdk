# js-web-adapter-react

React component library for BootDesk Chat SDK — drop-in chat widget, i18n, cards, file uploads, push notifications, iframe embedding.

## key commands
```
npm run build           # tsup + tailwindcss (ESM + CJS + DTS + CSS)
npm run test            # vitest run
npm run lint            # eslint src
npm run format          # prettier --write "src/**/*.{ts,tsx}"
npm run format:check    # prettier --check
npm run typecheck       # tsc --noEmit
```

## files
- `src/components/` — `ChatWidget`, `Header`, `MessageList`, `MessageContent`, `InputArea`, `TypingIndicator`, `FloatingButton`, `Dropzone`, `AttachmentList`, `PushPermissionPrompt`, `PushToggle`, `ErrorBoundary`
- `src/hooks/` — `useBridge`, `useChatClient`, `useMessages`, `useStreaming`, `useTyping`, `useAttachmentUpload`, `usePushNotifications`
- `src/cards/` — `CardProvider`/`CardContext`, `CardRenderer`, `DefaultCard`, `ImageCard`, `FileCard`
- `src/i18n/` — `LocaleProvider`, `mergeLocale`, 7 locale files (en, en-US, en-GB, pt, pt-BR, pt-PT, es)
- `src/providers/` — `ChatProvider` (combines CardProvider + ChatContext)
- `src/utils/` — `markdown` (marked + DOMPurify), `formatSize`, `formatTimestamp` (relative time)
- `src/styles/` — `tailwind.css` (Tailwind component classes; safe-area & mobile styles injected at runtime)

## entrypoints
- `ChatWidget` — main component (floating/fullscreen/embedded modes)
- `ChatProvider` — wraps CardProvider + ChatContext
- `Header`, `MessageList`, `InputArea`, `TypingIndicator`, `FloatingButton`
- `CardRenderer`, `CardProvider`, `DefaultCard`
- `LocaleProvider`, `useLocale`
- `useMessages`, `useTyping`, `useChatClient` (re-exports from core)

## peer deps
- `react` ^18 || ^19
- `@bootdesk/js-web-adapter-core` ^0.1.0
- `marked` ^18.0.0
- `dompurify` ^3.4.5
- `@bootdesk/chat-widget-bridge` (optional — iframe embedding, viewport config for Android keyboard via `interactive-widget=resizes-content`)

## testing
- Vitest, jsdom env, `@testing-library/react` + `@testing-library/jest-dom`
- 18 test files, 100+ tests covering components, hooks, cards, i18n, utils
- Run: `npm test`

## conventions
- Components use `data-chat-*` + `data-testid` attributes for targeting
- Props follow React conventions (className, children, event handlers)
- `formatTimestamp` returns relative time ("Just now", "5m ago", "2h ago")
- Card context uses `CardProvider` with registry pattern for custom renderers
- Locale override chain: en → en-X → runtime overrides via `mergeLocale`
- Build: tsup for JS, tailwindcss for CSS, both outputs in `dist/`
