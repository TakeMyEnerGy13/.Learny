/**
 * What makes the practice room a room and not a second hero: the three controls
 * that change HOW the conversation goes, not just which language it is in.
 *
 * - the MODE — an ordinary conversation, a role-play, a grilling of questions, or
 *   close correction;
 * - the SCENARIO — which role-play, shown only when the role-play mode is chosen,
 *   because five scenarios beside a mode nobody selected is just noise;
 * - the PACE — how fast and how simply we speak.
 *
 * All three are mechanical in exactly the same way as the language rail: a press
 * writes a published pointer, the running voice call re-reads it before its next
 * sentence, and the agent is never called. So the visitor can turn a free chat
 * into an airport counter mid-conversation without hanging up.
 *
 * The modes are PLATES and the pace is a rail, deliberately: a mode is a decision
 * you make once and see at a glance, while the pace is a small adjustment of the
 * same kind as the language. Everything is interface copy, so the header's
 * language switcher retranslates all of it with no agent turn.
 */
import {
  Coffee,
  Drama,
  Handshake,
  type LucideIcon,
  MessageCircle,
  MessageCircleQuestionMark,
  Plane,
  SpellCheck,
  Stethoscope,
  UsersRound,
} from 'lucide-react';
import type { FC } from 'react';
import { defineMessages, useIntl } from 'react-intl';

import { ChoiceRail } from './practice-voice.tsx';

export type PracticeMode = 'free' | 'scenario' | 'questions' | 'corrections';
export type PracticeScenario = 'cafe' | 'airport' | 'meeting' | 'interview' | 'doctor';
export type PracticePace = 'slow' | 'normal' | 'native';

export const PRACTICE_MODES: PracticeMode[] = ['free', 'scenario', 'questions', 'corrections'];
export const PRACTICE_SCENARIOS: PracticeScenario[] = [
  'cafe',
  'airport',
  'meeting',
  'interview',
  'doctor',
];
export const PRACTICE_PACES: PracticePace[] = ['slow', 'normal', 'native'];

const messages = defineMessages({
  modeGroup: {
    id: 'room.mode.group',
    defaultMessage: 'How the conversation goes',
    description: 'Heading over the four conversation modes in the practice room.',
  },
  modeFree: {
    id: 'room.mode.free',
    defaultMessage: 'Free talk',
    description: 'Name of the mode where the conversation is an ordinary chat.',
  },
  modeFreeBody: {
    id: 'room.mode.free.body',
    defaultMessage: 'We just talk, about whatever you bring.',
    description: 'One line describing the free-talk mode.',
  },
  modeScenario: {
    id: 'room.mode.scenario',
    defaultMessage: 'Role-play',
    description: 'Name of the mode where the agent plays a role in a situation.',
  },
  modeScenarioBody: {
    id: 'room.mode.scenario.body',
    defaultMessage: 'We play a scene — I stay in my role.',
    description: 'One line describing the role-play mode.',
  },
  modeQuestions: {
    id: 'room.mode.questions',
    defaultMessage: 'Questions only',
    description: 'Name of the mode where the agent mostly asks questions.',
  },
  modeQuestionsBody: {
    id: 'room.mode.questions.body',
    defaultMessage: 'I ask, you do the talking.',
    description: 'One line describing the questions-only mode.',
  },
  modeCorrections: {
    id: 'room.mode.corrections',
    defaultMessage: 'Close correction',
    description: 'Name of the mode where mistakes are corrected closely.',
  },
  modeCorrectionsBody: {
    id: 'room.mode.corrections.body',
    defaultMessage: 'I fix your mistakes and say why, briefly.',
    description: 'One line describing the close-correction mode.',
  },
  scenarioGroup: {
    id: 'room.scenario.group',
    defaultMessage: 'The scene',
    description: 'Heading over the role-play scenarios, shown only in role-play mode.',
  },
  scenarioCafe: {
    id: 'room.scenario.cafe',
    defaultMessage: 'In a cafe',
    description: 'Role-play scenario: ordering something in a cafe.',
  },
  scenarioAirport: {
    id: 'room.scenario.airport',
    defaultMessage: 'At the airport',
    description: 'Role-play scenario: an airport counter.',
  },
  scenarioMeeting: {
    id: 'room.scenario.meeting',
    defaultMessage: 'Meeting someone',
    description: 'Role-play scenario: meeting a person for the first time.',
  },
  scenarioInterview: {
    id: 'room.scenario.interview',
    defaultMessage: 'Job interview',
    description: 'Role-play scenario: a job interview.',
  },
  scenarioDoctor: {
    id: 'room.scenario.doctor',
    defaultMessage: "At the doctor's",
    description: 'Role-play scenario: describing a complaint to a doctor.',
  },
  paceGroup: {
    id: 'room.pace.group',
    defaultMessage: 'Pace',
    description: 'Quiet lead-in over the three speaking-pace choices.',
  },
  paceSlow: {
    id: 'room.pace.slow',
    defaultMessage: 'slower',
    description: 'Speaking pace: short sentences, common words, clear pauses.',
  },
  paceNormal: {
    id: 'room.pace.normal',
    defaultMessage: 'normal',
    description: 'Speaking pace: unhurried but natural.',
  },
  paceNative: {
    id: 'room.pace.native',
    defaultMessage: 'like a native',
    description: 'Speaking pace: full speed, no simplification.',
  },
});

const MODE_ICONS: Record<PracticeMode, LucideIcon> = {
  free: MessageCircle,
  scenario: Drama,
  questions: MessageCircleQuestionMark,
  corrections: SpellCheck,
};

const SCENARIO_ICONS: Record<PracticeScenario, LucideIcon> = {
  cafe: Coffee,
  airport: Plane,
  meeting: UsersRound,
  interview: Handshake,
  doctor: Stethoscope,
};

/**
 * The four modes as pressable plates. One row on a wide screen, two columns on a
 * narrow one: the room must fit on a single screen (owner decision), and four
 * across costs it one band of height instead of two. Each plate keeps its
 * explanatory line — that line is the reason a visitor can tell "Questions only"
 * from "Free talk" without trying both.
 */
export const ModeGrid: FC<{
  mode: PracticeMode;
  onSelect: (mode: PracticeMode) => void;
}> = ({ mode, onSelect }) => {
  const intl = useIntl();

  const copy: Record<PracticeMode, { title: string; body: string }> = {
    free: {
      title: intl.formatMessage(messages.modeFree),
      body: intl.formatMessage(messages.modeFreeBody),
    },
    scenario: {
      title: intl.formatMessage(messages.modeScenario),
      body: intl.formatMessage(messages.modeScenarioBody),
    },
    questions: {
      title: intl.formatMessage(messages.modeQuestions),
      body: intl.formatMessage(messages.modeQuestionsBody),
    },
    corrections: {
      title: intl.formatMessage(messages.modeCorrections),
      body: intl.formatMessage(messages.modeCorrectionsBody),
    },
  };

  return (
    <section className="flex flex-col items-center gap-2.5">
      <h2 className="text-[0.6875rem] uppercase tracking-caps text-muted-foreground-subtle">
        {intl.formatMessage(messages.modeGroup)}
      </h2>
      <div
        role="group"
        aria-label={intl.formatMessage(messages.modeGroup)}
        className="grid w-full gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {PRACTICE_MODES.map((candidate) => {
          const Icon = MODE_ICONS[candidate];
          const selected = candidate === mode;
          return (
            <button
              key={candidate}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(candidate)}
              className={`group flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-left transition-[border-color,background-color,transform] duration-300 ease-out [touch-action:manipulation] hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                selected
                  ? 'border-[hsl(var(--learny-aqua-2)/0.55)] bg-[hsl(var(--learny-aqua-1)/0.09)] shadow-[inset_0_1px_0_hsl(var(--learny-aqua-3)/0.25)]'
                  : 'border-foreground/10 bg-foreground/[0.02] hover:border-foreground/25'
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`mt-0.5 size-4 flex-none transition-colors duration-300 ${
                  selected
                    ? 'text-[hsl(var(--learny-aqua-3))]'
                    : 'text-muted-foreground-subtle group-hover:text-foreground/70'
                }`}
                strokeWidth={1.5}
              />
              <span className="flex flex-col gap-1">
                <span
                  className={
                    selected
                      ? 'learny-aqua-text-sm text-[0.9375rem] font-medium'
                      : 'text-[0.9375rem] text-foreground/90'
                  }
                >
                  {copy[candidate].title}
                </span>
                <span className="text-[0.8125rem] font-extralight leading-relaxed text-foreground/55">
                  {copy[candidate].body}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

/**
 * The scenes, as small pills — only rendered while the role-play mode is live, so
 * the page never shows a choice that does not apply to the conversation running.
 */
/**
 * The scenes by their interface names, in the ONE place they are defined. The room
 * labels its chips from this, and the progress page names the scenes a learner has
 * already played from it too — a second copy of these five strings would drift the
 * moment one of them was reworded.
 */
export function useScenarioLabels(): Record<PracticeScenario, string> {
  const intl = useIntl();
  return {
    cafe: intl.formatMessage(messages.scenarioCafe),
    airport: intl.formatMessage(messages.scenarioAirport),
    meeting: intl.formatMessage(messages.scenarioMeeting),
    interview: intl.formatMessage(messages.scenarioInterview),
    doctor: intl.formatMessage(messages.scenarioDoctor),
  };
}

export const ScenarioChips: FC<{
  scenario: PracticeScenario;
  onSelect: (scenario: PracticeScenario) => void;
}> = ({ scenario, onSelect }) => {
  const intl = useIntl();

  const labels = useScenarioLabels();

  return (
    <section className="flex flex-col items-center gap-2">
      <h3 className="text-[0.6875rem] uppercase tracking-caps text-muted-foreground-subtle">
        {intl.formatMessage(messages.scenarioGroup)}
      </h3>
      <div
        role="group"
        aria-label={intl.formatMessage(messages.scenarioGroup)}
        className="flex flex-wrap justify-center gap-2"
      >
        {PRACTICE_SCENARIOS.map((candidate) => {
          const Icon = SCENARIO_ICONS[candidate];
          const selected = candidate === scenario;
          return (
            <button
              key={candidate}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(candidate)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8125rem] transition-colors duration-300 [touch-action:manipulation] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none ${
                selected
                  ? 'border-[hsl(var(--learny-aqua-2)/0.55)] bg-[hsl(var(--learny-aqua-1)/0.1)] text-foreground'
                  : 'border-foreground/10 bg-transparent text-muted-foreground-subtle hover:border-foreground/25 hover:text-foreground/85'
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`size-3.5 flex-none ${
                  selected ? 'text-[hsl(var(--learny-aqua-3))]' : ''
                }`}
                strokeWidth={1.5}
              />
              {labels[candidate]}
            </button>
          );
        })}
      </div>
    </section>
  );
};

/** How fast we speak — the same rail as the language, because it is the same kind
 *  of small adjustment. */
export const PaceRail: FC<{
  pace: PracticePace;
  onSelect: (pace: PracticePace) => void;
}> = ({ pace, onSelect }) => {
  const intl = useIntl();

  const labels: Record<PracticePace, string> = {
    slow: intl.formatMessage(messages.paceSlow),
    normal: intl.formatMessage(messages.paceNormal),
    native: intl.formatMessage(messages.paceNative),
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[0.6875rem] uppercase tracking-caps text-muted-foreground-subtle">
        {intl.formatMessage(messages.paceGroup)}
      </span>
      <ChoiceRail
        items={PRACTICE_PACES.map((candidate) => ({ value: candidate, label: labels[candidate] }))}
        value={pace}
        label={intl.formatMessage(messages.paceGroup)}
        onSelect={onSelect}
      />
    </div>
  );
};
