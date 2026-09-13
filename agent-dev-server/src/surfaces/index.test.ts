import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AGENT_CATALOG_ID, AGENT_SURFACE_CONTRACTS } from './index.ts';
import { contractToFlatToolSchema } from '../../vendor/agentplace-a2ui/contract-schema.ts';
import { assertProviderSafeToolSchema } from '../bl/tools/impl/schema-dialect-guards.ts';

describe('agent surface contracts', () => {
  it('declares a catalog id', () => {
    assert.ok(AGENT_CATALOG_ID.length > 0);
  });

  it('every registered contract is provider-safe and carries a purpose', () => {
    for (const [name, contract] of Object.entries(AGENT_SURFACE_CONTRACTS)) {
      assert.ok(contract.purpose.length > 0, `${name} needs a purpose`);
      assertProviderSafeToolSchema(contractToFlatToolSchema(contract), `Render${name}`);
    }
  });
});
