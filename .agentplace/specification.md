# Learny.ai — decisions, plan and open questions

## Working agreement (owner, explicit)

Work proceeds in iterations verified by the owner. Plan in words first, owner confirms, then code.
No batching several features into one unverified delivery. Missing input is asked for, never
defaulted.

## Decided by the owner

| Decision | Value |
|---|---|
| Brand name | Learny.ai |
| Logo | Deferred — no asset yet, none is to be invented |
| Nature | Agent Games demo; prices may be arbitrary |
| Interface languages | Russian, English, Spanish, German |
| Practice language | Separate from the interface language; the two are never mixed |
| Monetization | A simple subscription story; amounts OPEN |
| Text density | Minimal: an accent headline plus a short revealing description and a few qualifiers |
| Motion | Rich — minimalism applies to text, not to animation; animated flags on language switch |
| Visual reference | `https://dala.craftedbygc.com/` plus the owner-supplied DESIGN.md |
| Iteration 1 scope | The hero block only; its rules and visual language then govern later blocks |

## Visual language from the reference (owner-supplied DESIGN.md)

- Pure black canvas (`#000000`), no panels, cards, borders, dividers or shadows — elements float on
  the void with whitespace alone.
- One saturated accent used only for the single filled action (reference violet `#8052ff`), plus a
  warm highlight (`#ffb829`) for small uppercase labels and emphasis. Never an accent-filled section.
- Hierarchy from scale and tracking, never weight: display headings at weight 400 with about
  `-0.04em` tracking; body at ultra-light weight 200, ~18px; small uppercase labels at weight 600
  with `+0.025em`.
- Typeface PPNeueMontreal (commercial). The reference names Inter as its substitute.
- Signature imagery is procedural and animated, not photographic.
- Generous section rhythm (60–120px) and low density: one or two elements per screenful.

## Platform constraints that reshape the reference

| Reference expects | This platform | Consequence |
|---|---|---|
| Full-bleed sections | Screens render inside the stage's centered column with shell gutters | The black canvas comes from the theme (whole page), the composition stays in-column |
| 113px display type | Column is 900px, and Russian/German run 20–40% longer than English | Responsive display scale, roughly 40px mobile → 72–84px desktop, with balanced wrapping |
| Two-column hero with art bleeding off-screen | No full-bleed, no viewport-height sections | The signature animation is a contained canvas inside the column |
| Custom nav bar | The site header has one sanctioned seam (`site-config.ts` `Header`) | The language switcher with animated flags lives there |
| Arbitrary CSS files | No new CSS files; keyframes belong in the Tailwind config | Motion uses Tailwind keyframes plus `motion-reduce:` variants |

## Open questions (owner decides; Builder must not re-default them)

1. Prices and the free allowance — nothing is named anywhere in the product yet, and the agent
   currently says paid plans do not exist.

## Iteration 1 — delivered for review

Hero block only, on the home screen (`HeroStage`):

- Left column: amber label, display headline at `clamp(2.75rem, 9vw, 5.25rem)` with tight tracking,
  ultra-light supporting line, three qualifiers on translucent glass plates.
- Right column: the pearl live-voice control over an animated particle flag of the current practice
  language, with its label and hint below the field.
- The hero is vertically generous: `py-24` on desktop, so the block sits low with open space above
  and below rather than clinging to the header.
- Copy chosen by Builder as a starting point ("Learn a language by speaking it."), written by the
  agent in the visitor's own interface language.
- Typeface Geist (Google Fonts, includes Cyrillic); pure black canvas; `--primary` violet.
- Motion: one authored scene. On arrival and on every practice-language change the particles stream
  out from behind the control and settle into the flag; then they drift and repel the pointer.
  Under `prefers-reduced-motion` the flag is painted once, assembled and still.

The voice control is pearl: an iridescent off-white gradient from the `--pearl-*` tokens, with a
warm and a cool stop, an inner highlight and a soft cast shadow. It is the only object on the page
that reads as a physical thing, which is why it is also the only accent-free element — violet stays
on chrome, the pearl carries the action.

Verified by Builder: clean build; the arrival screen renders; the Spanish and German flags both read
as their bands; interface Russian with practice German, then practice Spanish, with no leakage in
either direction.

NOT verified: a live voice call. Only a visitor can press the microphone, so whether the realtime
relay answers is unproven until the owner presses it.

## Owner decisions after iteration 1

**Brand mark.** The logo and the name are one object: the wordmark `.Learny` set in Abril Fatface
(Google Fonts). It appears in the site header and on the boot curtain, and nowhere else is a display
serif used. The earlier monogram tile is gone.

**Brand colour — a gradient, not a flat accent.** Active direction: azure light — saturated sky blue
lifting into an icy white-cyan, from an owner-supplied luminous sky reference. It fills the wordmark,
the label above the headline, the selected practice language and its hairline; `--primary` (its
saturated end) carries the platform's own controls. Small type rides the lit half of the ramp only,
because deep azure loses its edges on black at label sizes. The previous aquamarine direction is
approved-and-kept, recorded token-for-token in `theme.css` — restoring it is one edit.

**The interface owns its own words.** Every line of the home screen — label, headline, supporting
line, qualifiers, microphone hint, language names — is an interface message, not something the agent
writes into a render. Consequence: switching the interface language retranslates the whole page
instantly, and the offer cannot drift from one render to the next. The screen takes exactly one
value from the agent: which language is being practised.

**Nothing routine costs an agent turn.** Both switchers are mechanical. The header switcher commits
the session locale directly; the four practice languages on the hero repaint the flag on the spot and
write the choice into the screen's state, so the next turn and the voice session read what is
actually on screen. Translations for the four interface languages are baked into `.agent/locales/*`,
so even the first switch does not wait for a translation pass.

**No suggestion chips.** The strip above the input dock stays empty: the page carries its own
controls, and the agent is forbidden from writing `/chips`. The composer invites a question or
written practice instead.

**The dock is tinted.** The one panel below the fold sits on a blue-cast ground with a blue hairline,
so the lit object on the black canvas belongs to the brand rather than reading as neutral chrome.

**Spoken opening.** The agent speaks first once a conversation opens: one short sentence in the
practice language only — never a recital of all four — ending in a question.

**Hover on the qualifiers.** A blue halo lights up behind the plate — bloom escaping around the
edges only. The glass keeps its own colour and is never washed or refilled; the plate lifts one pixel
over 400ms. Quiet on purpose: a suggestion of light, not a highlight.

**The conversation is drawn in the brand colour.** While a live session runs, a row of 27 bars under
the voice control rides the session's real audio levels: the microphone's while it listens, the
playback's while the agent talks, with the status line switching between "Listening…" and
"Speaking…". The colour sweeps across the row rather than per bar, so it reads as one object.

The dock's equaliser is OURS now, drawn in its own slot, after the owner's reference: a soft azure
band with a minimal white instrument inside it. A screen may not position anything over the dock (no
`fixed`, and there is no dock seam in `site-config.ts`), and the platform's equaliser is a canvas
painted by platform code — so `theme.css` hides that canvas and paints the slot itself in two layers:
`::before` the blurred gradient band that brightens with the conversation, `::after` a centred cluster
of 21 hairline bars, each one its own background layer sized by its own live measurement.

Every bar is real. `LearnyHeader` runs an animation-frame bridge that reads the session's own
microphone and playback levels, normalises them against a decaying peak (auto-gain, so a quiet
speaker still fills the bars), and publishes a trail of recent levels as `--learny-voice-0…10` plus
`--learny-voice-amp` / `--learny-voice-glow`. The CSS mirrors that trail around the middle, so the
centre bar is the sound happening right now and its neighbours are the moments just before — the wave
travels outward. Silence rests the cluster into a fine row; nothing loops on its own. The band is
azure-dominant rather than pale, and the shell's transcript line — which defaults to the very bottom,
straight through the instrument — is lifted to the top of the slot from `theme.css`, so words and wave
each keep their own air while the mute/end buttons stay where the shell put them. The bridge
lives in the header because the header is always mounted, so the strip keeps working away from the
hero; it runs only while a voice channel is open and zeroes on exit. Scoped to the dock's waveform
slot, so the hero's flag canvas is untouched; if the shell restyles that slot, the stock equaliser
returns.

## Regression fixed in review

Switching the practice language mid-conversation used to leave the voice session on the old one — it
kept insisting on Spanish after the visitor had moved the rail to English. The first attempt treated
it as an instruction problem (name the authority, tell the model the published value wins) and did not
hold, because the published value was never reaching the voice model in the first place. The real
cause is how a screen is described to a live session: only a section's declared `fields` are shown
with their current values, and the hero declared none — so the single sentence voice had about this
screen was the render's frozen fallback text, which said "Speak Spanish" for as long as the call
lasted, whatever the visitor pressed afterwards. Fixed at the contract: the hero now composes its root
node with a field declaration for the practice language, so every spoken reply is preceded by its live
value, and the fallback text names all four languages instead of claiming one. The hero also publishes
the choice at the uiState root and always renders as `surfaceId: home`, so a typed turn cannot read the
language off an older copy of the screen. Verified in writing end to end (state, re-render, and the
agent's own answer); the spoken path needs a microphone and was verified by the owner. Accepted limit:
a switch cannot cut into a sentence already being spoken, and the transcript line above the wave keeps
whatever was said before it.

A second, quieter half of the same bug surfaced right after: refreshing the browser put the rail back on
Spanish although the session was on English, so a call started straight after a refresh would have opened
in a language nobody chose. A reload replays the session's messages from the beginning, so a remounted
hero is handed the language the page opened on — and the screen used to publish that seed immediately,
which marked the pointer dirty and made the server's own snapshot lose when it arrived a moment later.
The screen now publishes only on a real event — a press, or a later render carrying a different language —
and otherwise listens: it adopts the session's stored choice, including when it lands after mount. Until
something is published the field reads empty and the agent goes by the language it rendered with, which
is correct on a first visit because nothing has overridden it yet. Verified across a refresh (English
survived), a fresh session (opens on Spanish) and a spoken-request switch to German.

## The decorative script

Owner decision: Great Vibes is Learny's second voice, for occasional decorative accents — used only
where the owner asks for it, never on its own initiative and never for running copy or controls. Its
first use is the single word for "language" in the home headline, which now reads as plain Geist with
one calligraphic word inside it.

It is available as the Tailwind `font-script` family and, preferably, the `.learny-script` helper in
`theme.css`. The helper exists because a script face cannot simply be swapped in at the same size:
Great Vibes has a small x-height and long entry/exit strokes, so it needs to sit slightly larger than
its surroundings, with its own line-height and a hair of positive tracking, or it looks shrunken and
its swashes collide with the neighbouring words. Google serves the family's Cyrillic subset
(U+0400–045F), so Russian accents are drawn in the same hand rather than falling back to a system
script.

The accented word is a translated string of its own (`hero.headline.scriptWord`), not markup inside
the headline: the headline already carries owner translations, and adding a tag would change its ICU
argument contract and invalidate every one of them. Each language therefore names the word it wants
accented, in its own grammatical form. Matching is case-insensitive on the first occurrence, and a
word that does not appear in that language's headline simply leaves it plain — a visitor can never
lose the sentence to a mismatch.

Owner decision, deliberate and not a typo to be corrected: the Russian headline drops the comma after
«язык» — «Изучайте язык говоря на нём.» Russian punctuation wants it, but a comma landing on the exit
stroke of the calligraphic word looked like a blot. The plain-text fallback headline used where there
is no screen keeps its comma, because without the calligraphy there is nothing to justify dropping it.
The German headline keeps its comma after «Sprache» for the same reason in reverse — German comma rules
are strict enough that a reader would read the omission as an error rather than as styling.

## No rule under the header

The header is separated from the page by air, not by a hairline. The theme's `--border` is a tinted
azure, so a bottom border there read as a blue line drawn across the void and broke the single-black-field
look. The background blur stays, so the wordmark remains legible over anything that scrolls beneath it.

The wordmark also needed room to breathe: it is painted with `background-clip: text`, and a background
is clipped to the element's box, so at `line-height: 1` the tail of the "y" fell outside the box and had
no gradient to show — it looked cut off. The line-height now lives on the wordmark class itself, so the
header and the boot curtain cannot drift apart.

## "How it works", under the hero

Owner decision: a still block, in the hero's language, on an unusual grid — no animation, since the
particle flag already spends the page's motion budget. Three steps (choose a language · press the
microphone · speak) descend to the right in EVEN strides, and the last lands flush with the column's
right edge. That pair of promises fixes the arithmetic: on desktop an even stride of 3 of the 12
columns forces a 6-column measure (starts 1 · 4 · 7, ends 6 · 9 · 12); the tablet range uses a stride
of 2 over a wider 8-column measure, since 6 columns there is too narrow for body copy. An earlier
7-column measure could keep only one of the two promises and limped 3 columns, then 2.
A ghost numeral and a brand-gradient hairline mark each step; the rule is its own 1px element because
a border cannot carry a gradient. On phones the staircase collapses to one column.

Its copy makes no claim this build cannot keep: four languages, switching allowed mid-conversation, one
browser permission prompt, no account, corrections while you speak, and the same practice available
typed. Every word is an interface descriptor with owner translations, so the header switcher retranslates
the section instantly and the agent spends no turn on it. It is part of the hero's own surface rather
than a `SectionStack` section, because the stack composes sections from their props alone and drops a
contract's own `compose` — which would silently remove the practice-language field the live voice reads.

Owner decision, after seeing it both ways: the gap above this section is a matter of rhythm, not of the
fold. A viewport-relative gap that pushed the whole section below the desktop fold was rejected — half a
screen of black read as a chasm rather than a pause, and the taller the window the worse it got. The
measure is instead the page's own smallest vertical interval, the ~96px between the header and the top
of the hero content, and the pause is about half again as much: with the hero's own bottom padding it
comes to ~160px on desktop, ~112px on a tablet, ~88px on a phone. So the second block IS partly visible
on a desktop first screen, and that is accepted.

## "What a conversation is like", the third block

Owner decision: a second look at the voice practice, deeper than the three steps above it, and this one
does carry motion — a particle strip that holds a phrase, tears itself apart and reassembles as the next
one, cycling «Привет, друг!» · Vamos · Lernen · Let's talk!, one phrase per language on offer. The four
phrases are DATA, not interface copy: like the flags, every visitor sees them in their own languages, so
they are never translated and never become message descriptors. The strip is labelled for screen readers
as a single image whose description names the phrases.

It reuses the hero flag's engine — triangle particles, additive blending on black, pointer push, a single
still frame under `prefers-reduced-motion` — and differs only in where the targets come from: glyphs
sampled from an offscreen canvas, which is why any script works and Cyrillic, Latin and punctuation all
arrive as plain coverage. Sampling waits for the webfont, or the particles would trace the fallback face
and change shape a moment later. The hold dominates the cycle (4200ms held, 900ms in flight): the phrases
are the point and the flight between them is punctuation, and an earlier 2600/1500 split left the strip
an unreadable band too much of the time.

The morph is a pure function of the clock — which phrase shows, and how far its reassembly has come, are
derived from the frame timestamp alone. An earlier version kept that phase in mutable state, and the
resize observer reset it to the first phrase on every callback, so «Привет, друг!» morphed into itself
forever. Nothing is remembered between frames now, so no rebuild — a resize, a late webfont — can strand
the field on one phrase. Each particle's route through the four phrases is fixed once at build time,
since a route re-rolled per frame would boil.

Below the strip the four mechanics ZIGZAG down the page — owner decision, after a mirrored staircase and a
tab selector were both tried and rejected: left, then right and lower, then left and lower again. Each step
owns its own grid row, because otherwise a left and a right step would share one (they fit side by side) and
the zigzag would collapse into two rows of pairs. Desktop uses a 5-column measure on columns 1 and 8, which
leaves the middle two columns as the channel the trail travels down; the tablet range overlaps its halves
(8 columns starting at 1 and 5) because 5 of 12 is too narrow for body copy there; on a phone the steps are
full width and the trail runs straight down their numerals.

The scroll IS the animation. A path measured through the numeral of every step — a cubic through the anchors,
so the zigzag reads as one flowing line instead of a chain of corners — draws itself as the reader scrolls,
with a small swarm of fireflies at its head, and each step lights up (numeral to aqua, hairline wiped in,
body out of the grey) as the swarm arrives. Nothing runs while the page is still: scrolling schedules one
frame, and that frame moves the swarm by setting attributes on the SVG directly. No React state is touched
per frame — only when the swarm crosses into a new step — because a re-render per scroll frame is exactly
the jank that would be felt in the hero's voice control on the same page. Each firefly's twinkle is a CSS
keyframe, so the compositor owns it. Geometry is re-measured on resize rather than hard-coded, so the path
follows the layout at every breakpoint. Hovering a step lights it early: the pointer is an accelerator, never
the only way in, and every step is readable untouched. Reduced motion gets the path fully drawn, a still
firefly resting on each step, and no scroll listener at all.

The steps claim only what this build does — a live stream instead of recorded messages, interruption,
corrections inside the reply, and ending the call or continuing typed. The owner removed a fifth step
about the practice language being independent of the interface language: the hero's rail already shows
it, and the block reads better at four. A quiet footnote states the demo's metered voice minutes rather
than hiding them. No accounts, levels, courses or streaks are mentioned, because none exist.

The heading carries one word in the decorative script — «разговор» / "conversation" / "Gespräch" — through
the same translated-descriptor mechanism as the hero headline, now shared by both (`blocks/decorateHeadline`).
Owner decision: the script is set at 1.5em of its surroundings, up from 1.3, so the accented word reads as
the same size as the plain words beside it instead of as a smaller guest; its line-height drops to 0.78 to
keep the display leading intact at that size.

## The line at the bottom, and where a typed answer goes

The dock is the agent itself, and it does four things the sections cannot: written practice for
someone who cannot speak out loud, questions about us answered without hunting the page, a spoken
request to change the practice language, and a second microphone for a visitor who has scrolled
away from the hero.

It had a hole in it. This is site mode: once a screen is up, the agent's reply TEXT is shown
nowhere — so the line accepted questions whose answers were invisible. `HeroStage` therefore
carries an optional `answer` prop, and `blocks/AnswerNote.tsx` renders it as a quiet note directly
under the hero, with the brand hairline struck down its left edge (the top hairline already means
"marked plan"). The note brings itself into view, because the visitor typed from the bottom of the
window and may have had the plans on screen; it is dismissible, and dismissal is remembered by the
answer TEXT, so the next reply opens it again by itself.

The note holds exactly ONE answer, though, and the next one overwrites it. That is enough for "what
does it cost" and nowhere near enough to practise in, so on owner review the note grew a door:
**"Перейти в чат"**, a quiet gradient text link with an arrow at its foot (a real dispatch,
`openWritingDesk`, not a link — the agent opens the page seeded with the language in play). The
owner's decision was explicit: keep the bottom line as it is, and give written practice a page of its
own. Owner-facing rule: a typed reply worth reading still goes in `answer` — a price, a confirmed
language — while a written CONVERSATION belongs on the writing desk below.

Owner decision: the resting input line is WHITE, like the pearl voice control, so the composition
reads literally — the canvas is void, everything you act with is light. It cannot be done with
`--card` alone (the platform paints the pill's ink with `--foreground`, white for the whole site),
so `theme.css` redeclares the small palette ON the pill, where it cascades to the input, placeholder,
icons and send key and reaches nothing outside. A live voice session is a different branch of the
omnibox, so it keeps the dark bar with our equaliser. The placeholder names who answers and both
jobs, short enough to survive a 390px viewport: «Спросите нас — или практикуйтесь письменно».

## Plans, the fourth block

Owner decision: three tiers, deliberately restrained — no bright colour, no "BEST VALUE" badge, no motion
beyond the one-pixel lift the hero's qualifier plates already use. The accent is typographic: each tier's
NAME is set in the decorative script (Проба · Практика · Свобода), prices are large and light, benefit
lines are quiet. The middle plan is marked only by the site's gradient hairline across its top edge and a
small caps label. Three across from `lg` only: at tablet width three cards leave ~180px of measure each,
which crushes the benefit lines, so below that they stack.

Prices are the owner's to set and start at 0 / €9 / €19 a month, held as numbers so each locale formats its
own currency. Benefits are stated as minutes and conversation length rather than invented features — no
progress tracking, no reports, no certificates, none of which exist.

HONESTY: no payment is connected in this build. Only the free plan has a working action, and it takes the
visitor back up to the microphone, which is real; the paid plans read "soon" instead of implying a checkout,
and the footnote says plainly that nothing here charges anything. That footnote is load-bearing — it must
survive any copy edit until payment actually exists.

The same numbers live in ONE place for the agent: the autoloaded `plans` agent skill, which holds the three
tiers, their minutes and the exact line to take when someone asks how to pay. The instruction points at it by
name and carries no prices of its own, so a price change is two edits (the locale copy and that skill) and
never four. The instruction also no longer claims that only the hero exists or that we have no plans — it
describes the page as built, which is what a visitor reading the plans and then asking "сколько стоит?" is
entitled to hear back.

Asking to practise a language used to move the whole interface into it — the agent read "переключи
на немецкий" as an interface request, committed the session locale to German and rewrote the screen
in German. The instruction now separates the two explicitly: naming one of the four languages is a
practice request by default, and only an explicit "talk to me in X" / "translate the interface"
commits a locale. Retested in both directions after the fix.

Note for future sessions: a committed interface locale survives a new Preview session (it is the
visitor's own stored preference), so a leftover locale from testing is not a bug in the agent.

## The practice room — the second page

Owner decision: the landing page presents, the practice room practises. Rather than overloading the home
screen with the working state, practising has its own screen (`PracticeRoom`, surface id `practice`, so the
site stays intact behind it and the visitor can return to it).

What it carries, in this order (owner decision after review — the room must fit on ONE screen, with nothing to
scroll, and its TOP must stay light): the language rail under the lead-in **"I want to speak"**, standing where
a page title and a back-link used to be, because everything below it only makes sense once the language is
right; then the interactive particle flag with the pearl microphone at its centre; then a single status slot —
the invitation "Press and speak." when idle, the equaliser plus the measured length of the call when live;
then the pace rail; then **"How the conversation goes"** over the four mode plates, in ONE row on a wide
screen; and last the footnote about the metered demo minutes.

The mode plates were moved DOWN there on owner request after a first pass had them under the language: four
descriptions above the fold met the visitor before the language and the microphone did, and read as a wall.
Low on the page they are still one press away, and the top of the room is one lead-in and one rail.

The flag is measured against the VIEWPORT (`clamp(11rem, 30dvh, 21rem)` of height, its width following from
the 3:2 ratio), not against the column: it is the one element allowed to grow, so a tall screen gets a large
field while a short one still keeps the whole room above the fold. The particles are rebuilt at whatever size
results — nothing is ever stretched.

Removed from the room on owner request, to buy that one screen: the "Practice room" eyebrow and the quiet
"back to the site" control (their space went to the language), the line "Your browser will ask to use your
microphone" (the browser says so itself, in its own words), the page's own lead sentence, and the three
hairline practice tips — a screen you cannot take in at once is worse than a screen without advice on it. The
room therefore declares NO actions: every control on it is mechanical. The way back is the WORDMARK in the
header — the convention every site on the web has trained visitors in, and now the only one (owner decision).
Like the practise control it cannot dispatch a surface action from outside the surfaces, so it sends "show me
the home page" as the visitor's own message; it still looks exactly like a logo.

What it deliberately does NOT carry: plans, prices, qualifier plates, the landing sections — and no
transcript, since the platform's own history rail already keeps the session and a correction log would be a
feature nobody asked for.

### The room's three conversation controls

Owner decision after review: a bigger flag alone would have made the room a second hero, so the room owns
what the landing page cannot — controls that change HOW the conversation goes, not just its language. Three
were chosen, and three kinds of progress tracking were deliberately refused (streaks, words learnt, a history
of corrections): there are no accounts and no per-visitor storage behind them, so every number would be
invented.

- **Mode** — `free` (ordinary conversation), `scenario` (the agent plays a role and stays in it), `questions`
  (the agent asks, the visitor does the talking), `corrections` (each turn is corrected with one short line of
  why). Shown as four pressable plates with one explanatory line each, because a visitor must be able to tell
  "Questions only" from "Free talk" without trying both.
- **Scene** — `cafe`, `airport`, `meeting`, `interview`, `doctor`. Rendered ONLY while the role-play mode is
  live: five scenes beside a mode nobody selected would be a control that does nothing. Owner request: choosing
  the role-play SCROLLS the new row of scenes into view, because on a page built to fit one screen the choice a
  visitor just made can otherwise appear below the fold and look like nothing happened. Only on the press — a
  room that opens in role-play still arrives at its top — and instantly instead of smoothly when the visitor
  has asked for reduced motion.
- **Pace** — `slow`, `normal`, `native`. The same quiet rail as the language, because it is the same kind of
  small adjustment to a conversation already under way.

All three are mechanical in exactly the way the language rail is: a press writes a published pointer
(`/practice/mode`, `/practice/scenario`, `/practice/pace`) and the agent is never called. So a free chat becomes an
airport counter, or slows down, mid-conversation without hanging up. Asking for the same thing in words also
works: the agent re-renders the room with matching seeds so the page shows what is actually happening.

### What those presses actually tell the call — the CALL BRIEF

Raised by the owner in review, and it was a real hole: pressing "Role-play" changed the plate and then the
voice still opened with "hi, what shall we do?" — in the interface language, not the practice language. The
presses were reaching the voice session as VALUES (`scenario`, `airport`, `slow`, `german`) and nothing more.
Two facts about the platform explain why that was never going to be enough:

- **The agent's instruction file does not reach the voice model.** The realtime session is grounded on the
  agent's render surfaces and the visitor's saved notes; everything our instruction says about modes, scenes
  and pace is read by the agent on a typed or forwarded turn, and by nobody during a spoken one. So four bare
  words arrived with no rule attached, and a voice with no rule behaves like any assistant.
- **The platform tells the voice to speak the committed session locale on every single response** — which here
  is the visitor's OWN language, because that is what the interface is in. For a language-practice product that
  is backwards, and it is why the German lesson greeted in Russian.

The fix is the one channel that does reach the voice: the screen. Each page now composes its four live choices
into a CALL BRIEF — a short set of imperative clauses ("Practice call: speak German, not the interface
language; Russian only for a one-line aside. Role-play: you ARE the flight attendant welcoming them aboard —
open in character, stay in it. Speak slowly… Short turns, always hand the floor back.") — published as
`/practice/brief` and declared as the surface's field. The voice re-reads it before every sentence it speaks,
so a press mid-call lands on the next reply, and the language of the practice is stated as an instruction
instead of being left to fight the interface locale. The landing page publishes a shorter brief: it has only
the language to declare, and claiming a mode the page cannot set would be a lie.

Two consequences worth keeping in mind. The brief is model-facing English, never painted on the page and never
translated. And the projection has a hard 600-character budget that fails ALL-OR-NOTHING — one character over
and every field value is replaced by a structural summary, taking the brief with it and silently returning a
generic voice — so the brief is capped, the surfaces declare exactly one field, and
`src/surfaces/voice-screen-budget.test.ts` fails if the worst-case combination stops fitting. Measured, not
assumed: the room's worst case projects to 434 of 600 characters. Verified in a trace that the composed brief
is published and carries the pressed scene and pace.

### How a call OPENS in the scene — the practice notes

The brief alone did not close the hole, and the owner saw exactly why: with the airport scene pressed, the
voice REPORTED the setup ("the screen says to speak Spanish and play a role") instead of playing it, and still
greeted in the interface language. The reason is a difference in standing, not in wording: the screen reaches
the voice as a DESCRIPTION of what is displayed, while the platform's conduct script and its session-language
rule reach it as INSTRUCTIONS. A description does not outrank an instruction, so a longer or louder brief
could never have fixed it.

The channel that does carry that standing is the visitor's own saved notes. The browser hands them over the
moment the voice socket opens — before the voice speaks its first word — and the runtime injects them as
system-level context: what the visitor has told us about themselves. So each page now keeps the same setup
there too, written in the visitor's own first person because that is whose notes they are: the practice
language, the pair of roles for the pressed scene with the order to open in character, and the pace when it
needs saying. That is what makes the airport scene start at the door of the plane — "Guten Abend. Willkommen
an Bord." — instead of with a polite summary of itself.

A second note used to carry the language decision as a standing permission the visitor gives in advance.
It is GONE, and the reason is worth keeping: a language the visitor picked himself is locked at the
platform level — "keep it even when a later utterance is clearly in another language; conversational
evidence cannot override it" — so the note could never be honoured, and three owner tests in a row heard
Russian back. See the next section for what replaced it.

Three limits, all deliberate. Notes are read when the call OPENS, so a chip pressed mid-conversation still
travels by the brief alone — which is why both channels exist and say the same thing. Each note is truncated
by the runtime at 200 characters, silently, and the tail is where the pace and the role order sit — so
`blocks/practice-notes.test.ts` measures every language × mode × scene × pace instead of trusting an
estimate. And the notes are the visitor's own bank, shared with what they told the voice about themselves and
kept in their browser between visits: ours are marked, so a changed setup REPLACES the previous ones and
never leaves the model two contradicting scenes, while everything they wrote themselves is left untouched.

### The spoken language is the session's language — immersion for the length of a call

The product wanted two languages at once: a Russian interface and an English conversation. The platform has
ONE committed session language, it is what the voice is instructed to speak on every response, and when the
visitor chose it himself it is locked against anything short of a direct spoken request. That is why the
brief, the notes and a re-read of the model choice all failed the same way — the wall was never the wording
and never the model.

Owner decision, after the third failed test: pressing the microphone commits the PRACTICE language as the
session language, for as long as the call lasts (`useImmersionLocale`, the same `locale.propose` path the
header's switcher uses). The voice then speaks it legitimately, and a mid-call switch is projected into the
running call. The page's own labels move with it — a practice room in immersion mode — and the interface
language the visitor arrived with is proposed back the moment they hang up. Changing the practice chip
mid-call moves the session with it without disturbing what will be restored.

Accepted limits: the voice can be practised only in one of the four languages the interface bundles cover,
because the two are now the same setting. A `mini` voice model was traded for the flagship
`gpt-realtime-2.1` in the same pass — for a product whose whole value is spoken, holding a role and a
pace is worth the higher per-minute audio rate.

Two details this depends on, both found the hard way. A committed language is PERSISTED as the visitor's
explicit preference and re-proposed on their next visit, so "the call ended" cannot be the only path back:
the language owed to them is written to local storage before the switch and honoured on the next mount,
which covers a closed tab, a reload and a crash. And because the page moves under a reading visitor, the
room says so before the call — one quiet line in the language they still read, shown only while the two
differ ("for the length of the conversation the room switches to English").

### Who speaks first — the greeting is not ours, so we spend it

Neither channel above could fix the OPENING line, and the owner reported it three times: press role-play,
press the interview, and the call still opened "hi, what shall we do?" with the scene forgotten. Traced to its
source, the first spoken line of a call is authored by a platform instruction that asks for one warm line
inviting a question and expressly forbids using anything the visitor's notes or profile say. Our brief and our
notes are exactly what it is told to ignore, and the file holding it is platform-owned. No wording on our side
can win that turn.

What we do own is WHETHER that turn happens: the greeting is a one-shot right, claimed by the first voice open
of a page load. Owner decision — both practice pages claim it on mount and spend it on nothing. A call
therefore opens LISTENING, in silence, and the voice's first words are an ordinary reply, which is the only
kind of turn where the brief and the notes apply. The visitor says the first line, which for practice is the
truer exercise anyway.

The page carries that expectation instead of the audio. In role-play the room's invitation names both parts —
"Press and open the scene: you are the candidate, I am the interviewer" — so pressing the microphone is
understood as taking the first turn; the other modes keep the plain "press and speak". Once a call is live and
nothing has been said, the status line reads "your turn — say the first line" and becomes the ordinary
listening line as soon as the voice has answered once. The instruction matches: never open a spoken turn with
an invitation, answer the visitor's first line in role and in the practice language.

Verified in a trace of a genuine browser turn that both notes reach the model (the builder's own test messages
do not carry a browser bank, so they show none), and that the room's role-play answers in German in role. The
spoken opening itself needs a microphone press and is the owner's to judge.

The elapsed timer is measured, never decorative: it starts when the session actually goes live and resets
when it ends, so the page cannot claim a conversation that is not running.

The way in is ONE control, placed directly after "What a conversation is like" — the moment the visitor has
just been told what practising feels like. Owner decision after review: it is the loudest object on the page,
so it wears the brand gradient as a SURFACE (`.learny-aqua-fill`, the wordmark's own 100deg ramp) at a large
size, not the pearl of the voice controls — pearl stays reserved for starting and stopping a conversation. It
is a real action dispatch (`openPracticeRoom`), not a link, so the agent renders the room seeded from
`/practice/language` and the chosen language survives the crossing. There is no matching control back: the
room's own "back to the site" link was removed to keep the room on one screen.

Also on owner request, the technical footnote under the third block is gone ("voice runs through the
platform's realtime gateway…"). The honest statement about capped demo minutes still stands where money is
discussed — the Plans footnote — and in the practice room, so the limit is never hidden.

The practice MECHANISM is shared, not copied: `blocks/practice-voice.tsx` holds the mechanical-choice state
(ONE publish path used by all four controls, so language, mode, scene and pace cannot develop different ideas
of what "the visitor pressed it" means), the choice rail, the pearl button and the audio-driven equaliser;
`blocks/FlagField.tsx` holds the particle flag, drawn at whatever size the page gives it. Both pages import
them. A second copy would be a second truth about what a live call is doing.

The field's DENSITY is per page, not global: the flag is built from a number of dots ACROSS its width, so a
wider flag is not a thinner one. Owner decision after review — the room's flag was faded at the hero's dot
count, so the room asks for far more (108 across against the hero's 62) and the landing page's field is left
exactly as it was tuned.

## The writing desk — the third page

Owner decision after asking what the bottom line is actually for: keep the composer exactly as it is, put a
**"Перейти в чат"** door under the answer note, and give written practice its own page. `WritingDesk`, surface
id `writing`.

**Its conversation is not a prop, and that is the whole design.** A thread carried in props would mean the
model retyping the exchange every turn, and the first paraphrase would rewrite the visitor's own words. The
browser already holds every message of the session, so the React component READS the session
(`blocks/writing-thread.ts`) and the agent answers in ordinary reply text. The platform's stage carries the
current surface forward through a text-only turn, so answering costs no render at all — which makes this the
one page of the site where reply text is the product rather than something invisible.

Four rules that projection has to get right, each one a way the page could show the wrong thing:

- a SPOKEN turn is not a written one. A call produces text too, so provenance decides: `channel: 'voice'` on
  the request, `channel`/`voiceDelivery` on the answer. Either mark drops the pair, and both survive a reload.
- a SITE turn is not a desk turn. On the hero and in the room the answer lives inside the screen, leaving the
  turn with no assistant text — those are dropped rather than drawn as half-empty pairs. The thread also starts
  at the run that created the desk, so a price question asked on the landing page is not the first line of
  someone's practice.
- the turn IN FLIGHT is part of the conversation: the visitor's line appears at once, with three dots where the
  answer will be.
- **`**went**`, not "went".** Models write markdown emphasis whether asked or not — the very first correction
  this desk rendered printed its asterisks. In a correction the emphasised word is precisely the word that was
  wrong, so the desk honours paired `**`/`__` (nothing else, no nesting) and underlines it in the brand colour.

Style, so it is a chat and still this site: no grey blobs on both sides. The visitor's line sits on the PEARL
they press to speak; ours stands on the aqua hairline the site says everything on, under a small LEARNY label.
The correction is a third, quieter register — a bordered row under the answer with a pencil and the label
«Правка» — because it is the reason the page exists and must not read as more prose.

How the agent writes there (instruction): the practice line in the PRACTICE language, short, always leaving
something to answer; then at most ONE correction line beginning with `→`, in the visitor's INTERFACE language,
and none at all when they wrote correctly — inventing a correction to look useful is worse than silence.
Questions about us are answered in plain prose with no arrow line.

Accepted limits: the composer is the only input (no second field on the page), and a written exchange started
before the desk existed does not migrate into it.

## Arrival — the two questions before the site

Owner decision: a visitor answers two questions before they see anything else, and the site then arrives
already set up for them. `LanguageOnboarding`, surface id `welcome`, is what `[user opened the agent]` renders.

- **"What language do you speak?"** — the four interface languages, each written in itself (English, русский,
  español, Deutsch), because this question is answered by someone who cannot yet read the interface. The
  answer commits the session's interface locale the same mechanical way the header switcher does, so the
  SECOND question is already in the visitor's own language. No agent turn.
- **"And which one do you want to speak?"** — all four practice languages, INCLUDING the one they just said
  they speak. Owner decision: "I speak English, I want to learn English" is a real case — someone polishing
  their own language, or someone who simply reads the interface best in it — and filtering it out silently
  decided for them what they were allowed to practise. The answer is published to `/practice/language` — the
  same single authority the hero and the room read — and dispatches `startPractice`, the one press of the whole
  flow that spends an agent turn, because someone has to render the site being opened.

The screen has NO props: both answers belong to the visitor, and its wording is interface copy like the rest
of the site. There is a way past it — a quiet "just show me the site" (`skipOnboarding`): a demo that cannot
be looked at without answering questions is a worse demo, and the same choices exist on the landing page. The
questions are asked ONCE per session; after either action the visitor is past arrival for good.

`/practice/native` is published alongside, so the agent knows which language the visitor reads most
comfortably even though the interface locale itself lives in the session, not in the data model.

Every screen lifts the boot curtain, not just the hero: a session replays from history on reload, so whichever
screen the visitor was last on is the one that mounts first. When only the hero dismissed it, a reload in the
practice room sat behind the dotted hands until the curtain's own safety timeout.

## What Learny remembers about a learner

Owner decision: the site recognises a returning student WITHOUT a login. A language school's memory of a
student is carried by the teacher; Learny has no teacher on purpose, so without a profile every visit is day
one — no level, nothing we worked on, no mistake we have seen three times. That makes "learn as long as you
need" impossible, which is the product.

**Who the learner is.** An id minted in the browser (`localStorage`), never issued by a sign-in. The honest
consequence is stated on every screen that shows a remembered fact — "запоминаем в этом браузере, без
регистрации" — and the agent must answer the same way when asked: no account, this browser only, another
device is another learner. A visit that finds no id in the browser adopts the one the SESSION holds, if any,
so a window that refuses storage still keeps its learner for the length of the visit. A visit is a session,
not a page load: a refresh, a livereload or a second mount does not count a new one.

**What is kept** (`common/learners/<id>.json`): visits and last-seen, the interface language and the practice
language, a level ESTIMATE, seconds spoken, written turns, scenes played, and recurring mistakes with how many
times we have seen each. Nothing else — no transcripts.

**Who writes it.** The pages, not the model: which language was pressed, how long the microphone was actually
open (filed in half-minute chunks, so a closed tab loses at most one), which scene was played, and the
correction the writing desk had already parsed out of a reply. Minutes spoken in particular is a fact no model
can estimate and nobody should have to claim. Only the level estimate is the agent's judgement.

**What the agent gets.** Every learner write carries a one-line briefing into the model's context on the
visitor's next message, so the agent knows who it is talking to without spending a turn or a tool call.
Instruction rules: use it, never recite it, never promise to remember something on request, and always let the
level sound like the estimate it is.

**Arrival for a learner we know.** The two questions are replaced by "С возвращением", the language we
remember, a quiet row of facts (last time, level, minutes spoken, lines written, mistakes still open) and one
press — "продолжить на испанском". "Другой язык" goes back to the questions; "забыть меня" erases the profile,
because a demo nobody can reset is a demo nobody trusts. The press carries the briefing with it, since the
greeting turn is answered before the action log reaches the model.

**The memory has its own page.** Owner decision: a site that says "we remember you" owes the learner a look at
exactly what it remembers. `LearnerProgress`, surface id `progress`, reached from the arrival screen ("что вы
обо мне помните") or by asking in words. It shows the practice language, the level estimate labelled AS an
estimate, minutes spoken, lines written, visits with the last one, scenes played, and every correction we hold
— repeats first, with the count shown only where it means something. It takes NO props: the page reads the
profile itself, because a number that travels through a paraphrase is no longer that number, and the
instruction forbids the agent from restating any of them. "Забыть всё" is on the page, and the browser-only
footnote sits under it.

Its one press that costs a turn is "проговорить это вслух" (`practiseMistakes`): the room opens in close
correction with a `focus` string — the remembered mistakes, unchanged — which reaches the live call as
instruction-level notes rather than as screen description, the same channel the scene setup uses. Accepted
limits: corrections are stored as plain text (emphasis markers are stripped on the way in and on the way out,
so records kept earlier read clean too), and this page never shows what was said — there are no transcripts to
show. Identity for this page is resolved by the SERVER: it can be the first screen a page load mounts, so a
browser holding no id falls back to the session's copy exactly as arrival does — otherwise a learner with a
long history was shown an empty memory.

## The header's two ways across the site

Owner request: a control beside the language switcher that goes straight to the conversation from anywhere on
the site, and the wordmark as the way back to the landing page. The header lives OUTSIDE every surface, so
neither can dispatch a surface action; each sends what a visitor would type ("open the practice room", "show me
the home page") as their own message — the platform's own path for a tapped intent — which costs the same
single agent turn a button on the page does. Owner decision after review: the practise control wears the SAME
gradient fill as the landing page's call to action (`.learny-aqua-fill`), not a quieter hairline — the
always-present door must not look like the lesser one when both lead to the same conversation. The wordmark is
left looking like a logo.

## Journeys

Arrival's two questions, and the crossing from the landing page into the practice room and back.
