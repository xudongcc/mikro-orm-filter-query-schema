/**
 * Configuration options for filter query validation and value transforms.
 *
 * @remarks
 * These options help prevent denial-of-service attacks by limiting
 * the complexity and size of filter queries.
 *
 * @example
 * ```typescript
 * const builder = new FilterQuerySchemaBuilder<User>({
 *   maxDepth: 3,
 *   maxConditions: 10,
 *   maxOrBranches: 3,
 *   maxArrayLength: 50,
 * });
 * ```
 */
export interface FilterOptions {
  /**
   * Maximum nesting depth for filter queries.
   * @defaultValue 5
   */
  maxDepth: number;

  /**
   * Maximum number of field conditions in a single filter object.
   * @defaultValue 20
   */
  maxConditions: number;

  /**
   * Maximum number of branches allowed in `$or` operator.
   * @defaultValue 5
   */
  maxOrBranches: number;

  /**
   * Maximum array length for `$in`, `$nin`, `$contains`, and `$overlap` operators.
   * @defaultValue 100
   */
  maxArrayLength: number;

  /**
   * Optional transforms for validated operator values, before field replacement.
   * Currently supports `$fulltext`; fields must still enable `fulltext`.
   */
  operatorTransforms?: {
    /**
     * Transforms each full-text string before field mapping or replacement callbacks.
     * The result must be a string. Empty strings remain full-text conditions.
     * @param value - Validated full-text string from the input query.
     * @returns The full-text string to use in the output query.
     */
    $fulltext?: (value: string) => string;
  };
}
