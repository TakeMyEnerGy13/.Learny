# Learny.ai

Learny.ai is an Agentplace web agent for live spoken and written practice in English, Russian, Spanish and German. It keeps a small learner profile for the same browser — without forcing a login — so returning visitors can resume a language, a scene and recurring corrections.

> This is a **clean source backup of Learny's agent-owned layer**, not a static website. It needs the Agentplace runtime for server turns, WebSocket voice, model access and durable learner storage. GitHub Pages cannot run this project.

## Included

- React screens, motion, brand styling and browser-side learner-memory wiring
- Agent instruction, screen contracts and learner-profile tRPC routes/tests
- Russian, Spanish and German interface translations (English is the source locale)
- The product specification and architecture notes
- Build configuration for the client and server projects

## Deliberately excluded

- Runtime credentials and connected-service configuration
- Agentplace platform/vendor code, generated output and local dependencies
- Learner data and session history

## Restoring in Agentplace

1. Start from a compatible Agentplace full-stack agent template.
2. Copy the matching `agent-dev-client/src/app/agent/` and `agent-dev-server/src/{config.ts,instruction.md,surfaces/,trpc/}` paths.
3. Copy `.agent/locales/` and the `.agentplace/` documents.
4. Restore service connections and environment values privately in Agentplace — never commit them.
5. Run the client/server tests and use Preview to verify voice and learner-memory flows.

## Product limits

The public demo has no accounts, checkout, certificates or cross-device learner sync. Voice is opened only by the visitor and uses the platform realtime runtime. Pricing is presentation-only until payment is deliberately connected.
