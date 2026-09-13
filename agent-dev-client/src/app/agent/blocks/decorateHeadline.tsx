/**
 * One word of a headline set in the decorative script.
 *
 * The word is a translated value of its own rather than markup inside the
 * headline: the headline already has owner translations, and adding a tag to it
 * would change its ICU contract and invalidate all of them. This way each
 * language names the word it wants accented, in its own grammatical form, and a
 * word that does not match anything leaves the headline exactly as written —
 * there is no state where a visitor loses the sentence.
 *
 * Shared by the hero headline and the third section's heading, so both accent a
 * word the same way and a change to the treatment reaches both.
 */
import type { ReactNode } from 'react';

export function decorateHeadline(headline: string, word: string): ReactNode {
  const trimmed = word.trim();
  if (trimmed.length === 0) {
    return headline;
  }
  const at = headline.toLocaleLowerCase().indexOf(trimmed.toLocaleLowerCase());
  if (at < 0) {
    return headline;
  }
  return (
    <>
      {headline.slice(0, at)}
      <span className="learny-script">{headline.slice(at, at + trimmed.length)}</span>
      {headline.slice(at + trimmed.length)}
    </>
  );
}
