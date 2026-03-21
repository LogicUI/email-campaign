/**
 * Creates a namespaced random id for client and server models.
 *
 * Prefixes make debugging easier because ids remain recognizable by entity type in
 * logs, store snapshots, and persisted records.
 *
 * @param prefix Entity prefix such as `campaign` or `recipient`.
 * @returns Random id string prefixed with the provided label.
 */
export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
