import { FilterQuerySchemaBuilder } from "../src/filter-query-schema-builder.js";
import type { FilterOptions } from "../src/interfaces/filter-options.interface.js";

interface User {
  id: number;
  name: string;
  age: number;
  isActive: boolean;
  roles: string[];
  createdAt: Date;
}

describe("FilterQuerySchemaBuilder", () => {
  function createUserBuilder(options?: Partial<FilterOptions>) {
    return new FilterQuerySchemaBuilder<User>(options)
      .addField({ field: "id", type: "number" })
      .addField({ field: "name", type: "string", fulltext: true })
      .addField({ field: "age", type: "number" })
      .addField({ field: "isActive", type: "boolean" })
      .addField({ field: "roles", type: "string", array: true })
      .addField({ field: "createdAt", type: "date" });
  }

  describe("Basic query validation", () => {
    const schema = createUserBuilder().build();

    it("should validate simple field queries", () => {
      expect(schema.safeParse({ name: "John" }).success).toBe(true);
      expect(schema.safeParse({ age: 25 }).success).toBe(true);
      expect(schema.safeParse({ isActive: true }).success).toBe(true);
    });

    it("should validate null values", () => {
      expect(schema.safeParse({ age: null }).success).toBe(true);
    });

    it("should validate comparison operators", () => {
      expect(schema.safeParse({ age: { $eq: 25 } }).success).toBe(true);
      expect(schema.safeParse({ age: { $ne: 25 } }).success).toBe(true);
      expect(schema.safeParse({ age: { $gt: 18 } }).success).toBe(true);
      expect(schema.safeParse({ age: { $gte: 18 } }).success).toBe(true);
      expect(schema.safeParse({ age: { $lt: 65 } }).success).toBe(true);
      expect(schema.safeParse({ age: { $lte: 65 } }).success).toBe(true);
    });

    it("should validate array operators", () => {
      expect(schema.safeParse({ id: { $in: [1, 2, 3] } }).success).toBe(true);
      expect(schema.safeParse({ id: { $nin: [1, 2, 3] } }).success).toBe(true);
      expect(schema.safeParse({ roles: { $contains: ["admin"] } }).success).toBe(true);
      expect(schema.safeParse({ roles: { $overlap: ["admin", "user"] } }).success).toBe(true);
    });

    it("should reject unsupported operators", () => {
      // $like and $ilike are not supported
      expect(schema.safeParse({ name: { $like: "%John%" } }).success).toBe(false);
      expect(schema.safeParse({ name: { $ilike: "%john%" } }).success).toBe(false);
      expect(schema.safeParse({ name: { $regex: ".*" } }).success).toBe(false);
    });

    it("should allow $fulltext when fulltext: true is set", () => {
      // name has fulltext: true in createUserBuilder
      expect(schema.safeParse({ name: { $fulltext: "search term" } }).success).toBe(true);
    });

    it("should validate logical operators", () => {
      expect(schema.safeParse({ $and: [{ name: "John" }, { age: 25 }] }).success).toBe(true);
      expect(schema.safeParse({ $or: [{ name: "John" }, { name: "Jane" }] }).success).toBe(true);
      expect(schema.safeParse({ $not: { isActive: false } }).success).toBe(true);
    });

    it("should validate nested logical operators", () => {
      const query = {
        $and: [
          { $or: [{ name: "John" }, { name: "Jane" }] },
          { isActive: true },
        ],
      };
      expect(schema.safeParse(query).success).toBe(true);
    });

  });

  describe("addField method", () => {
    it("should support method chaining", () => {
      const builder = new FilterQuerySchemaBuilder<User>()
        .addField({ field: "id", type: "number" })
        .addField({ field: "name", type: "string" });

      expect(builder).toBeInstanceOf(FilterQuerySchemaBuilder);
    });

    it("should correctly add fields", () => {
      const schema = new FilterQuerySchemaBuilder<User>()
        .addField({ field: "name", type: "string" })
        .build();

      expect(schema.safeParse({ name: "John" }).success).toBe(true);
    });

    it("should reject unregistered fields", () => {
      const schema = new FilterQuerySchemaBuilder<User>()
        .addField({ field: "name", type: "string" })
        .build();

      expect(schema.safeParse({ age: 25 }).success).toBe(false);
      expect(schema.safeParse({ unknownField: "value" }).success).toBe(false);
    });
  });

  describe("maxArrayLength limit", () => {
    it("should allow array length within limit", () => {
      const schema = createUserBuilder({ maxArrayLength: 5 }).build();

      expect(schema.safeParse({ id: { $in: [1, 2, 3, 4, 5] } }).success).toBe(true);
    });

    it("should reject $in array exceeding limit", () => {
      const schema = createUserBuilder({ maxArrayLength: 3 }).build();

      expect(schema.safeParse({ id: { $in: [1, 2, 3, 4] } }).success).toBe(false);
    });

    it("should reject $nin array exceeding limit", () => {
      const schema = createUserBuilder({ maxArrayLength: 3 }).build();

      expect(schema.safeParse({ id: { $nin: [1, 2, 3, 4] } }).success).toBe(false);
    });

    it("should reject $contains array exceeding limit", () => {
      const schema = createUserBuilder({ maxArrayLength: 2 }).build();

      expect(schema.safeParse({ roles: { $contains: ["a", "b", "c"] } }).success).toBe(false);
    });

    it("should reject $overlap array exceeding limit", () => {
      const schema = createUserBuilder({ maxArrayLength: 2 }).build();

      expect(schema.safeParse({ roles: { $overlap: ["a", "b", "c"] } }).success).toBe(false);
    });
  });

  describe("maxOrBranches limit", () => {
    it("should allow $or branch count within limit", () => {
      const schema = createUserBuilder({ maxOrBranches: 3 }).build();

      expect(
        schema.safeParse({
          $or: [{ name: "A" }, { name: "B" }, { name: "C" }],
        }).success
      ).toBe(true);
    });

    it("should reject $or branch count exceeding limit", () => {
      const schema = createUserBuilder({ maxOrBranches: 2 }).build();

      expect(
        schema.safeParse({
          $or: [{ name: "A" }, { name: "B" }, { name: "C" }],
        }).success
      ).toBe(false);
    });

    it("should also limit $or branches in nested queries", () => {
      const schema = createUserBuilder({ maxOrBranches: 2 }).build();

      expect(
        schema.safeParse({
          $and: [{ $or: [{ name: "A" }, { name: "B" }, { name: "C" }] }],
        }).success
      ).toBe(false);
    });
  });

  describe("maxConditions limit", () => {
    it("should allow condition count within limit", () => {
      const schema = createUserBuilder({ maxConditions: 3 }).build();

      expect(
        schema.safeParse({
          name: "John",
          age: 25,
          isActive: true,
        }).success
      ).toBe(true);
    });

    it("should reject condition count exceeding limit", () => {
      const schema = createUserBuilder({ maxConditions: 2 }).build();

      expect(
        schema.safeParse({
          name: "John",
          age: 25,
          isActive: true,
        }).success
      ).toBe(false);
    });

    it("should not count logical operators as conditions", () => {
      const schema = createUserBuilder({ maxConditions: 2 }).build();

      expect(
        schema.safeParse({
          name: "John",
          age: 25,
          $and: [{ isActive: true }],
        }).success
      ).toBe(true);
    });
  });

  describe("maxDepth limit", () => {
    it("should allow nesting depth within limit", () => {
      const schema = createUserBuilder({ maxDepth: 3 }).build();

      expect(
        schema.safeParse({
          $and: [{ $or: [{ name: "John" }] }],
        }).success
      ).toBe(true);
    });

    it("should not allow further nesting when max depth is reached", () => {
      const schema = createUserBuilder({ maxDepth: 2 }).build();

      expect(
        schema.safeParse({
          $and: [{ $or: [{ $and: [{ name: "John" }] }] }],
        }).success
      ).toBe(false);
    });

    it("should only allow one level of nesting when maxDepth is 1", () => {
      const schema = createUserBuilder({ maxDepth: 1 }).build();

      // Simple query should pass
      expect(schema.safeParse({ name: "John" }).success).toBe(true);

      // One level of $and should pass
      expect(schema.safeParse({ $and: [{ name: "John" }] }).success).toBe(true);

      // Two levels of nesting should fail
      expect(
        schema.safeParse({
          $and: [{ $or: [{ name: "John" }] }],
        }).success
      ).toBe(false);
    });
  });

  describe("Default limit values", () => {
    const schema = createUserBuilder().build();

    it("default maxDepth is 5", () => {
      // 5 levels of nesting should pass
      expect(
        schema.safeParse({
          $and: [{ $or: [{ $and: [{ $or: [{ name: "John" }] }] }] }],
        }).success
      ).toBe(true);
    });

    it("default maxOrBranches is 5", () => {
      expect(
        schema.safeParse({
          $or: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }, { name: "E" }],
        }).success
      ).toBe(true);

      expect(
        schema.safeParse({
          $or: [
            { name: "A" },
            { name: "B" },
            { name: "C" },
            { name: "D" },
            { name: "E" },
            { name: "F" },
          ],
        }).success
      ).toBe(false);
    });

    it("default maxConditions is 20", () => {
      // Create a builder with many fields
      const manyFieldsBuilder = new FilterQuerySchemaBuilder<Record<string, unknown>>();
      for (let i = 0; i < 21; i++) {
        manyFieldsBuilder.addField({ field: `field${i}`, type: "string" });
      }
      const manyFieldsSchema = manyFieldsBuilder.build();

      const conditions: Record<string, string> = {};
      for (let i = 0; i < 20; i++) {
        conditions[`field${i}`] = `value${i}`;
      }
      expect(manyFieldsSchema.safeParse(conditions).success).toBe(true);

      conditions["field20"] = "value20";
      expect(manyFieldsSchema.safeParse(conditions).success).toBe(false);
    });

    it("default maxArrayLength is 100", () => {
      const ids = Array.from({ length: 100 }, (_, i) => i);
      expect(schema.safeParse({ id: { $in: ids } }).success).toBe(true);

      ids.push(100);
      expect(schema.safeParse({ id: { $in: ids } }).success).toBe(false);
    });
  });

  describe("Combined limits", () => {
    it("should apply multiple limits simultaneously", () => {
      const schema = createUserBuilder({
        maxDepth: 2,
        maxOrBranches: 2,
        maxConditions: 3,
        maxArrayLength: 5,
      }).build();

      // Meets all limits
      expect(
        schema.safeParse({
          $or: [{ name: "A" }, { name: "B" }],
          id: { $in: [1, 2, 3] },
        }).success
      ).toBe(true);

      // Exceeds maxOrBranches
      expect(
        schema.safeParse({
          $or: [{ name: "A" }, { name: "B" }, { name: "C" }],
        }).success
      ).toBe(false);

      // Exceeds maxArrayLength
      expect(
        schema.safeParse({
          id: { $in: [1, 2, 3, 4, 5, 6] },
        }).success
      ).toBe(false);
    });
  });

  describe("Negative tests - invalid value types", () => {
    const schema = createUserBuilder().build();

    it("should reject invalid primitive value types", () => {
      // Objects are not valid primitive values (unless operator objects)
      expect(schema.safeParse({ name: { invalid: "object" } }).success).toBe(false);
      // Arrays are not valid primitive values (unless using operators)
      expect(schema.safeParse({ name: ["array"] }).success).toBe(false);
    });

    it("should reject invalid operator value types", () => {
      // $eq should be a primitive value, not an array
      expect(schema.safeParse({ age: { $eq: [1, 2] } }).success).toBe(false);
      // $gt should be a number or string
      expect(schema.safeParse({ age: { $gt: null } }).success).toBe(false);
      // $in should be an array
      expect(schema.safeParse({ id: { $in: "not-array" } }).success).toBe(false);
    });

    it("should reject unknown operators", () => {
      expect(schema.safeParse({ name: { $unknown: "value" } }).success).toBe(false);
      expect(schema.safeParse({ age: { $regex: ".*" } }).success).toBe(false);
    });

    it("should reject invalid logical operator values", () => {
      // $and should be an array
      expect(schema.safeParse({ $and: { name: "John" } }).success).toBe(false);
      // $or should be an array
      expect(schema.safeParse({ $or: "not-array" }).success).toBe(false);
      // $not should be an object
      expect(schema.safeParse({ $not: ["array"] }).success).toBe(false);
    });
  });

  describe("Type validation", () => {
    const schema = createUserBuilder().build();

    it("should reject string values for number fields", () => {
      // age is number type, should not accept strings
      expect(schema.safeParse({ age: "25" }).success).toBe(false);
      expect(schema.safeParse({ age: { $eq: "25" } }).success).toBe(false);
      expect(schema.safeParse({ age: { $gt: "18" } }).success).toBe(false);
      expect(schema.safeParse({ age: { $in: ["25", "30"] } }).success).toBe(false);
    });

    it("should reject number values for string fields", () => {
      // name is string type, should not accept numbers
      expect(schema.safeParse({ name: 123 }).success).toBe(false);
      expect(schema.safeParse({ name: { $eq: 123 } }).success).toBe(false);
      expect(schema.safeParse({ name: { $in: [123, 456] } }).success).toBe(false);
    });

    it("should reject non-boolean values for boolean fields", () => {
      // isActive is boolean type
      expect(schema.safeParse({ isActive: "true" }).success).toBe(false);
      expect(schema.safeParse({ isActive: 1 }).success).toBe(false);
      expect(schema.safeParse({ isActive: { $eq: "true" } }).success).toBe(false);
    });

    it("should accept values of correct types", () => {
      // Number fields accept numbers
      expect(schema.safeParse({ age: 25 }).success).toBe(true);
      expect(schema.safeParse({ age: { $eq: 25 } }).success).toBe(true);
      expect(schema.safeParse({ age: { $gt: 18 } }).success).toBe(true);
      expect(schema.safeParse({ age: { $in: [25, 30] } }).success).toBe(true);

      // String fields accept strings
      expect(schema.safeParse({ name: "John" }).success).toBe(true);
      expect(schema.safeParse({ name: { $eq: "John" } }).success).toBe(true);
      expect(schema.safeParse({ name: { $in: ["John", "Jane"] } }).success).toBe(true);

      // Boolean fields accept booleans
      expect(schema.safeParse({ isActive: true }).success).toBe(true);
      expect(schema.safeParse({ isActive: { $eq: false } }).success).toBe(true);
      expect(schema.safeParse({ isActive: { $in: [true, false] } }).success).toBe(true);
    });

    it("should allow null values for any type", () => {
      expect(schema.safeParse({ age: null }).success).toBe(true);
      expect(schema.safeParse({ name: null }).success).toBe(true);
      expect(schema.safeParse({ isActive: null }).success).toBe(true);
      expect(schema.safeParse({ age: { $eq: null } }).success).toBe(true);
      expect(schema.safeParse({ age: { $in: [25, null] } }).success).toBe(true);
    });

    it("should not support comparison operators for boolean type", () => {
      // boolean type does not support $gt, $gte, $lt, $lte
      expect(schema.safeParse({ isActive: { $gt: true } }).success).toBe(false);
      expect(schema.safeParse({ isActive: { $gte: false } }).success).toBe(false);
      expect(schema.safeParse({ isActive: { $lt: true } }).success).toBe(false);
      expect(schema.safeParse({ isActive: { $lte: false } }).success).toBe(false);
    });

    it("should not support comparison operators for string fields", () => {
      // string type does not support $gt, $gte, $lt, $lte
      expect(schema.safeParse({ name: { $gt: "A" } }).success).toBe(false);
      expect(schema.safeParse({ name: { $gte: "A" } }).success).toBe(false);
      expect(schema.safeParse({ name: { $lt: "Z" } }).success).toBe(false);
      expect(schema.safeParse({ name: { $lte: "Z" } }).success).toBe(false);
    });

    it("should not support array operators for non-array fields", () => {
      // name is not an array field, does not support $contains, $overlap
      expect(schema.safeParse({ name: { $contains: ["John"] } }).success).toBe(false);
      expect(schema.safeParse({ name: { $overlap: ["John", "Jane"] } }).success).toBe(false);
    });

    it("should support array operators for array fields", () => {
      // roles is an array field, supports $contains, $overlap
      expect(schema.safeParse({ roles: { $contains: ["admin"] } }).success).toBe(true);
      expect(schema.safeParse({ roles: { $overlap: ["admin", "user"] } }).success).toBe(true);
    });

    it("should allow $fulltext for fields with fulltext: true", () => {
      // name has fulltext: true in createUserBuilder, so $fulltext should be allowed
      expect(schema.safeParse({ name: { $fulltext: "search" } }).success).toBe(true);
    });

    it("should not allow $fulltext for non-string fields", () => {
      // $fulltext is not valid for non-string fields like number
      expect(schema.safeParse({ age: { $fulltext: "search" } }).success).toBe(false);
    });

    it("should accept ISO date strings for date fields", () => {
      // Full ISO format with timezone
      expect(schema.safeParse({ createdAt: "2024-01-15T10:30:00Z" }).success).toBe(true);
      expect(schema.safeParse({ createdAt: { $eq: "2024-01-15T10:30:00Z" } }).success).toBe(true);
      expect(schema.safeParse({ createdAt: { $gt: "2024-01-01T00:00:00Z" } }).success).toBe(true);
      expect(schema.safeParse({ createdAt: { $gte: "2024-01-01T00:00:00Z" } }).success).toBe(true);
      expect(schema.safeParse({ createdAt: { $lt: "2024-12-31T23:59:59Z" } }).success).toBe(true);
      expect(schema.safeParse({ createdAt: { $lte: "2024-12-31T23:59:59Z" } }).success).toBe(true);

      // ISO format with timezone offset
      expect(schema.safeParse({ createdAt: "2024-01-15T10:30:00+08:00" }).success).toBe(true);
      expect(schema.safeParse({ createdAt: "2024-01-15T10:30:00-05:00" }).success).toBe(true);

      // ISO format with milliseconds
      expect(schema.safeParse({ createdAt: "2024-01-15T10:30:00.123Z" }).success).toBe(true);

      // ISO format without timezone (local time)
      expect(schema.safeParse({ createdAt: "2024-01-15T10:30:00" }).success).toBe(true);

      // Date only format
      expect(schema.safeParse({ createdAt: "2024-01-15" }).success).toBe(true);
    });

    it("should reject non-date strings for date fields", () => {
      expect(schema.safeParse({ createdAt: "not-a-date" }).success).toBe(false);
      expect(schema.safeParse({ createdAt: 12345 }).success).toBe(false);
      expect(schema.safeParse({ createdAt: true }).success).toBe(false);
    });

    it("should accept Date objects for date fields", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      expect(schema.safeParse({ createdAt: date }).success).toBe(true);
      expect(schema.safeParse({ createdAt: { $eq: date } }).success).toBe(true);
      expect(schema.safeParse({ createdAt: { $gt: date } }).success).toBe(true);
    });
  });

  describe("Negative tests - validation in nested queries", () => {
    const schema = createUserBuilder().build();

    it("should reject unknown fields inside $and", () => {
      expect(
        schema.safeParse({
          $and: [{ unknownField: "value" }],
        }).success
      ).toBe(false);
    });

    it("should reject unknown fields inside $or", () => {
      expect(
        schema.safeParse({
          $or: [{ name: "John" }, { unknownField: "value" }],
        }).success
      ).toBe(false);
    });

    it("should reject unknown fields inside $not", () => {
      expect(
        schema.safeParse({
          $not: { unknownField: "value" },
        }).success
      ).toBe(false);
    });

    it("should reject invalid queries in deeply nested structures", () => {
      expect(
        schema.safeParse({
          $and: [
            {
              $or: [
                { name: { $unknown: "value" } },
              ],
            },
          ],
        }).success
      ).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should allow empty query object", () => {
      const schema = createUserBuilder().build();
      expect(schema.safeParse({}).success).toBe(true);
    });

    it("should allow empty $and array", () => {
      const schema = createUserBuilder().build();
      expect(schema.safeParse({ $and: [] }).success).toBe(true);
    });

    it("should allow empty $or array", () => {
      const schema = createUserBuilder().build();
      expect(schema.safeParse({ $or: [] }).success).toBe(true);
    });

    it("should allow combining multiple comparison operators", () => {
      const schema = createUserBuilder().build();
      expect(
        schema.safeParse({
          age: { $gte: 18, $lte: 65 },
        }).success
      ).toBe(true);
    });

    it("should allow using field conditions and logical operators together", () => {
      const schema = createUserBuilder().build();
      expect(
        schema.safeParse({
          name: "John",
          $and: [{ age: { $gte: 18 } }],
          $or: [{ isActive: true }],
        }).success
      ).toBe(true);
    });

    it("should only allow logical operators when no fields are added", () => {
      const schema = new FilterQuerySchemaBuilder<User>().build();

      // Empty object should pass
      expect(schema.safeParse({}).success).toBe(true);

      // Any field should not pass
      expect(schema.safeParse({ name: "John" }).success).toBe(false);

      // But nested empty objects should pass
      expect(schema.safeParse({ $and: [{}] }).success).toBe(true);
    });
  });

  describe("String replacement feature", () => {
    interface Post {
      id: number;
      title: string;
      author: {
        name: string;
        age: number;
      };
    }

    it("should replace field name with replacement path", () => {
      const schema = new FilterQuerySchemaBuilder<Post>()
        .addField({ field: "id", type: "number" })
        .addField({ field: "title", type: "string" })
        .addField({ field: "authorName", type: "string", replacement: "author.name" })
        .build();

      const result = schema.parse({ authorName: "John" });
      expect(result).toEqual({ author: { name: "John" } });
    });

    it("should replace field name in comparison operators", () => {
      const schema = new FilterQuerySchemaBuilder<Post>()
        .addField({ field: "authorAge", type: "number", replacement: "author.age" })
        .build();

      const result = schema.parse({ authorAge: { $gte: 18 } });
      expect(result).toEqual({ author: { age: { $gte: 18 } } });
    });

    it("should recursively replace field names in $and", () => {
      const schema = new FilterQuerySchemaBuilder<Post>()
        .addField({ field: "title", type: "string" })
        .addField({ field: "authorName", type: "string", replacement: "author.name" })
        .build();

      const result = schema.parse({
        $and: [{ title: "Hello" }, { authorName: "John" }],
      });
      expect(result).toEqual({
        $and: [{ title: "Hello" }, { author: { name: "John" } }],
      });
    });

    it("should recursively replace field names in $or", () => {
      const schema = new FilterQuerySchemaBuilder<Post>()
        .addField({ field: "authorName", type: "string", replacement: "author.name" })
        .build();

      const result = schema.parse({
        $or: [{ authorName: "John" }, { authorName: "Jane" }],
      });
      expect(result).toEqual({
        $or: [{ author: { name: "John" } }, { author: { name: "Jane" } }],
      });
    });

    it("should recursively replace field names in $not", () => {
      const schema = new FilterQuerySchemaBuilder<Post>()
        .addField({ field: "authorName", type: "string", replacement: "author.name" })
        .build();

      const result = schema.parse({
        $not: { authorName: "John" },
      });
      expect(result).toEqual({
        $not: { author: { name: "John" } },
      });
    });

    it("should replace field names in deeply nested structures", () => {
      const schema = new FilterQuerySchemaBuilder<Post>()
        .addField({ field: "authorName", type: "string", replacement: "author.name" })
        .addField({ field: "authorAge", type: "number", replacement: "author.age" })
        .build();

      const result = schema.parse({
        $and: [
          {
            $or: [{ authorName: "John" }, { authorName: "Jane" }],
          },
          { authorAge: { $gte: 18 } },
        ],
      });
      expect(result).toEqual({
        $and: [
          {
            $or: [{ author: { name: "John" } }, { author: { name: "Jane" } }],
          },
          { author: { age: { $gte: 18 } } },
        ],
      });
    });

    it("should not replace fields without replacement", () => {
      const schema = new FilterQuerySchemaBuilder<Post>()
        .addField({ field: "id", type: "number" })
        .addField({ field: "title", type: "string" })
        .addField({ field: "authorName", type: "string", replacement: "author.name" })
        .build();

      const result = schema.parse({
        id: 1,
        title: "Hello",
        authorName: "John",
      });
      expect(result).toEqual({
        id: 1,
        title: "Hello",
        author: { name: "John" },
      });
    });

    it("should not have transform when there are no replacements", () => {
      const schema = new FilterQuerySchemaBuilder<Post>()
        .addField({ field: "id", type: "number" })
        .addField({ field: "title", type: "string" })
        .build();

      const result = schema.parse({ id: 1, title: "Hello" });
      expect(result).toEqual({ id: 1, title: "Hello" });
    });
  });

  describe("Callback replacement feature", () => {
    interface Article {
      id: number;
      title: string;
      content: string;
      tags: string[];
    }

    it("should support callback function replacement for simple values", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "id", type: "number" })
        .addField({
          field: "keyword",
          type: "string",
          replacement: ({ value }) => ({
            $or: [{ title: value }, { content: value }],
          }),
        })
        .build();

      const result = schema.parse({ keyword: "test" });
      expect(result).toEqual({
        $or: [{ title: "test" }, { content: "test" }],
      });
    });

    it("should receive correct operator in callback", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({
          field: "search",
          type: "string",
          replacement: ({ operator, value }) => {
            if (operator === "$eq") {
              return { title: value };
            }
            return { title: { [operator]: value } };
          },
        })
        .build();

      // Direct assignment should be $eq
      const result1 = schema.parse({ search: "hello" });
      expect(result1).toEqual({ title: "hello" });

      // Using $ne operator
      const result2 = schema.parse({ search: { $ne: "excluded" } });
      expect(result2).toEqual({ title: { $ne: "excluded" } });
    });

    it("should support callback replacement in $and", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "id", type: "number" })
        .addField({
          field: "keyword",
          type: "string",
          replacement: ({ value }) => ({
            title: value,
          }),
        })
        .build();

      const result = schema.parse({
        $and: [{ id: 1 }, { keyword: "test" }],
      });
      expect(result).toEqual({
        $and: [{ id: 1 }, { title: "test" }],
      });
    });

    it("should support callback replacement in $or", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({
          field: "keyword",
          type: "string",
          replacement: ({ value }) => ({
            title: value,
          }),
        })
        .build();

      const result = schema.parse({
        $or: [{ keyword: "foo" }, { keyword: "bar" }],
      });
      expect(result).toEqual({
        $or: [{ title: "foo" }, { title: "bar" }],
      });
    });

    it("should support callback replacement in $not", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({
          field: "keyword",
          type: "string",
          replacement: ({ value }) => ({
            title: value,
          }),
        })
        .build();

      const result = schema.parse({
        $not: { keyword: "test" },
      });
      expect(result).toEqual({
        $not: { title: "test" },
      });
    });

    it("should support mixing callback and string replacements", () => {
      interface Post {
        id: number;
        title: string;
        author: {
          name: string;
        };
      }

      const schema = new FilterQuerySchemaBuilder<Post>()
        .addField({ field: "id", type: "number" })
        .addField({
          field: "authorName",
          type: "string",
          replacement: "author.name",
        })
        .addField({
          field: "keyword",
          type: "string",
          replacement: ({ value }) => ({
            title: value,
          }),
        })
        .build();

      const result = schema.parse({
        id: 1,
        authorName: "John",
        keyword: "hello",
      });
      expect(result).toEqual({
        id: 1,
        author: { name: "John" },
        title: "hello",
      });
    });

    it("should receive array operator values in callback", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({
          field: "tagSearch",
          type: "string",
          replacement: ({ operator, value }) => {
            if (operator === "$in" && Array.isArray(value)) {
              return {
                $or: value.map((v) => ({ tags: { $contains: [v] } })),
              };
            }
            return { tags: { $contains: [value] } };
          },
        })
        .build();

      const result = schema.parse({ tagSearch: { $in: ["a", "b"] } });
      expect(result).toEqual({
        $or: [
          { tags: { $contains: ["a"] } },
          { tags: { $contains: ["b"] } },
        ],
      });
    });
  });

  describe("Fulltext field option", () => {
    interface Article {
      id: number;
      title: string;
      content: string;
    }

    it("should allow $fulltext operator when fulltext: true", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "id", type: "number" })
        .addField({ field: "title", type: "string", fulltext: true })
        .build();

      expect(schema.safeParse({ title: { $fulltext: "search term" } }).success).toBe(true);
      const result = schema.parse({ title: { $fulltext: "search term" } });
      expect(result).toEqual({ title: { $fulltext: "search term" } });
    });

    it("should not allow $fulltext operator when fulltext is not set", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "title", type: "string" })
        .build();

      expect(schema.safeParse({ title: { $fulltext: "search term" } }).success).toBe(false);
    });

    it("should allow both $fulltext and other operators for fulltext fields", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "title", type: "string", fulltext: true })
        .build();

      // $fulltext should work
      expect(schema.safeParse({ title: { $fulltext: "search" } }).success).toBe(true);

      // Other operators should also work
      expect(schema.safeParse({ title: { $eq: "exact" } }).success).toBe(true);
      expect(schema.safeParse({ title: { $ne: "excluded" } }).success).toBe(true);
      expect(schema.safeParse({ title: { $in: ["a", "b"] } }).success).toBe(true);
    });

    it("should allow $fulltext in $and", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "id", type: "number" })
        .addField({ field: "title", type: "string", fulltext: true })
        .build();

      const result = schema.parse({
        $and: [{ id: 1 }, { title: { $fulltext: "search" } }],
      });
      expect(result).toEqual({
        $and: [{ id: 1 }, { title: { $fulltext: "search" } }],
      });
    });

    it("should allow $fulltext in $or", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "title", type: "string", fulltext: true })
        .build();

      const result = schema.parse({
        $or: [{ title: { $fulltext: "foo" } }, { title: { $fulltext: "bar" } }],
      });
      expect(result).toEqual({
        $or: [{ title: { $fulltext: "foo" } }, { title: { $fulltext: "bar" } }],
      });
    });

    it("should allow $fulltext in $not", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "title", type: "string", fulltext: true })
        .build();

      const result = schema.parse({
        $not: { title: { $fulltext: "excluded" } },
      });
      expect(result).toEqual({
        $not: { title: { $fulltext: "excluded" } },
      });
    });

    it("should not allow $fulltext for non-fulltext string fields", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "title", type: "string", fulltext: true })
        .addField({ field: "content", type: "string" })
        .build();

      // title has fulltext: true, should allow $fulltext
      expect(schema.safeParse({ title: { $fulltext: "search" } }).success).toBe(true);

      // content does not have fulltext: true, should not allow $fulltext
      expect(schema.safeParse({ content: { $fulltext: "search" } }).success).toBe(false);
    });

    it("should not allow $fulltext for number fields", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "id", type: "number" })
        .build();

      expect(schema.safeParse({ id: { $fulltext: "search" } }).success).toBe(false);
    });

    it("should reject invalid value types for $fulltext", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "title", type: "string", fulltext: true })
        .build();

      // $fulltext should only accept string values
      expect(schema.safeParse({ title: { $fulltext: 123 } }).success).toBe(false);
      expect(schema.safeParse({ title: { $fulltext: true } }).success).toBe(false);
      expect(schema.safeParse({ title: { $fulltext: ["array"] } }).success).toBe(false);
      expect(schema.safeParse({ title: { $fulltext: { nested: "object" } } }).success).toBe(false);
    });

    it("should allow combining $fulltext with other operators", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "title", type: "string", fulltext: true })
        .build();

      // Can use multiple operators on the same field
      expect(schema.safeParse({ title: { $fulltext: "search", $ne: "excluded" } }).success).toBe(true);
    });

    it("should not allow $fulltext in nested $and when field does not have fulltext option", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "id", type: "number" })
        .addField({ field: "content", type: "string" })
        .build();

      expect(schema.safeParse({
        $and: [{ content: { $fulltext: "search" } }]
      }).success).toBe(false);
    });

    it("should not allow $fulltext in nested $or when field does not have fulltext option", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "content", type: "string" })
        .build();

      expect(schema.safeParse({
        $or: [{ content: { $fulltext: "foo" } }, { content: { $fulltext: "bar" } }]
      }).success).toBe(false);
    });

    it("should not allow $fulltext in $not when field does not have fulltext option", () => {
      const schema = new FilterQuerySchemaBuilder<Article>()
        .addField({ field: "content", type: "string" })
        .build();

      expect(schema.safeParse({
        $not: { content: { $fulltext: "excluded" } }
      }).success).toBe(false);
    });
  });
});
