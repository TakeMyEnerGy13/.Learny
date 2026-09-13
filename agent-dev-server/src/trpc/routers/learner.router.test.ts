import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveArrivalId } from './learner-identity.ts';

const establishedId = 'abcdefghijklmno1';
const freshCandidate = 'pqrstuvwxyz12345';

describe('resolveArrivalId', () => {
  it('starts a fresh browser with its own candidate', () => {
    assert.equal(resolveArrivalId({ candidate: freshCandidate }), freshCandidate);
  });

  it('uses an established browser id over a newly minted candidate', () => {
    assert.equal(
      resolveArrivalId({ id: establishedId, candidate: freshCandidate }),
      establishedId,
    );
  });

  it('does not resolve an identity when the browser supplies none', () => {
    assert.equal(resolveArrivalId({}), null);
  });
});
