# Agent High-Level Architecture

This project is a full-stack TypeScript agent with a React client (`agent-dev-client`) and Node.js
server (`agent-dev-server`). An LLM orchestrates each turn: it answers in natural language, calls
tools, and renders interactive screens. Vendored Agentplace libraries provide the shared agent loop,
transport, UI protocol, sessions, and channel utilities.

This document is the stable map for understanding and extending the agent. Read the matching Builder
skill and current source for detailed APIs; do not turn this file into an inventory of classes,
methods, tools, or implementation constants.

## System context

The same agent can be reached through several surfaces:

| Surface | Path | Delivery model |
|---|---|---|
| Browser | WebSocket `/ws` | Streaming text, tools, screens, actions, and tRPC over one `RpcPeer` |
| MCP client | Streamable HTTP `/mcp` | Same messaging pipeline, with reasoning removed and screens projected to text |
| HTTP caller | `POST /api/send-message` | Fire-and-forget message into an agent session |
| Messaging channel | Agent-owned adapter | Channel input enters the same messaging service; output is rendered for that channel |
| Trigger or schedule | Durable inbox/handler | Code handles the event directly or passes a bounded request to the LLM |

Preview and Published run the same agent source in separate environments. The platform gateway owns
authentication and routes authorized traffic to the agent VM.

## Ownership boundary

Builder extends the agent through explicit agent-owned seams. Platform code can be read to understand
behavior but is not edited as part of an agent build.

### Agent-owned

- `agent-dev-server/src/instruction.md` — generated agent role and behavior.
- `agent-dev-server/src/config.ts` — model and voice configuration anchor.
- `agent-dev-server/src/surfaces/**` — authored screen contracts.
- `agent-dev-server/src/bl/tools/impl/**` — custom backend tools.
- `agent-dev-server/src/trpc/routers/**` — deterministic data procedures.
- `agent-dev-server/src/bl/messaging/subagents/**` — generated-agent subagents.
- `agent-dev-client/src/app/agent/**` — authored screen components, renderers, site configuration,
  custom header, and brand accent.
- `.agent/skills/**` — generated-agent knowledge and workflows.
- `.agentplace/**` — project description, specification, and maintained architecture notes.

### Platform-owned

- Client `src/app/lib/**` — stage shell, transport, state stores, built-in UI, and shared components.
- Server `src/ws/**`, `src/http/**`, `src/services/**`, the core messaging pipeline, built-in catalog,
  generated surface tools, and `bl/config-bridge.ts`.
- Vendored libraries and protocol implementations.

Use the sanctioned agent anchors rather than importing agent configuration or surfaces directly into
platform code. Existing boundary checks reject unsupported platform-to-agent imports.

## Project map

```text
.agent/
├── mcp.json                       external MCP connections
└── skills/<name>/SKILL.md         generated-agent skills, created per use case

.agentplace/
├── high-level-architecture.md     this maintained system map
├── project-description.md         product purpose and current capabilities
└── specification.md               implementation requirements and decisions

agent-dev-client/src/app/
├── agent/                         Builder-editable UI anchors
│   ├── surfaces/                  authored React screen components
│   ├── renderers.ts               inline tool-card renderers
│   ├── site-config.ts             brand, navigation, appearance, site/chat mode
│   └── theme.css                  per-agent accent
└── lib/                           platform stage, state, transport, and built-ins

agent-dev-server/src/
├── instruction.md                 generated-agent system instruction
├── config.ts                      model and voice anchor
├── surfaces/                      authored screen contracts
├── bl/tools/impl/                 custom backend tools
├── bl/messaging/subagents/        generated-agent subagents
├── trpc/routers/                  deterministic data procedures
├── bl/messaging/                  platform messaging pipeline
├── ws/                            platform browser/session transport
└── http/                          platform HTTP and MCP routes
```

## This agent's own seams

Ten project-specific facts a reader needs before touching Learny's UI:

1. **`theme.css` reaches into the input dock, and only there.** The dock is shell chrome, so the
   voice equaliser is not a component: the platform canvas in the dock's waveform slot is hidden and
   that slot is painted by pseudo-elements, and the shell's transcript line is repositioned within
   it. The rules are scoped to that slot alone; if the shell restyles it, the stock equaliser returns.
2. **Audio levels reach CSS through the custom header.** `LearnyHeader` reads the live session's
   microphone and playback levels and publishes them as CSS custom properties on the document, which
   is what makes the dock strip a real instrument rather than a loop. The header is the host because
   it is always mounted; the loop runs only while a voice channel is open.
3. **The practice language has exactly one authority: the published `/practice/language`**, written by
   the hero, with the render prop (`initialPracticeLanguage`) as the language the screen merely opens
   on. The hero writes it twice on purpose: surface-scoped, because a screen reader — above all the
   live voice session — is shown a section's declared `fields` with their current data-model values,
   and at the uiState root, because `<ui_state>` carries every surface a session rendered and a
   screen-scoped value alone can be read off a stale twin. The `fallbackTemplate` deliberately names no
   language: the fallback text is frozen at render time, so any language it claimed would go stale the
   moment the visitor pressed another one. The hero always renders under `surfaceId: home`.
4. **A live voice call is steered by the screen, not by `instruction.md`.** The realtime session's
   grounding is built from the agent's render surfaces and the visitor's saved notes — the instruction
   file never reaches the voice model — and the platform re-states the committed session locale as a
   speaking instruction on every response. For a language-practice product both are working against
   the product, so each practice page composes its live choices into a CALL BRIEF
   (`agent-dev-client/src/app/agent/blocks/practice-brief.ts`), publishes it as `/practice/brief`, and
   declares it as the surface's single field. That projection is the whole channel to a running call,
   and it is capped at 600 characters ALL-OR-NOTHING: over the cap every field value is replaced by a
   structural summary and the brief disappears silently. Hence one field per contract, a hard cap in the
   composer, and `src/surfaces/voice-screen-budget.test.ts` as the guard.
5. **What a call OPENS as travels by the visitor's notes, not by the screen.** The screen projection is a
   DESCRIPTION and cannot outrank the platform's own instructions, which is why a pressed role-play was
   reported rather than played. The visitor's saved notes DO arrive as system-level context, sent by the
   browser when the voice socket opens (`RealtimeVoiceSession` → `voice.initialize` → `memoryBankSection`),
   so each practice page mirrors its setup there through `usePracticeNotes`
   (`blocks/practice-voice.tsx`, composed in `practice-brief.ts`): the role for the pressed scene with the
   order to answer in character, and a standing permission to carry the conversation into the practice
   language once the visitor speaks it. Three properties this depends on: notes are read only at connect
   (mid-call presses still travel by the brief), the runtime truncates each note at 200 characters
   (`blocks/practice-notes.test.ts` measures every combination), and the bank is the VISITOR's — shared
   with their own notes and persisted in their browser — so ours carry a marker and a changed setup
   replaces them instead of accumulating contradicting scenes.
6. **The greeting turn is platform-authored, so we spend it instead of writing it.** The first spoken line
   of a call comes from a platform instruction that asks for a warm invitation and forbids using the
   visitor's notes or profile — precisely our channel from (5), which is why a pressed scene still opened
   with "what shall we do?". The greeting is a one-shot right claimed by the first voice open of a page
   load (`app/lib/services/voice-greeting-ledger.ts`), so both practice pages claim and discard it on
   mount via `useSilentVoiceOpen` (`blocks/practice-voice.tsx`). The call then opens listening, the
   visitor speaks first, and the voice's first words are an ordinary reply — the only turn kind where the
   brief and the notes apply. The expectation is carried visually instead: the room's idle invitation
   names both parts of the pressed scene, and the live status line says whose turn it is until the voice
   has answered once.
7. **The spoken language IS the committed session language.** There is one language per session, the voice
   is told to speak it on every response, and a visitor-chosen one is locked against conversational
   evidence — so a second language could not be smuggled in through the screen or the notes (three failed
   owner tests). While a call is live, `useImmersionLocale` (`blocks/practice-voice.tsx`) commits the
   practice language over the same `locale.propose` path as the header's switcher, and proposes the
   visitor's own interface language back when the call ends. A committed locale is persisted as the
   visitor's preference, so the language owed back is also breadcrumbed in local storage and restored on
   the next mount — a closed tab mid-call must not leave them a permanently foreign site. Consequence to
   keep in mind: the page's stable labels follow the call, and practice languages cannot outgrow the
   interface bundles.
8. **The hero publishes only on a real event** — a press, or a later render carrying another language —
   never on mount. A client write marks its pointer dirty, and a dirty pointer outranks every incoming
   server snapshot until the next sync, so a mount-time write would stamp the replayed opening language
   over the session's stored choice. Instead the screen listens: it starts from the stored value if the
   snapshot has already arrived, and adopts it when it lands after mount (a reconnect delivers uiState
   just after the history). Until anything is published the field reads empty, and the agent goes by
   the prop it rendered with. The DERIVED brief is the one exception (`usePublishedText`): it is a
   function of those choices, owns nothing the visitor could lose, and a call started seconds after the
   page appears needs it there already.
9. **Both language switchers are mechanical.** The header proposes a session locale straight over the
   socket and the hero repaints itself locally; neither spends an agent turn, and translations for
   authored copy are baked into `.agent/locales/*.json` rather than translated at runtime.
10. **One screen inverts the site's reply rule: the writing desk READS the session.** Everywhere else the
   agent's reply text is invisible (site mode paints the latest surface) and an answer must travel in a
   prop. `WritingDesk` instead derives its thread from `MessagesStore.messages`
   (`blocks/writing-thread.ts`), so the agent answers in ordinary reply text and the page shows it. This
   works because `resolveStageView` carries the current surface forward through a text-only turn — a
   plain answer does not swap the page — and because content provenance is persisted: `channel: 'voice'`
   and `voiceDelivery` are what keep a spoken conversation out of the written one across a reload. The
   thread is additionally scoped to the run that created the surface
   (`a2uiSurfaces.surfaces.get('writing')?.responseId`), and turns with no assistant text — the site's
   answer-in-a-prop turns — are dropped rather than drawn. Consequence: the desk costs no render per turn,
   but it depends on platform behavior the agent does not own, so a stage-resolution change is the thing
   to re-check if answers ever start replacing the page.

## Turn and session flow

1. A browser, MCP caller, channel, trigger, or schedule supplies a request.
2. The server resolves the session and creates a messaging service for the turn.
3. The system prompt combines `instruction.md`, applicable `.agent/skills`, channel context, and
   relevant session state.
4. A fresh tool registry combines platform tools, generated `Render<Component>` screen tools,
   generated-agent custom tools, MCP tools, and subagents.
5. The agent loop streams text, reasoning, tool calls, and screen events.
6. Session state and conversation messages are persisted; connected browser clients receive the live
   stream and can reconstruct completed content after reconnect.
7. Browser actions dispatch a new turn carrying the screen action and its context.

Only one message runs at a time in a session. A bounded queue may hold one additional message. The
browser can reconnect and resume completed content; do not use in-memory objects as durable business
state.

On a fresh browser session, the platform sends `[user opened the agent]` through this same pipeline.
The generated agent's response to that turn is its initial customer arrival. It is not a separate
React route or hardcoded landing page.

## Screen architecture

An authored screen has two entries keyed by the same `component` name:

1. a `ComponentContract` in `agent-dev-server/src/surfaces/`; and
2. a React component in `agent-dev-client/src/app/agent/surfaces/`.

The platform generates one `Render<Component>` tool from each contract. The LLM calls that tool; the
server emits surface events and the client resolves the matching component. Reusing a `surfaceId`
updates the existing screen in place. A new id creates a new screen position in the turn history.

Contracts declare the props the model may provide and, when needed:

- `actions` for events that start a new turn;
- `publishes` for values a screen writes to its data model;
- `fallbackTemplate` for MCP and channels that cannot render React; and
- validation or composition hooks for non-trivial contracts.

`RenderSectionStack` composes multiple contract-backed sections into one screen. Prefer it when
several sections must appear together; do not create a second page-frame component inside the stage.

The stage shell owns viewport layout, scrolling, input, navigation rail, and optional site header.
`SITE_CONFIG.mode` selects a transcript-like chat view or a site view where the latest screen becomes
the page. Authored screens are natural-height content inside the stage column; they do not own the
viewport, root scrolling, dock, or global navigation.

## Backend extension seams

Choose the smallest seam that matches the behavior:

| Need | Extension seam |
|---|---|
| Deterministic reads or mutations used by React | tRPC router |
| An action the LLM must decide to call | Custom backend tool |
| External service operation | Existing MCP tool, or a custom tool when MCP cannot express it |
| External event | Registered trigger handler |
| Work at a future time or cadence | Registered schedule handler |
| Independent LLM specialization inside a turn | Generated-agent subagent |

tRPC calls travel over the existing WebSocket `RpcPeer`; there is no separate browser tRPC HTTP
endpoint. Mutations built with `loggedProcedure` write an owner/customer-visible action summary and
invalidate live-query topics. Components subscribed through `useLiveQuery` refetch after invalidation
and after reconnect.

Custom tools return model-facing output and may expose an inline UI component. Screens are not custom
tool classes: their tools are generated from contracts.

## Data and lifecycle

Use storage according to the lifetime and audience of the data:

- **Records** — durable business entities such as bookings, orders, catalog items, or per-visitor
  data, with an explicit access class.
- **AgentStorage** — durable files and generated-agent resources.
- **State tree** — live workflow and screen state that must synchronize with the current session.
- **Session history** — conversation messages and recoverable tool/component results.
- **External service** — data whose authority remains outside Agentplace.

The VM can suspend when idle. In-memory state, `setTimeout`, and `setInterval` do not survive that
lifecycle. Use durable state plus schedules or triggers for work that must happen later. Handlers must
be safe to retry because inbox delivery and restarts can repeat work.

Environment values are supplied through `.env.runtime`; a change restarts the development server.
Provider credentials are relayed by the platform and must not be written into source, prompts,
conversation history, or logs.

### Learner memory (this agent)

The one piece of durable per-visitor data Learny keeps. The records plane is NOT enabled for this
account — `ctx.records` denies every write at runtime while the build stays green — and `private/` is
scoped to one session, which is the amnesia the feature exists to fix. So the profile lives in
AgentStorage under `common/learners/<id>.json`, with per-learner scoping done in the filename and the
id validated against `LEARNER_ID_PATTERN` before it reaches a path.

- `trpc/routers/learner-profile.ts` — pure merge rules (visit counting, mistake tallying, level, the
  briefing sentence) plus two io helpers, so the rules are unit-tested without a storage backend.
  Read-modify-write is serialised per learner: a call ending while the desk saves a correction is two
  mutations on one file, and last-write-wins would drop one.
- `trpc/routers/learner.router.ts` — `get`, `arrive`, `remember`, `forget`. `arrive` and `remember` are
  `loggedProcedure`, which is how the memory reaches the model: their `logSummary` is flushed into the
  next turn's context, so no tool call and no extra turn is spent on it. `arrive` also keeps the
  learner id in `private/learner-id.json`, the session-scoped fallback for a browser that refuses
  `localStorage`, and the same record makes a re-mount idempotent (a visit is a session, not a load).
  `get` takes the id as OPTIONAL and falls back to that same session copy: the progress screen can be
  the first thing a page load mounts, so it must be able to ask "who is here" without having been told.
- `app/agent/blocks/learner.ts` — the browser side: the id, one shared arrival per page load, the
  read-only `useLearnerProfile` for the progress screen (a read, never a visit), and the
  fire-and-forget `rememberLearner`. Written turns are filed through a local ledger of reported
  message ids, because the writing desk derives its thread from session history and a reload would
  otherwise re-count every turn it replays.

Client writes are deliberate: what is worth remembering is mostly OBSERVED by a page (a language
pressed, seconds the microphone was open, a correction the desk already parsed), and routing those
through the model would be slower and less accurate. Only the level estimate is the agent's judgement.

## Instruction, skills, and configuration

- `instruction.md` defines stable generated-agent behavior, persona, grounding, and tool/screen use.
- `.agent/skills/<name>/SKILL.md` contains domain knowledge and workflows. Autoloaded skills enter
  every generated-agent turn; other skills expose routing metadata and are read on demand.
- `src/config.ts` selects model and voice behavior.
- `site-config.ts` selects brand name, navigation, appearance, optional header, and site/chat mode.
- `theme.css` is the lightweight per-agent brand-accent seam.

Keep knowledge out of `instruction.md` when it belongs in a skill. Keep implementation mechanics out
of both when the tool schema or code is the authority.

## External surfaces

Every published agent exposes MCP operations through `/mcp`. MCP uses the same agent behavior but
projects screens to text and removes reasoning from the result.

Messaging-channel adapters use the shared channel runner for streaming, placeholder updates, text
chunking, attachment policy, and durable channel-to-session mapping. Each adapter adds only its
platform-specific inbound gate, renderer, and delivery calls.

Triggers enter through the durable inbox and dispatch to named handlers. Schedules invoke registered
handlers. Unhandled events may fall back to the LLM, but production flows should prefer explicit,
idempotent handlers when behavior must be deterministic.

## Build and observability

The server is Node.js ESM and the client is React/Tailwind. Use ESM-compatible dependencies and the
existing package/build scripts. Platform-specific channel SDKs may require the runtime-import pattern
documented by the channel skills.

Build status is available separately from durable server and browser runtime logs. Execution traces
explain generated-agent model decisions. A clean build, empty error search, screenshot, or successful
tool call proves only what that evidence directly observes.

## Critical invariants

1. A screen contract and React component use the same `component` key; the generated render tool is
   derived from that contract.
2. Contract props cannot collide with shared render parameters such as `surfaceId`, `dataModel`,
   `fallbackMarkdown`, `chips`, `nav`, or `voiceSummary`.
3. Authored screens live inside the stage frame and never create another viewport, root scroll area,
   global input, or app navigation shell.
4. A tool produces inline component content only when it declares a component name; plain tools rely
   on their output and the agent's narrative.
5. Session ids start with a letter or digit, stay within 128 characters, and use only letters,
   digits, `_`, `.`, `:`, or `-`; path separators are invalid.
6. One session processes one message at a time; design actions and handlers for that ordering.
7. Live data mutations must invalidate the topics their UI reads.
8. Important state survives VM sleep only when stored durably.
9. Screens that accept sensitive values must use supported field contracts so platform withholding
   and voice projection can recognize them.
10. Channel output requires a truthful text fallback when its customer cannot see the web screen.
