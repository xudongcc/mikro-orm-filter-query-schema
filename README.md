# mikro-orm-filter-query-schema

A Zod-based schema builder for validating MikroORM filter queries with configurable security limits.

## Installation

```bash
npm install mikro-orm-filter-query-schema
# or
pnpm add mikro-orm-filter-query-schema
# or
yarn add mikro-orm-filter-query-schema
```

## Features

- Build type-safe Zod schemas for MikroORM `FilterQuery`
- Configurable security limits to prevent DoS attacks
- Support for all MikroORM comparison operators
- Inclusive `$between` range shorthand for number and date fields
- Relative date offsets such as `-7d`, `1h`, and `+2w`
- Field whitelist validation
- Nested logical operators (`$and`, `$or`, `$not`)
- Field name replacement (string path or callback function)

## Usage

### Basic Usage

```typescript
import { FilterQuerySchemaBuilder } from "mikro-orm-filter-query-schema";

interface User {
  id: number;
  name: string;
  age: number;
  isActive: boolean;
  roles: string[];
}

const schema = new FilterQuerySchemaBuilder<User>()
  .addField({ field: "id", type: "number" })
  .addField({ field: "name", type: "string" })
  .addField({ field: "age", type: "number" })
  .addField({ field: "isActive", type: "boolean" })
  .addField({ field: "roles", type: "string", array: true })
  .build();

// Validate filter queries
const result = schema.safeParse({
  name: "John",
  age: { $gte: 18 },
});

if (result.success) {
  // Use result.data as FilterQuery<User>
}
```

### With Custom Limits

```typescript
const schema = new FilterQuerySchemaBuilder<User>({
  maxDepth: 3,
  maxConditions: 10,
  maxOrBranches: 3,
  maxArrayLength: 50,
})
  .addField({ field: "id", type: "number" })
  .addField({ field: "name", type: "string" })
  .build();
```

### Field Replacement

You can use the `replacement` option to transform field names in the output query.

#### String Path Replacement

Map a flat field name to a nested property path:

```typescript
interface Post {
  id: number;
  title: string;
  author: {
    name: string;
    age: number;
  };
}

const schema = new FilterQuerySchemaBuilder<Post>()
  .addField({ field: "id", type: "number" })
  .addField({ field: "title", type: "string" })
  .addField({ field: "authorName", type: "string", replacement: "author.name" })
  .addField({ field: "authorAge", type: "number", replacement: "author.age" })
  .build();

// Input: { authorName: "John", authorAge: { $gte: 18 } }
// Output: { author: { name: "John", age: { $gte: 18 } } }
```

#### Callback Replacement

Use a callback function for custom query transformation:

```typescript
interface Article {
  id: number;
  title: string;
  content: string;
}

const schema = new FilterQuerySchemaBuilder<Article>()
  .addField({ field: "id", type: "number" })
  .addField({
    field: "keyword",
    type: "string",
    replacement: ({ operator, value }) => ({
      $or: [
        { title: { [operator]: value } },
        { content: { [operator]: value } },
      ],
    }),
  })
  .build();

// Input: { keyword: "search" }
// Output: { $or: [{ title: "search" }, { content: "search" }] }

// Input: { keyword: { $ne: "excluded" } }
// Output: { $or: [{ title: { $ne: "excluded" } }, { content: { $ne: "excluded" } }] }
```

The callback receives an object with:

- `field`: The original field name
- `operator`: The operator being used (`$eq`, `$ne`, `$in`, `$fulltext`, etc.)
- `value`: The value associated with the operator

## Supported Operators

### Equality Operators (all types)

| Operator | Description  | Example                       |
| -------- | ------------ | ----------------------------- |
| `$eq`    | Equal        | `{ age: { $eq: 25 } }`        |
| `$ne`    | Not equal    | `{ age: { $ne: 25 } }`        |
| `$in`    | In array     | `{ id: { $in: [1, 2, 3] } }`  |
| `$nin`   | Not in array | `{ id: { $nin: [1, 2, 3] } }` |

### Comparison Operators (number, date only)

| Operator   | Description                                 | Example                                                               |
| ---------- | ------------------------------------------- | --------------------------------------------------------------------- |
| `$gt`      | Greater than                                | `{ age: { $gt: 18 } }`                                                |
| `$gte`     | Greater than or equal                       | `{ age: { $gte: 18 } }`                                               |
| `$lt`      | Less than                                   | `{ age: { $lt: 65 } }`                                                |
| `$lte`     | Less than or equal                          | `{ age: { $lte: 65 } }`                                               |
| `$between` | Inclusive range, converted to `$gte`/`$lte` | `{ age: { $between: [18, 65] } }` → `{ age: { $gte: 18, $lte: 65 } }` |

`$between` accepts exactly two values and is only available for number and date fields. It cannot be combined with `$gt`, `$gte`, `$lt`, or `$lte` on the same field.

### Date Values

Date fields accept `Date` objects, ISO date strings, ISO datetime strings, and relative date offsets. Relative offsets are resolved from the current time and parsed to `Date` objects:

```typescript
schema.parse({ createdAt: { $gte: "-7d" } });
// Output: { createdAt: { $gte: Date } }

schema.parse({ createdAt: { $between: ["-1w", "1M"] } });
// Output: { createdAt: { $gte: Date, $lte: Date } }
```

Relative date offsets use `[+|-]number + unit`. When the sign is omitted, the offset is added to the current time. Supported units are `s`, `m`, `h`, `d`, `w`, `M`, and `y`; `m` means minute and `M` means month. Long and plural units, quarter units, and millisecond units are not supported.

### Array Operators

| Operator    | Description        | Example                                      |
| ----------- | ------------------ | -------------------------------------------- |
| `$contains` | Array contains all | `{ roles: { $contains: ["admin"] } }`        |
| `$overlap`  | Array overlaps     | `{ roles: { $overlap: ["admin", "user"] } }` |

### Logical Operators

| Operator | Description | Example                                                 |
| -------- | ----------- | ------------------------------------------------------- |
| `$and`   | Logical AND | `{ $and: [{ age: { $gte: 18 } }, { isActive: true }] }` |
| `$or`    | Logical OR  | `{ $or: [{ name: "John" }, { name: "Jane" }] }`         |
| `$not`   | Logical NOT | `{ $not: { isActive: false } }`                         |

## Configuration Options

| Option           | Type     | Default | Description                                                  |
| ---------------- | -------- | ------- | ------------------------------------------------------------ |
| `maxDepth`       | `number` | `5`     | Maximum nesting depth for filter queries                     |
| `maxConditions`  | `number` | `20`    | Maximum number of field conditions in a filter               |
| `maxOrBranches`  | `number` | `5`     | Maximum number of branches in `$or` operator                 |
| `maxArrayLength` | `number` | `100`   | Maximum array length for `$in`/`$nin`/`$contains`/`$overlap` |

## Field Options

```typescript
interface FieldOptions {
  field: string; // Field name
  type: "string" | "number" | "boolean" | "date";
  array?: boolean; // Is array field (enables $contains, $overlap)
  fulltext?: boolean | string; // Enable $fulltext or map it to a field path
  prefix?: boolean; // Enable $prefix operator (string fields only)
  replacement?: string | ((args: ReplacementCallbackArgs) => FilterQuery);
}
```

### Fulltext Search

When a string field has `fulltext: true`, the `$fulltext` operator becomes available for that field:

```typescript
const schema = new FilterQuerySchemaBuilder<Article>()
  .addField({ field: "title", type: "string", fulltext: true })
  .addField({ field: "content", type: "string" }) // no fulltext
  .build();

// $fulltext is allowed for title
schema.parse({ title: { $fulltext: "search term" } });
// Output: { title: { $fulltext: "search term" } }

// $fulltext is NOT allowed for content (will fail validation)
schema.safeParse({ content: { $fulltext: "search" } }).success; // false

// Other operators still work normally
schema.parse({ title: { $eq: "exact match" } });
// Output: { title: { $eq: "exact match" } }
```

You can also point `$fulltext` at a dedicated full-text field while keeping
normal operators on the original field:

```typescript
interface Book {
  title: string;
  searchableTitle: string;
}

const schema = new FilterQuerySchemaBuilder<Book>()
  .addField({ field: "title", type: "string", fulltext: "searchableTitle" })
  .build();

schema.parse({ title: { $fulltext: "search term" } });
// Output: { searchableTitle: { $fulltext: "search term" } }

schema.parse({ title: { $eq: "exact title", $fulltext: "search term" } });
// Output: { title: { $eq: "exact title" }, searchableTitle: { $fulltext: "search term" } }
```

### Fulltext Search Operator

| Operator    | Description      | Example                                   |
| ----------- | ---------------- | ----------------------------------------- |
| `$fulltext` | Full-text search | `{ title: { $fulltext: "search term" } }` |

> Note: The `$fulltext` operator is only available for string fields with `fulltext: true` or a fulltext field path.

### Prefix Search

When a string field has `prefix: true`, the `$prefix` operator becomes available for that field. The `$prefix` operator is converted to `$like` with the value appended with `%`, and special characters (`%`, `_`, `\`) are automatically escaped:

```typescript
const schema = new FilterQuerySchemaBuilder<Article>()
  .addField({ field: "title", type: "string", prefix: true })
  .addField({ field: "content", type: "string" }) // no prefix
  .build();

// $prefix is allowed for title
schema.parse({ title: { $prefix: "Hello" } });
// Output: { title: { $like: "Hello%" } }

// Special characters are escaped
schema.parse({ title: { $prefix: "100%" } });
// Output: { title: { $like: "100\\%%" } }

// $prefix is NOT allowed for content (will fail validation)
schema.safeParse({ content: { $prefix: "Hello" } }).success; // false
```

### Prefix Search Operator

| Operator  | Description                        | Example                                                              |
| --------- | ---------------------------------- | -------------------------------------------------------------------- |
| `$prefix` | Prefix search (converted to $like) | `{ title: { $prefix: "Hello" } }` → `{ title: { $like: "Hello%" } }` |

> Note: The `$prefix` operator is only available for string fields with `prefix: true` option.

## Security

This library provides configurable limits to protect against malicious queries:

- **Depth limiting**: Prevents deeply nested queries that could cause stack overflow
- **Condition limiting**: Limits the number of conditions to prevent complex queries
- **Or branch limiting**: Limits `$or` branches to prevent exponential query complexity
- **Array length limiting**: Limits array sizes in `$in`, `$nin`, `$contains`, `$overlap`
- **Field whitelist**: Only allows explicitly registered fields

## License

MIT
