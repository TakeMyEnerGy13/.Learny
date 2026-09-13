# Learny.ai — live voice language practice (Agent Games demo)

## Status of this document

This is the owner's brief plus what has since been built and accepted in review. Nothing in it is
invented by Builder: any value the owner has not decided yet is marked OPEN and must be asked, never
defaulted. Accepted behaviour and the owner's design decisions live in `specification.md`; stable
boundaries live in `high-level-architecture.md`.

## What this is

Learny.ai is a demo built for the Agent Games challenge: a multilingual site whose selling point is
that you can speak with the agent out loud, live, right on the page. Prices and plans are arbitrary
demo values, not a real commercial offer.

## Who it is for

A deliberately mixed audience — the site is multilingual, not aimed at one country. For the demo the
interface supports four languages: Russian, English, Spanish, German.

## Two languages, and where they meet

The **interface language** and the **spoken practice language** are separate choices in this product:

- the interface language is chosen by the visitor in the header switcher, and it is what they read;
- the practice language is chosen on the hero and in the room, and it is what the conversation is in.

Outside a call they stay separate: picking Spanish practice leaves a Russian page Russian. They MEET
during a spoken call, because the platform gives a session exactly one language and the voice speaks
that one: pressing the microphone commits the practice language for the length of the call — labels
included — and the visitor's own interface language returns when the call ends. This is the product's
immersion mode, and it is the only shape the platform allows; a Russian interface with an English voice
was tested three times and is impossible. Both switchers stay mechanical: they change the page without
spending an agent turn. The spoken half is verified by the owner in a live call, because only the
visitor can grant microphone access.

## Monetization

Not important for the demo; a simple subscription story is enough. Amounts are OPEN.

## Delivered capabilities

- Arrival asks two questions before the site is shown — "what language do you speak?" and "which one
  do you want to speak?" (all four offered, including their own: polishing the language you already
  speak is a real reason to be here) — and then opens the site already set up: the interface in the
  visitor's own language, the conversation in the one they are learning. The first answer switches the
  interface mechanically (the second question is already in their language); only the last press spends
  an agent turn. A quiet "just show me the site" walks past the questions.
- The home screen: brand hero with the offer in interface copy, a particle flag of the practice
  language, the pearl voice control at its centre, the quiet practice-language rail, and the three
  qualifier plates.
- Under it, a still "How it works" section: three steps on a staircase grid, each hanging under a
  hairline that starts in the brand gradient and dissolves. All interface copy, so the header's
  language switcher retranslates it instantly and it costs no agent turn.
- Below that, "What a conversation is like": a particle strip that reassembles between four phrases,
  one per language on offer, over four mechanics zigzagging down the page — the live stream,
  interruption, corrections, ending or typing instead. A trail of fireflies walks the steps in time
  with the scroll and lights each one as it arrives.
- A "Plans" block with three tiers (0 / €9 / €19 a month), tier names in the decorative script.
  Presentation only: no payment is connected, so the free plan's button returns the visitor to the
  microphone and the paid plans read "soon".
- A second page, the practice room: the working screen, reached by one control placed right after
  "What a conversation is like" or from the header. It fits on ONE screen, top to bottom: "I want to
  speak" with the language rail, the large pearl microphone inside the particle flag of the language
  being practised, one status slot (the invitation, or the equaliser and the measured length of the
  call), the pace, and — at the foot, so the top stays light — "how the conversation goes" with the
  four modes in a row. The room's own three controls are what the landing page does not have: how the
  conversation goes (free talk, role-play, questions only, close correction), which scene the
  role-play is (cafe, airport, meeting someone, job interview, doctor's), and how fast we speak
  (slower, normal, like a native). Each is mechanical: a press changes a conversation already running,
  mid-sentence, without an agent turn — and it does so by rewriting the short brief the page hands the
  live call, which is what actually makes the plates do something rather than just light up. The same
  setup is also written into the visitor's own notes, which the call is handed as it opens: that is
  what makes the role-play START in the scene — the airport greets you at the door of the plane — and
  it carries a standing permission to move the whole conversation into the practice language as soon
  as the visitor speaks it. None of the offer is here — no plans, no qualifier plates — and
  nothing to scroll: the practice tips, the microphone warning and the "back to the site" link were
  removed to keep the room on one screen. The way back to the site is the wordmark in the header. The
  practice mechanism itself is shared with the hero, so both pages agree on what a live call is doing.
- A custom site header: the `.Learny` wordmark — which is also the way back to the landing page — the
  mechanical interface-language switcher, and a "to the conversation" control beside it, in the brand
  gradient like the landing page's own call to action, that opens the practice room from anywhere.
- A third page, the writing desk: written practice with the whole exchange kept on the page —
  reached by the "go to the chat" door under a typed answer, or by asking to practise in writing. The
  visitor's lines sit on the pearl they press to speak, ours on the brand hairline, and under each
  answer at most one correction row (the fix itself, in the language they read) — which is the part
  that makes it practice rather than a chat window. Its conversation is read from the session itself
  rather than passed around, so nothing on it can drift from what was actually written; a spoken
  conversation never appears there. The input stays the same line at the bottom of the window.
- The white input line at the bottom of the window: questions about us answered in a note under the
  hero (`answer` prop), a door from that note into the writing desk, and a second microphone. Plan
  facts come from the autoloaded `plans` agent skill.
- Live spoken practice in four languages through the platform realtime voice gateway, opened only by
  the visitor pressing a microphone. The call opens listening rather than with a greeting: the visitor
  says the first line and the voice answers in the pressed scene and practice language.
- Learny's own voice visualisation: the equaliser inside the input dock is ours, drawn from the
  session's real audio levels.
- Written practice on its own page, and questions through the composer, answered in the interface
  language.
- Memory of a returning student, without a login. The site recognises the browser and opens with "С
  возвращением", the language they were practising, what we know about them (last visit, level
  estimate, minutes spoken, lines written, mistakes still open) and one press to carry on. The pages
  record it as it happens — the language pressed, the minutes the microphone was open, the scene, and
  the corrections the writing desk already parsed — and the agent is briefed with a one-line summary on
  the visitor's next message, so it greets them knowing who they are. "Забыть меня" erases it all.
- A page of what we remember — "Что мы помним". The learner can open the memory itself: practice
  language, level estimate labelled as an estimate, minutes spoken, lines written, visits, scenes
  played, and every correction we hold with how often it came back. One press turns those corrections
  into a spoken drill in the practice room, and "забыть всё" wipes the profile from the page.

## Product-wide limits

- Live voice runs only inside this agent's own web surface; there is no embeddable widget, and the
  agent's outward interfaces are text-only.
- A voice session is always opened by the visitor — the hero's pearl control and the dock microphone
  both act on their press. The agent may invite a call and never starts one.
- Voice minutes are metered against the owner's credits, so a demo conversation is deliberately
  short and the agent keeps a monthly ceiling.
- Authored screens live inside the stage's centered column: no full-bleed sections, no viewport-height
  sections, no own scroll container, no fixed or sticky elements. Anything in the input dock is
  reachable only by styling the shell's own slot from `theme.css`.
- No accounts, paid plans, certificates or written progress reports exist in this build. The learner
  memory is not an account: it belongs to one BROWSER, is stated as such wherever it shows, and the
  level it holds is an estimate, never a graded result.
