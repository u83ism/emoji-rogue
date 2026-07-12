import { describe, expect, it } from "vitest";
import { err, ok } from "./result.js";

describe("ok", () => {
	it("wraps a value as a successful result", () => {
		const result = ok(42);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe(42);
		}
	});
});

describe("err", () => {
	it("wraps an error as a failed result", () => {
		const result = err("no-path-found");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe("no-path-found");
		}
	});
});
