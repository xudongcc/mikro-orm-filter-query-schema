import { jest } from "@jest/globals";

import {
  FilterQuerySchemaBuilder,
  type ReplacementCallbackArgs,
} from "../src/index.js";

interface Article {
  title: string;
  content: string;
  searchableTitle: string;
}

describe("full-text operator value transforms", () => {
  it("preserves full-text values when no transform is configured", () => {
    const schema = new FilterQuerySchemaBuilder<Article>()
      .addField({ field: "title", type: "string", fulltext: "searchableTitle" })
      .build();
    expect(schema.parse({ title: { $fulltext: "Original TEXT!" } })).toEqual({
      searchableTitle: { $fulltext: "Original TEXT!" },
    });
  });

  it("transforms before full-text path mapping and leaves other operators unchanged", () => {
    const transform = jest.fn((value: string) => value.trim().toLowerCase());
    const schema = new FilterQuerySchemaBuilder<Article>({
      operatorTransforms: { $fulltext: transform },
    })
      .addField({
        field: "title",
        type: "string",
        fulltext: "searchableTitle",
        replacement: "content",
      })
      .build();
    const input = { title: { $eq: "EXACT!", $fulltext: " HELLO World! " } };
    expect(schema.parse(input)).toEqual({
      content: { $eq: "EXACT!" },
      searchableTitle: { $fulltext: "hello world!" },
    });
    expect(transform).toHaveBeenCalledTimes(1);
    expect(transform).toHaveBeenCalledWith(" HELLO World! ");
    expect(input.title.$fulltext).toBe(" HELLO World! ");
  });

  it("passes the transformed value to replacement callbacks", () => {
    const replacement = jest.fn(
      ({ operator, value }: ReplacementCallbackArgs<"string">) => ({
        content: { [operator]: value },
      }),
    );
    const schema = new FilterQuerySchemaBuilder<Article>({
      operatorTransforms: { $fulltext: (value) => value.toLowerCase() },
    })
      .addField({ field: "title", type: "string", fulltext: true, replacement })
      .build();
    expect(schema.parse({ title: { $fulltext: "HELLO" } })).toEqual({
      content: { $fulltext: "hello" },
    });
    expect(replacement).toHaveBeenCalledWith({
      field: "title",
      operator: "$fulltext",
      value: "hello",
    });
  });

  it("transforms once per operand in nested logical groups on every parse", () => {
    const transform = jest.fn((value: string) => value.toLowerCase());
    const schema = new FilterQuerySchemaBuilder<Article>({
      operatorTransforms: { $fulltext: transform },
    })
      .addField({ field: "title", type: "string", fulltext: true })
      .build();
    const input = {
      $and: [
        {
          $or: [
            { title: { $fulltext: "HELLO" } },
            { $not: { title: { $fulltext: "GOODBYE" } } },
          ],
        },
      ],
    };
    const expected = {
      $and: [
        {
          $or: [
            { title: { $fulltext: "hello" } },
            { $not: { title: { $fulltext: "goodbye" } } },
          ],
        },
      ],
    };
    expect(schema.parse(input)).toEqual(expected);
    expect(transform).toHaveBeenCalledTimes(2);
    expect(schema.parse(input)).toEqual(expected);
    expect(transform).toHaveBeenCalledTimes(4);
    expect(input.$and[0].$or[0]).toEqual({ title: { $fulltext: "HELLO" } });
  });

  it.each([123, true, null, [], {}])(
    "rejects invalid input %p before calling the transform",
    (value) => {
      const transform = jest.fn((value: string) => value.toLowerCase());
      const schema = new FilterQuerySchemaBuilder<Article>({
        operatorTransforms: { $fulltext: transform },
      })
        .addField({ field: "title", type: "string", fulltext: true })
        .build();
      expect(schema.safeParse({ title: { $fulltext: value } }).success).toBe(
        false,
      );
      expect(transform).not.toHaveBeenCalled();
    },
  );

  it("does not enable full-text operators or transform other values", () => {
    const transform = jest.fn((value: string) => value.toLowerCase());
    const schema = new FilterQuerySchemaBuilder<Article>({
      operatorTransforms: { $fulltext: transform },
    })
      .addField({
        field: "title",
        type: "string",
        fulltext: true,
        prefix: true,
      })
      .addField({ field: "content", type: "string" })
      .build();
    expect(schema.safeParse({ content: { $fulltext: "HELLO" } }).success).toBe(
      false,
    );
    expect(
      schema.parse({
        title: { $eq: "HELLO", $in: ["WORLD"], $prefix: "START" },
      }),
    ).toEqual({
      title: { $eq: "HELLO", $in: ["WORLD"], $like: "START%" },
    });
    expect(schema.parse({ title: null })).toEqual({ title: null });
    expect(schema.parse({ title: { $fulltext: undefined } })).toEqual({
      title: { $fulltext: undefined },
    });
    expect(schema.parse({ title: "HELLO" })).toEqual({ title: "HELLO" });
    expect(transform).not.toHaveBeenCalled();
  });

  it.each([123, null, undefined, [], {}])(
    "rejects invalid transform output %p",
    (value) => {
      const schema = new FilterQuerySchemaBuilder<Article>({
        operatorTransforms: {
          $fulltext: (() => value) as unknown as (value: string) => string,
        },
      })
        .addField({ field: "title", type: "string", fulltext: true })
        .build();
      expect(schema.safeParse({ title: { $fulltext: "HELLO" } }).success).toBe(
        false,
      );
    },
  );

  it("retains empty transformed strings as full-text conditions", () => {
    const schema = new FilterQuerySchemaBuilder<Article>({
      operatorTransforms: { $fulltext: () => "" },
    })
      .addField({ field: "title", type: "string", fulltext: "searchableTitle" })
      .build();
    expect(schema.parse({ title: { $fulltext: "!!!" } })).toEqual({
      searchableTitle: { $fulltext: "" },
    });
  });

  it("keeps validation limits active with a transform configured", () => {
    const schema = new FilterQuerySchemaBuilder<Article>({
      maxDepth: 0,
      maxConditions: 1,
      maxArrayLength: 1,
      operatorTransforms: { $fulltext: (value) => value.toLowerCase() },
    })
      .addField({ field: "title", type: "string", fulltext: true })
      .addField({ field: "content", type: "string" })
      .build();
    expect(
      schema.safeParse({ $and: [{ title: { $fulltext: "HELLO" } }] }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ title: { $fulltext: "HELLO" }, content: "WORLD" })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({ title: { $fulltext: "HELLO", $in: ["A", "B"] } })
        .success,
    ).toBe(false);
  });
});
