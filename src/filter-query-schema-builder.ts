import { FilterQuery } from "@mikro-orm/core";
import { z } from "zod";

import { FilterOptions } from "./interfaces/filter-options.interface.js";
import {
  FieldOptions,
  FieldType,
  Operator,
  ReplacementCallbackFieldOptions,
  ReplacementFieldOptions,
} from "./types/index.js";
import { setNestedValue } from "./utils/index.js";

/**
 * Type guard to check if field options have a string replacement.
 * @internal
 */
function hasStringReplacement<Entity extends object>(
  options: FieldOptions<Entity, FieldType, string>
): options is ReplacementFieldOptions<Entity, FieldType, string> {
  return "replacement" in options && typeof options.replacement === "string";
}

/**
 * Type guard to check if field options have a callback replacement.
 * @internal
 */
function hasCallbackReplacement<Entity extends object>(
  options: FieldOptions<Entity, FieldType, string>
): options is ReplacementCallbackFieldOptions<Entity, FieldType> {
  return "replacement" in options && typeof options.replacement === "function";
}

/**
 * Type guard to check if a string is a valid operator.
 * @internal
 */
function isOperator(key: string): key is Operator {
  const operators: Operator[] = [
    "$eq",
    "$ne",
    "$lt",
    "$gt",
    "$lte",
    "$gte",
    "$in",
    "$nin",
    "$fulltext",
    "$contains",
    "$overlap",
  ];
  return operators.includes(key as Operator);
}

/**
 * Creates a Zod schema for a specific field type.
 * @internal
 */
function getValueSchema(type: FieldType): z.ZodTypeAny {
  switch (type) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "date":
      return z.union([
        z.iso.datetime({ offset: true, local: true }),
        z.iso.date(),
        z.date(),
      ]);
  }
}

/**
 * Creates a typed comparison schema with all applicable operators for the given type.
 * @internal
 */
function createTypedComparisonSchema(
  type: FieldType,
  maxArrayLength: number,
  options?: { array?: boolean; fulltext?: boolean }
): z.ZodTypeAny {
  const valueSchema = getValueSchema(type);
  const valueWithNull = z.union([valueSchema, z.null()]);

  const comparisonFields: Record<string, z.ZodTypeAny> = {
    $eq: valueWithNull.optional(),
    $ne: valueWithNull.optional(),
  };

  // Comparison operators only apply to number and date types
  if (type === "number" || type === "date") {
    comparisonFields.$gt = valueSchema.optional();
    comparisonFields.$gte = valueSchema.optional();
    comparisonFields.$lt = valueSchema.optional();
    comparisonFields.$lte = valueSchema.optional();
  }

  // $in and $nin apply to all types
  comparisonFields.$in = z.array(valueWithNull).max(maxArrayLength).optional();
  comparisonFields.$nin = z.array(valueWithNull).max(maxArrayLength).optional();

  // Array field specific operators
  if (options?.array) {
    comparisonFields.$contains = z
      .array(valueSchema)
      .max(maxArrayLength)
      .optional();
    comparisonFields.$overlap = z
      .array(valueSchema)
      .max(maxArrayLength)
      .optional();
  }

  // Fulltext search operator (only for string fields)
  if (options?.fulltext) {
    comparisonFields.$fulltext = valueSchema.optional();
  }

  const comparisonObjectSchema = z.object(comparisonFields).strict();

  // Support direct assignment, null value, or comparison object
  return z.union([valueSchema, z.null(), comparisonObjectSchema]);
}

/**
 * A builder class for creating Zod schemas that validate and parse MikroORM filter queries.
 *
 * @typeParam Entity - The entity type being filtered
 *
 * @remarks
 * This builder provides a fluent API to define which fields are allowed in filter queries,
 * what types they accept, and how they should be transformed. It generates a Zod schema
 * that validates input and optionally transforms field names to nested object paths.
 *
 * @example
 * Basic usage:
 * ```typescript
 * interface User {
 *   id: number;
 *   name: string;
 *   age: number;
 * }
 *
 * const schema = new FilterQuerySchemaBuilder<User>()
 *   .addField({ field: "id", type: "number" })
 *   .addField({ field: "name", type: "string" })
 *   .addField({ field: "age", type: "number" })
 *   .build();
 *
 * const result = schema.parse({ name: "John", age: { $gte: 18 } });
 * ```
 *
 * @example
 * With field replacement:
 * ```typescript
 * const schema = new FilterQuerySchemaBuilder<Post>()
 *   .addField({ field: "authorName", type: "string", replacement: "author.name" })
 *   .build();
 *
 * // Input: { authorName: "John" }
 * // Output: { author: { name: "John" } }
 * ```
 */
export class FilterQuerySchemaBuilder<Entity extends object> {
  private readonly options: FilterOptions;

  private readonly fieldOptionsMap = new Map<
    string,
    FieldOptions<Entity, FieldType, string>
  >();

  /**
   * Creates a new FilterQuerySchemaBuilder instance.
   *
   * @param options - Optional configuration for validation limits
   */
  constructor(options?: Partial<FilterOptions>) {
    this.options = {
      maxDepth: 5,
      maxConditions: 20,
      maxOrBranches: 5,
      maxArrayLength: 100,
      ...(options ?? {}),
    };
  }

  /**
   * Adds a field definition to the schema builder.
   *
   * @typeParam Type - The field's data type
   * @typeParam Field - The dot-notation path for replacement fields
   * @param options - The field configuration options
   * @returns The builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder
   *   .addField({ field: "name", type: "string" })
   *   .addField({ field: "age", type: "number" })
   *   .addField({ field: "roles", type: "string", array: true });
   * ```
   */
  addField<
    Type extends "string" | "number" | "boolean" | "date" = never,
    Field extends string = never,
  >(options: FieldOptions<Entity, Type, Field>): this {
    this.fieldOptionsMap.set(
      options.field,
      options as unknown as FieldOptions<Entity, FieldType, string>
    );
    return this;
  }

  /**
   * Builds and returns the Zod schema for validating filter queries.
   *
   * @returns A Zod schema that validates and optionally transforms filter queries
   *
   * @remarks
   * The returned schema:
   * - Validates field types and operators based on field definitions
   * - Enforces configured limits (depth, conditions, array length, etc.)
   * - Transforms field names using replacement configurations
   * - Supports `$and`, `$or`, and `$not` logical operators
   *
   * @example
   * ```typescript
   * const schema = builder.build();
   *
   * // Validate and parse
   * const result = schema.parse({ name: "John" });
   *
   * // Safe parse with error handling
   * const { success, data, error } = schema.safeParse(input);
   * ```
   */
  build(): z.ZodType<FilterQuery<Entity>> {
    const { maxDepth, maxConditions, maxOrBranches, maxArrayLength } =
      this.options;

    const fieldOptions = [...this.fieldOptionsMap.values()];

    // Build string replacement map
    const stringReplacementMap = new Map<string, string>();
    // Build callback replacement map
    const callbackReplacementMap = new Map<
      string,
      (args: {
        field: string;
        operator: Operator;
        value: unknown;
      }) => FilterQuery<Entity>
    >();

    for (const field of fieldOptions) {
      if (hasStringReplacement(field)) {
        stringReplacementMap.set(field.field, field.replacement);
      } else if (hasCallbackReplacement(field)) {
        callbackReplacementMap.set(
          field.field,
          field.replacement as (args: {
            field: string;
            operator: Operator;
            value: unknown;
          }) => FilterQuery<Entity>
        );
      }
    }

    const hasTransforms =
      stringReplacementMap.size > 0 || callbackReplacementMap.size > 0;

    // Parse field value to extract operator and value pairs
    const parseFieldValue = (
      fieldValue: unknown
    ): Array<{ operator: Operator; value: unknown }> => {
      if (fieldValue === null || typeof fieldValue !== "object") {
        // Direct assignment is equivalent to $eq
        return [{ operator: "$eq", value: fieldValue }];
      }

      // Operator object
      const entries = Object.entries(fieldValue as Record<string, unknown>);
      return entries
        .filter(([key]) => isOperator(key))
        .map(([operator, value]) => ({
          operator: operator as Operator,
          value,
        }));
    };

    // Recursively apply field name replacements
    const applyReplacements = (
      obj: Record<string, unknown>
    ): Record<string, unknown> => {
      const result: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(obj)) {
        if (key === "$and" && Array.isArray(value)) {
          result[key] = value.map((item) =>
            applyReplacements(item as Record<string, unknown>)
          );
        } else if (key === "$or" && Array.isArray(value)) {
          result[key] = value.map((item) =>
            applyReplacements(item as Record<string, unknown>)
          );
        } else if (
          key === "$not" &&
          typeof value === "object" &&
          value !== null
        ) {
          result[key] = applyReplacements(value as Record<string, unknown>);
        } else {
          // For field conditions, check if replacement is needed
          const stringReplacement = stringReplacementMap.get(key);
          const callbackReplacement = callbackReplacementMap.get(key);

          if (callbackReplacement) {
            // Apply callback replacement
            const parsed = parseFieldValue(value);
            for (const { operator, value: parsedValue } of parsed) {
              const replacement = callbackReplacement({
                field: key,
                operator,
                value: parsedValue,
              });
              // Merge the callback result into the output
              Object.assign(result, replacement);
            }
          } else if (stringReplacement) {
            // Apply string path replacement as nested object
            setNestedValue(result, stringReplacement, value);
          } else {
            result[key] = value;
          }
        }
      }

      return result;
    };

    // Dynamically build field schemas, each field uses its declared type
    const fieldSchemas: Record<string, z.ZodOptional<z.ZodTypeAny>> = {};
    for (const field of fieldOptions) {
      const fieldComparisonSchema = createTypedComparisonSchema(
        field.type,
        maxArrayLength,
        {
          array: field.array,
          fulltext: "fulltext" in field ? field.fulltext : undefined,
        }
      );
      fieldSchemas[field.field] = fieldComparisonSchema.optional();
    }

    const createFilterSchema = (
      currentDepth: number
    ): z.ZodType<FilterQuery<Entity>> => {
      if (currentDepth >= maxDepth) {
        // At max depth, only allow simple field conditions, no nesting
        return z
          .object(fieldSchemas)
          .strict()
          .refine((obj) => Object.keys(obj).length <= maxConditions, {
            message: `Filter cannot have more than ${maxConditions} conditions`,
          }) as unknown as z.ZodType<FilterQuery<Entity>>;
      }

      return z.lazy(() => {
        const nestedSchema = createFilterSchema(currentDepth + 1);

        return z
          .object({
            $and: z.array(nestedSchema).optional(),
            $or: z
              .array(nestedSchema)
              .max(maxOrBranches, {
                message: `$or cannot have more than ${maxOrBranches} branches`,
              })
              .optional(),
            $not: nestedSchema.optional(),
            ...fieldSchemas,
          })
          .strict()
          .refine(
            (obj) => {
              const fieldKeys = Object.keys(obj).filter(
                (k) => !["$and", "$or", "$not"].includes(k)
              );
              return fieldKeys.length <= maxConditions;
            },
            {
              message: `Filter cannot have more than ${maxConditions} field conditions`,
            }
          ) as unknown as z.ZodType<FilterQuery<Entity>>;
      }) as unknown as z.ZodType<FilterQuery<Entity>>;
    };

    // Add transform if there are any replacements or fulltext fields
    if (hasTransforms) {
      return createFilterSchema(0).transform((obj) =>
        applyReplacements(obj as Record<string, unknown>)
      ) as unknown as z.ZodType<FilterQuery<Entity>>;
    }

    return createFilterSchema(0);
  }
}
