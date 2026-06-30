/**
 * Supported field types for filter query validation.
 *
 * @remarks
 * Each type maps to specific Zod validation schemas:
 * - `"string"` - Validates string values, supports `$eq`, `$ne`, `$in`, `$nin` operators.
 *   With `fulltext` enabled, also supports `$fulltext` operator.
 * - `"number"` - Validates numeric values, supports comparison operators (`$gt`, `$gte`, `$lt`, `$lte`, `$between`)
 * - `"boolean"` - Validates boolean values, only supports `$eq`, `$ne`, `$in`, `$nin`
 * - `"date"` - Validates Date objects, ISO date strings, and relative date offsets,
 *   supports comparison operators including `$between`
 */
export type FieldType = "string" | "number" | "boolean" | "date";
