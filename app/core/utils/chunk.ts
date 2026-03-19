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
