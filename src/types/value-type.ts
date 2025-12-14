import { type FieldType } from "./field-type.js";

/**
 * Maps FieldType to its corresponding JavaScript value type.
 *
 * @typeParam Type - The field type to map
 *
 * @remarks
 * Type mapping:
 * - `"string"` maps to `string`
 * - `"number"` maps to `number`
 * - `"boolean"` maps to `boolean`
 * - `"date"` maps to `Date`
 */
export type ValueType<Type extends FieldType> = Type extends "string"
  ? string
  : Type extends "number"
    ? number
    : Type extends "boolean"
      ? boolean
      : Date;
