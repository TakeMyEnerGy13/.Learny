/**
 * Browser identity is the only durable boundary between public learners. Keep this
 * pure so its isolation rule is covered without loading the full tRPC runtime.
 */
export type ArrivalIdentityInput = {
  id?: string;
  candidate?: string;
};

/**
 * Resume only a browser-supplied established id. Otherwise use the browser's
 * freshly minted candidate; never consult server or session state.
 */
export function resolveArrivalId(input: ArrivalIdentityInput): string | null {
  return input.id ?? input.candidate ?? null;
}
