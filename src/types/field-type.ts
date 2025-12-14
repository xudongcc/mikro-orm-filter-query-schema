/**
 * Supported field types for filter query validation.
 *
 * @remarks
 * Each type maps to specific Zod validation schemas:
 * - `"string"` - Validates string values, supports `$like`, `$ilike`, `$fulltext` operators
 * - `"number"` - Validates numeric values, supports comparison operators
 * - `"boolean"` - Validates boolean values, only supports `$eq`, `$ne`, `$in`, `$nin`
 * - `"date"` - Validates Date objects and ISO date strings
 */
export type FieldType = "string" | "number" | "boolean" | "date";
