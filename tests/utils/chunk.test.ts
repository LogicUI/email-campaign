import { describe, it, expect } from "vitest";
import { chunk } from "@/core/utils/chunk";

describe("chunk", () => {
  describe("basic chunking", () => {
    it("should chunk an array into equal parts", () => {
      const items = [1, 2, 3, 4, 5, 6];
      const result = chunk(items, 2);

      expect(result).toEqual([[1, 2], [3, 4], [5, 6]]);
    });

    it("should chunk an array with size 3", () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const result = chunk(items, 3);

      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    });

    it("should handle single element chunks", () => {
      const items = [1, 2, 3];
      const result = chunk(items, 1);

      expect(result).toEqual([[1], [2], [3]]);
    });

    it("should handle size larger than array length", () => {
      const items = [1, 2, 3];
      const result = chunk(items, 10);

      expect(result).toEqual([[1, 2, 3]]);
    });
  });

  describe("uneven chunking", () => {
    it("should handle last chunk with fewer elements", () => {
      const items = [1, 2, 3, 4, 5];
      const result = chunk(items, 2);

      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("should handle arrays that don't divide evenly", () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const result = chunk(items, 3);

      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it("should handle single element array", () => {
      const items = [1];
      const result = chunk(items, 5);

      expect(result).toEqual([[1]]);
    });
  });

  describe("edge cases", () => {
    it("should return empty array for empty input", () => {
      const items: number[] = [];
      const result = chunk(items, 3);

      expect(result).toEqual([[]]);
    });

    it("should return array with original items when size is 0", () => {
      const items = [1, 2, 3, 4];
      const result = chunk(items, 0);

      expect(result).toEqual([items]);
    });

    it("should return array with original items when size is negative", () => {
      const items = [1, 2, 3, 4];
      const result = chunk(items, -1);

      expect(result).toEqual([items]);
    });
  });

  describe("type preservation", () => {
    it("should work with strings", () => {
      const items = ["a", "b", "c", "d"];
      const result = chunk(items, 2);

      expect(result).toEqual([["a", "b"], ["c", "d"]]);
    });

    it("should work with objects", () => {
      const items = [
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
        { id: 3, name: "Bob" },
      ];
      const result = chunk(items, 2);

      expect(result).toEqual([
        [{ id: 1, name: "John" }, { id: 2, name: "Jane" }],
        [{ id: 3, name: "Bob" }],
      ]);
    });

    it("should work with mixed types", () => {
      const items: (string | number | boolean)[] = [1, "two", true, 4];
      const result = chunk(items, 2);

      expect(result).toEqual([[1, "two"], [true, 4]]);
    });
  });

  describe("immutability", () => {
    it("should not mutate the original array", () => {
      const items = [1, 2, 3, 4, 5];
      const originalCopy = [...items];
      chunk(items, 2);

      expect(items).toEqual(originalCopy);
    });

    it("should create new arrays for chunks", () => {
      const items = [1, 2, 3, 4];
      const result = chunk(items, 2);

      expect(result[0]).not.toBe(items.slice(0, 2));
    });
  });
});
