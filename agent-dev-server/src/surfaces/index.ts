/**
 * This agent's surface catalog: one contract file per screen, aggregated
 * here. The platform derives the `Render<Component>` tool, schema,
 * validation, and fallback from each contract; each entry pairs with one
 * React component in `agent-dev-client/src/app/agent/surfaces/`.
 * `PropSpec.description` and `purpose` are model-facing — do not paraphrase.
 */

import type { ComponentContract } from '../../vendor/agentplace-a2ui/contract-schema.ts';
import { HERO_STAGE } from './hero-stage.ts';
import { LEARNER_PROGRESS } from './learner-progress.ts';
import { MENU_BOARD } from './menu-board.ts';
import { LANGUAGE_ONBOARDING } from './onboarding.ts';
import { PRACTICE_ROOM } from './practice-room.ts';
import { WRITING_DESK } from './writing-desk.ts';

export const AGENT_CATALOG_ID = 'agent:custom-v1';

export const AGENT_SURFACE_CONTRACTS: Record<string, ComponentContract> = {
  [HERO_STAGE.component]: HERO_STAGE,
  [LEARNER_PROGRESS.component]: LEARNER_PROGRESS,
  [MENU_BOARD.component]: MENU_BOARD,
  [LANGUAGE_ONBOARDING.component]: LANGUAGE_ONBOARDING,
  [PRACTICE_ROOM.component]: PRACTICE_ROOM,
  [WRITING_DESK.component]: WRITING_DESK,
};
