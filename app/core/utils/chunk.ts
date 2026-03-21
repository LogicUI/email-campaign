/**
 * Splits an array into equally sized chunks.
 *
 * This is used by bulk workflows such as batched email sending where work needs to
 * be processed in controlled groups.
 *
 * @param items Items to chunk.
 * @param size Desired chunk size.
 * @returns Array of item groups. Empty input returns `[[]]` for simpler callers.
 */
export function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) {
    return [[]];
  }

  if (size <= 0) {
    return [items];
  }

  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}
