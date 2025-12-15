/**
 * Supported field types for filter query validation.
 *
 * @remarks
 * Each type maps to specific Zod validation schemas:
 * - `"string"` - Validates string values, supports `$eq`, `$ne`, `$in`, `$nin` operators.
 *   With `fulltext: true` option, also supports `$fulltext` operator.
 * - `"number"` - Validates numeric values, supports comparison operators (`$gt`, `$gte`, `$lt`, `$lte`)
 * - `"boolean"` - Validates boolean values, only supports `$eq`, `$ne`, `$in`, `$nin`
 * - `"date"` - Validates Date objects and ISO date strings, supports comparison operators
 */
export type FieldType = "string" | "number" | "boolean" | "date";
