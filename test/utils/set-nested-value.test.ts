import { setNestedValue } from "../../src/utils/set-nested-value.js";

describe("setNestedValue", () => {
  it("should set single-level path", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "name", "John");
    expect(obj).toEqual({ name: "John" });
  });

  it("should set two-level nested path", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "author.name", "John");
    expect(obj).toEqual({ author: { name: "John" } });
  });

  it("should set multi-level nested path", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "a.b.c.d", "value");
    expect(obj).toEqual({ a: { b: { c: { d: "value" } } } });
  });

  it("should preserve existing properties", () => {
    const obj: Record<string, unknown> = { existing: "value" };
    setNestedValue(obj, "author.name", "John");
    expect(obj).toEqual({
      existing: "value",
      author: { name: "John" },
    });
  });

  it("should preserve existing nested properties", () => {
    const obj: Record<string, unknown> = {
      author: { age: 30 },
    };
    setNestedValue(obj, "author.name", "John");
    expect(obj).toEqual({
      author: { age: 30, name: "John" },
    });
  });

  it("should overwrite existing values", () => {
    const obj: Record<string, unknown> = {
      author: { name: "Jane" },
    };
    setNestedValue(obj, "author.name", "John");
    expect(obj).toEqual({
      author: { name: "John" },
    });
  });

  it("should handle null values", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "author.name", null);
    expect(obj).toEqual({ author: { name: null } });
  });

  it("should handle object values", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "filter.condition", { $gte: 18 });
    expect(obj).toEqual({ filter: { condition: { $gte: 18 } } });
  });

  it("should handle array values", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "tags.list", ["a", "b", "c"]);
    expect(obj).toEqual({ tags: { list: ["a", "b", "c"] } });
  });

  it("should overwrite non-object intermediate values", () => {
    const obj: Record<string, unknown> = {
      author: "string-value",
    };
    setNestedValue(obj, "author.name", "John");
    expect(obj).toEqual({
      author: { name: "John" },
    });
  });

  it("should overwrite null intermediate values", () => {
    const obj: Record<string, unknown> = {
      author: null,
    };
    setNestedValue(obj, "author.name", "John");
    expect(obj).toEqual({
      author: { name: "John" },
    });
  });

  it("should set multiple paths on the same object", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "author.name", "John");
    setNestedValue(obj, "author.age", 30);
    setNestedValue(obj, "post.title", "Hello");
    expect(obj).toEqual({
      author: { name: "John", age: 30 },
      post: { title: "Hello" },
    });
  });
});
