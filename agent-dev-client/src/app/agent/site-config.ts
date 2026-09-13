import './theme.css';
import type { LocalizedNavItem } from '@/app/lib/stage/nav-model.ts';
import type { AgentHeaderProps } from '@/app/lib/stage/StageHeader.tsx';
import type { FC } from 'react';
import { type MessageDescriptor, defineMessages } from 'react-intl';
import { LearnyHeader } from './LearnyHeader.tsx';

export interface SiteConfig {
  brandName: string;
  navItems: LocalizedNavItem[];
  defaultChips: MessageDescriptor[];
  /** Page-area mode: 'site' = the latest surface IS the page; 'chat' = a
   *  scrolling transcript with inline surfaces. Same shell either way. */
  mode: 'site' | 'chat';
  /** Site header (brand + menu). Off = minimal canvas: the rail keeps
   *  history, chips keep the standing intents, the dock keeps input.
   *  Template default is off; a branded site turns it on. */
  showHeader: boolean;
  /** Custom header component. Omit for the template's default header
   *  (monogram + name + menu); provide one for a bespoke composition —
   *  it receives resolved nav items + onNavigate, so menu mechanics and
   *  the agent's /nav overlay keep working. */
  Header?: FC<AgentHeaderProps>;
  /** First-load pending state shows the brand name (shimmer) instead of the
   *  neutral text skeleton — for agents with a website identity. */
  brandedArrival?: boolean;
  /** The site's designed look — a builder decision, like a real website's.
   *  'auto' follows the visitor's OS. */
  appearance: 'light' | 'dark' | 'auto';
  /** Omnibox placeholder override. */
  placeholder?: MessageDescriptor;
}

/**
 * Iteration 3: the site has its own header — the ".Learny" wordmark (logo and
 * name in one) plus the mechanical interface-language switcher. Practice
 * languages are switched on the hero itself, so nothing here spends an agent
 * turn on that.
 *
 * No suggestion chips: the hero carries every control the visitor needs, and
 * `instruction.md` forbids the agent from writing `/chips`, so the strip above
 * the dock stays empty and the composition stays quiet.
 */
const siteMessages = defineMessages({
  askPlaceholder: {
    id: 'composer.askOrType',
    defaultMessage: 'Ask us — or practise in writing',
    description:
      'Invitation shown inside the empty composer. Names WHO answers ("us") and both jobs the line does, ' +
      'and stays short enough to survive a 390px viewport without truncating. Deliberately not about ' +
      'choosing a language — the hero already carries that control.',
  },
});

export const SITE_CONFIG: SiteConfig = {
  brandName: '.Learny',
  navItems: [],
  defaultChips: [],
  mode: 'site',
  showHeader: true,
  Header: LearnyHeader,
  brandedArrival: true,
  appearance: 'dark',
  placeholder: siteMessages.askPlaceholder,
};
