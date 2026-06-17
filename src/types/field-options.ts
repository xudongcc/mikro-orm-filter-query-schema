import type { AutoPath, FilterQuery } from "@mikro-orm/core";

import { type ReplacementCallbackArgs } from "../interfaces/replacement-callback-args.interface.js";
import { type FieldType } from "./field-type.js";

/**
 * Base configuration options shared by all field types.
 *
 * @typeParam Type - The field's data type
 */
export type BaseFieldOptions<
  Entity extends object,
  Type extends FieldType = never,
  Field extends string = never,
> = {
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
} & (Type extends "string"
  ? {
      /**
       * Whether this field supports full-text search operator.
       * When true, allows the `$fulltext` operator to be used for this field.
       * When set to a string path, `$fulltext` is mapped to that entity path.
       * Only available for string fields.
       */
      fulltext?: boolean | Extract<AutoPath<Entity, Field>, string>;

      /**
       * Whether this field supports prefix search operator.
       * When true, allows the `$prefix` operator to be used for this field.
       * The `$prefix` operator is converted to `$like` with the value appended with '%'.
       * Special characters (%, _) in the value are escaped.
       * Only available for string fields.
       */
      prefix?: boolean;
    }
  : object);

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
export type SimpleFieldOptions<
  Entity extends object,
  Type extends FieldType = never,
  Field extends string = never,
> = BaseFieldOptions<Entity, Type, Field> & {
  /**
   * The field name, must be a key of the entity.
   */
  field: Extract<keyof Entity, string>;
};

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
export type ReplacementFieldOptions<
  Entity extends object,
  Type extends FieldType = never,
  Field extends string = never,
> = BaseFieldOptions<Entity, Type, Field> & {
  /**
   * The dot-notation path to replace the field with in the output.
   */
  replacement: Extract<AutoPath<Entity, Field>, string>;
};

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
 *   replacement: ({ operator, value }) => ({
 *     $or: [
 *       { title: { [operator]: value } },
 *       { content: { [operator]: value } }
 *     ]
 *   })
 * });
 * ```
 */
export type ReplacementCallbackFieldOptions<
  Entity extends object,
  Type extends FieldType = never,
  Field extends string = never,
> = BaseFieldOptions<Entity, Type, Field> & {
  /**
   * A callback function that transforms the field value into a FilterQuery.
   * @param args - The replacement callback arguments containing field, operator, and value
   * @returns A FilterQuery object to be merged into the result
   */
  replacement?: (args: ReplacementCallbackArgs<Type>) => FilterQuery<Entity>;
};

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
  | SimpleFieldOptions<Entity, Type, Field>
  | ReplacementFieldOptions<Entity, Type, Field>
  | ReplacementCallbackFieldOptions<Entity, Type, Field>;
