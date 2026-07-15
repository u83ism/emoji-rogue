import { describe, expect, it } from "vitest";
import { parseSeedArgument } from "./cliArgs.js";

describe("parseSeedArgument", () => {
	it("returns the seed from --seed=<number>", () => {
		expect(parseSeedArgument(["--seed=12345"])).toBe(12345);
	});

	it("finds the flag among other arguments", () => {
		expect(parseSeedArgument(["--foo", "--seed=42", "--bar"])).toBe(42);
	});

	it("returns undefined when the flag is absent", () => {
		expect(parseSeedArgument([])).toBeUndefined();
		expect(parseSeedArgument(["--other=1"])).toBeUndefined();
	});

	it("rejects non-positive or non-finite seeds, falling through to undefined", () => {
		expect(parseSeedArgument(["--seed=0"])).toBeUndefined();
		expect(parseSeedArgument(["--seed=-5"])).toBeUndefined();
		expect(parseSeedArgument(["--seed=NaN"])).toBeUndefined();
		expect(parseSeedArgument(["--seed=abc"])).toBeUndefined();
		expect(parseSeedArgument(["--seed=Infinity"])).toBeUndefined();
	});

	it("accepts a fractional seed (any positive finite number)", () => {
		expect(parseSeedArgument(["--seed=1.5"])).toBe(1.5);
	});

	it("uses the first valid --seed when given more than one", () => {
		expect(parseSeedArgument(["--seed=1", "--seed=2"])).toBe(1);
	});
});
