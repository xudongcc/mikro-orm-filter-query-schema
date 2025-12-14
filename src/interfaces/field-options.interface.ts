import type { AutoPath, FilterQuery } from "@mikro-orm/core";

import { type FieldType } from "../types/index.js";
import { type ReplacementCallbackArgs } from "./replacement-callback-args.interface.js";

/**
 * Base configuration options shared by all field types.
 *
 * @typeParam Type - The field's data type
 */
export interface BaseFieldOptions<Type extends FieldType = never> {
  /**
   * The data type of the field, determines which operators are available.
   */
  type: Type;

  /**
   * The field name used in the filter query input.
   */
  field: string;

  /**
   * Whether this field represents an array type.
   * When true, enables `$contains` and `$overlap` operators.
   */
  array?: boolean;

  /**
   * Whether this field supports full-text search.
   * When true, enables the `$fulltext` operator.
   */
  fulltext?: boolean;
}

/**
 * Field options for simple fields that map directly to entity properties.
 *
 * @typeParam Entity - The entity type
 * @typeParam Type - The field's data type
 *
 * @example
 * ```typescript
 * builder.addField({ field: "name", type: "string" });
 * ```
 */
export interface SimpleFieldOptions<
  Entity extends object,
  Type extends FieldType = never,
> extends BaseFieldOptions<Type> {
  /**
   * The field name, must be a key of the entity.
   */
  field: Extract<keyof Entity, string>;
}

/**
 * Field options with a string path replacement for nested entity properties.
 *
 * @typeParam Entity - The entity type
 * @typeParam Type - The field's data type
 * @typeParam Field - The dot-notation path to the nested property
 *
 * @example
 * ```typescript
 * builder.addField({
 *   field: "authorName",
 *   type: "string",
 *   replacement: "author.name"
 * });
 * ```
 */
export interface ReplacementFieldOptions<
  Entity extends object,
  Type extends FieldType = never,
  Field extends string = never,
> extends BaseFieldOptions<Type> {
  /**
   * The dot-notation path to replace the field with in the output.
   */
  replacement: Extract<AutoPath<Entity, Field>, string>;
}

/**
 * Field options with a callback function for custom query transformation.
 *
 * @typeParam Entity - The entity type
 * @typeParam Type - The field's data type
 *
 * @example
 * ```typescript
 * builder.addField({
 *   field: "keyword",
 *   type: "string",
 *   replacement: ({ value }) => ({
 *     $or: [
 *       { title: { $like: `%${value}%` } },
 *       { content: { $like: `%${value}%` } }
 *     ]
 *   })
 * });
 * ```
 */
export interface ReplacementCallbackFieldOptions<
  Entity extends object,
  Type extends FieldType = never,
> extends BaseFieldOptions<Type> {
  /**
   * A callback function that transforms the field value into a FilterQuery.
   * @param args - The replacement callback arguments containing field, operator, and value
   * @returns A FilterQuery object to be merged into the result
   */
  replacement?: (args: ReplacementCallbackArgs<Type>) => FilterQuery<Entity>;
}

/**
 * Union type of all field option variants.
 *
 * @typeParam Entity - The entity type
 * @typeParam Type - The field's data type
 * @typeParam Field - The dot-notation path for replacement fields
 */
export type FieldOptions<
  Entity extends object,
  Type extends FieldType = never,
  Field extends string = never,
> =
  | SimpleFieldOptions<Entity, Type>
  | ReplacementFieldOptions<Entity, Type, Field>
  | ReplacementCallbackFieldOptions<Entity, Type>;
