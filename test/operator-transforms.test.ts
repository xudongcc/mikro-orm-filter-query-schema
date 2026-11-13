import { jest } from "@jest/globals";

import {
  type FilterOptions,
  FilterQuerySchemaBuilder,
  type Operator,
  type OperatorValueMap,
  type ReplacementCallbackArgs,
} from "../src/index.js";

interface RecordEntity {
  text: string;
  number: number;
  enabled: boolean;
  createdAt: Date;
  tags: string[];
}

function createBuilder(options: Partial<FilterOptions>) {
  return new FilterQuerySchemaBuilder<RecordEntity>(options)
    .addField({ field: "text", type: "string", fulltext: true, prefix: true })
    .addField({ field: "number", type: "number" })
    .addField({ field: "enabled", type: "boolean" })
    .addField({ field: "createdAt", type: "date" })
    .addField({ field: "tags", type: "string", array: true });
}

const cases: Record<
  Operator,
  {
    field: keyof RecordEntity;
    input: unknown;
    output: unknown;
    expected?: unknown;
  }
> = {
  $eq: { field: "text", input: "HELLO", output: "hello" },
  $ne: { field: "enabled", input: true, output: false },
  $lt: { field: "number", input: 10, output: 9 },
  $gt: { field: "number", input: 10, output: 11 },
  $lte: { field: "number", input: 10, output: 8 },
  $gte: { field: "createdAt", input: "2026-01-02", output: "2026-01-03" },
  $between: {
    field: "number",
    input: [1, 3],
    output: [2, 4],
    expected: { $gte: 2, $lte: 4 },
  },
  $in: { field: "text", input: ["HELLO", null], output: ["hello", null] },
  $nin: { field: "number", input: [1, null], output: [2, null] },
  $fulltext: { field: "text", input: "HELLO!", output: "hello" },
  $prefix: {
    field: "text",
    input: "START",
    output: "lower_%",
    expected: { $like: "lower\\_\\%%" },
  },
  $contains: {
    field: "tags",
    input: ["HELLO", "WORLD"],
    output: ["hello", "world"],
  },
  $overlap: { field: "tags", input: ["HELLO"], output: ["hello"] },
};

describe("operator value transforms", () => {
  it.each(Object.entries(cases))(
    "transforms %s after validation",
    (operator, { field, input, output, expected }) => {
      const transform = jest.fn(() => output);
      const schema = createBuilder({
        operatorTransforms: { [operator]: transform },
      }).build();
      expect(schema.parse({ [field]: { [operator]: input } })).toEqual({
        [field]: expected ?? { [operator]: output },
      });
      expect(transform).toHaveBeenCalledTimes(1);
      expect(transform).toHaveBeenCalledWith(input);
    },
  );

  it.each(["$in", "$nin", "$contains", "$overlap"] as const)(
    "revalidates %s array length after transformation",
    (operator) => {
      const schema = createBuilder({
        maxArrayLength: 1,
        operatorTransforms: { [operator]: () => ["a", "b"] },
      }).build();
      const field = operator === "$in" || operator === "$nin" ? "text" : "tags";
      expect(schema.safeParse({ [field]: { [operator]: ["a"] } }).success).toBe(
        false,
      );
    },
  );

  it.each([
    { operator: "$eq", field: "text", input: "hello", output: 1 },
    { operator: "$ne", field: "enabled", input: true, output: "false" },
    { operator: "$gt", field: "number", input: 1, output: "2" },
    {
      operator: "$lte",
      field: "createdAt",
      input: "2026-01-02",
      output: "invalid date",
    },
    { operator: "$between", field: "number", input: [1, 2], output: [1] },
    { operator: "$between", field: "number", input: [1, 2], output: [1, 2, 3] },
    { operator: "$in", field: "number", input: [1], output: ["2"] },
    { operator: "$contains", field: "tags", input: ["a"], output: [null] },
    { operator: "$overlap", field: "tags", input: ["a"], output: [1] },
  ])(
    "rejects invalid $operator output for $field",
    ({ operator, field, input, output }) => {
      const schema = createBuilder({
        operatorTransforms: { [operator]: () => output },
      }).build();
      expect(schema.safeParse({ [field]: { [operator]: input } }).success).toBe(
        false,
      );
    },
  );

  it("rejects invalid operands before a transform can repair them", () => {
    const transform = jest.fn((value: OperatorValueMap["$in"]) =>
      value.slice(0, 1),
    );
    const schema = createBuilder({
      maxArrayLength: 1,
      operatorTransforms: { $in: transform },
    }).build();
    expect(schema.safeParse({ number: { $in: [1, 2] } }).success).toBe(false);
    expect(schema.safeParse({ number: { $in: ["1"] } }).success).toBe(false);
    expect(transform).not.toHaveBeenCalled();
  });

  it("handles nullable operands and nested conditions without changing direct values", () => {
    const schema = createBuilder({
      operatorTransforms: {
        $eq: (value) =>
          value === null
            ? "missing"
            : typeof value === "string"
              ? value.toLowerCase()
              : value,
        $gt: (value) => (typeof value === "number" ? value + 1 : value),
      },
    }).build();
    expect(
      schema.parse({
        $and: [
          { text: { $eq: null } },
          {
            $or: [{ number: { $gt: 1 } }, { $not: { text: { $eq: "HELLO" } } }],
          },
        ],
      }),
    ).toEqual({
      $and: [
        { text: { $eq: "missing" } },
        { $or: [{ number: { $gt: 2 } }, { $not: { text: { $eq: "hello" } } }] },
      ],
    });
    expect(schema.parse({ text: "HELLO", number: 1 })).toEqual({
      text: "HELLO",
      number: 1,
    });
    expect(schema.parse({ text: null })).toEqual({ text: null });
  });

  it("passes parsed relative dates to transforms", () => {
    const transform = jest.fn((value: OperatorValueMap["$gte"]) =>
      value instanceof Date ? new Date(value.getTime() + 1000) : value,
    );
    const schema = createBuilder({
      operatorTransforms: { $gte: transform },
    }).build();
    const result = schema.parse({ createdAt: { $gte: "-1d" } }) as {
      createdAt: { $gte: Date };
    };
    expect(transform).toHaveBeenCalledTimes(1);
    expect(transform).toHaveBeenCalledWith(expect.any(Date));
    expect(result.createdAt.$gte.getTime()).toBe(
      (transform.mock.calls[0][0] as Date).getTime() + 1000,
    );
  });

  it("transforms ranges before expansion and replacement without reprocessing generated operators", () => {
    const transform = jest.fn((): OperatorValueMap["$between"] => [2, 4]);
    const gte = jest.fn((value: OperatorValueMap["$gte"]) => value);
    const schema = new FilterQuerySchemaBuilder<RecordEntity>({
      operatorTransforms: { $between: transform, $gte: gte },
    })
      .addField({ field: "range", type: "number", replacement: "number" })
      .build();
    expect(schema.parse({ range: { $between: [1, 3] } })).toEqual({
      number: { $gte: 2, $lte: 4 },
    });
    expect(transform).toHaveBeenCalledTimes(1);
    expect(gte).not.toHaveBeenCalled();
  });

  it("passes transformed arrays to replacement callbacks", () => {
    const replacement = jest.fn(
      ({ operator, value }: ReplacementCallbackArgs<"string">) => ({
        text: { [operator]: value },
      }),
    );
    const schema = new FilterQuerySchemaBuilder<RecordEntity>({
      operatorTransforms: {
        $in: (values) =>
          values.map((value) =>
            typeof value === "string" ? value.toLowerCase() : value,
          ),
      },
    })
      .addField({ field: "alias", type: "string", replacement })
      .build();
    expect(schema.parse({ alias: { $in: ["HELLO", null] } })).toEqual({
      text: { $in: ["hello", null] },
    });
    expect(replacement).toHaveBeenCalledWith({
      field: "alias",
      operator: "$in",
      value: ["hello", null],
    });
  });

  it("does not enable unsupported operators or bypass range conflicts", () => {
    const transform = jest.fn((value: string) => value.toLowerCase());
    const schema = new FilterQuerySchemaBuilder<RecordEntity>({
      operatorTransforms: {
        $prefix: transform,
        $fulltext: transform,
        $between: (value) => value,
      },
    })
      .addField({ field: "text", type: "string" })
      .addField({ field: "number", type: "number" })
      .build();
    expect(schema.safeParse({ text: { $prefix: "HELLO" } }).success).toBe(
      false,
    );
    expect(schema.safeParse({ text: { $fulltext: "HELLO" } }).success).toBe(
      false,
    );
    expect(transform).not.toHaveBeenCalled();
    expect(
      schema.safeParse({ number: { $between: [1, 3], $gte: 2 } }).success,
    ).toBe(false);
  });

  it("skips omitted operator values", () => {
    const transform = jest.fn((value: OperatorValueMap["$eq"]) => value);
    const schema = createBuilder({
      operatorTransforms: { $eq: transform },
    }).build();
    expect(schema.parse({ text: { $eq: undefined } })).toEqual({
      text: { $eq: undefined },
    });
    expect(transform).not.toHaveBeenCalled();
  });
});
