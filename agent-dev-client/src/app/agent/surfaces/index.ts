/**
 * This agent's custom surface components — the client half of the agent's
 * catalog (server half: `agent-dev-server/src/surfaces/`). Each entry maps a
 * `ComponentContract.component` name to its React realization; add one line
 * per screen the builder authors. `SurfaceRenderer` consults this before the
 * platform builtin catalog and the v1 primitives.
 */
import type { FC } from 'react';
import type { A2uiNodeViewProps } from '@/app/lib/a2ui/catalog.tsx';
import { HeroStage } from './HeroStage.tsx';
import { LearnerProgress } from './LearnerProgress.tsx';
import { MenuBoard, MenuBoardHeader, MenuBoardItem } from './MenuBoard.tsx';
import { LanguageOnboarding } from './Onboarding.tsx';
import { PracticeRoom } from './PracticeRoom.tsx';
import { WritingDesk } from './WritingDesk.tsx';

export const AGENT_SURFACE_COMPONENTS: Record<string, FC<A2uiNodeViewProps>> = {
  HeroStage,
  LanguageOnboarding,
  LearnerProgress,
  MenuBoard,
  MenuBoardHeader,
  MenuBoardItem,
  PracticeRoom,
  WritingDesk,
};
