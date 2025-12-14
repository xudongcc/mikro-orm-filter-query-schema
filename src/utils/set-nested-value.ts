/**
 * Sets a value at a dot-separated path in an object.
 *
 * @param obj - The object to modify
 * @param path - The dot-separated path (e.g., "author.name")
 * @param value - The value to set
 *
 * @example
 * ```typescript
 * const obj = {};
 * setNestedValue(obj, "author.name", "John");
 * // Result: { author: { name: "John" } }
 * ```
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object" || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}
