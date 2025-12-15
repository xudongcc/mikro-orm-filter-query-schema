import { type FieldType, type Operator, type ValueType } from "../types/index.js";

/**
 * Arguments passed to the replacement callback function.
 *
 * @typeParam Type - The field's data type
 *
 * @example
 * ```typescript
 * replacement: ({ field, operator, value }) => {
 *   if (operator === "$eq") {
 *     return { title: value };
 *   }
 *   return { title: { [operator]: value } };
 * }
 * ```
 */
export interface ReplacementCallbackArgs<Type extends FieldType = never> {
  /**
   * The original field name from the input query.
   */
  field: string;

  /**
   * The operator being used (e.g., `$eq`, `$ne`, `$in`, `$fulltext`).
   */
  operator: Operator;

  /**
   * The value associated with the operator.
   * Can be a single value, an array (for `$in`, `$nin`), or null.
   */
  value: ValueType<Type> | ValueType<Type>[] | null;
}
