import { describe, expect, it } from "vitest";
import { capitalize, format, formatMap, mod } from "./util.js";

describe("capitalize", () => {
	it("capitalizes the first letter", () => {
		expect(capitalize("abc")).toBe("Abc");
		expect(capitalize("Abc")).toBe("Abc");
	});
});

describe("mod", () => {
	it("computes modulus of a positive number", () => {
		expect(mod(7, 3)).toBe(1);
	});

	it("computes modulus of a negative number", () => {
		expect(mod(-7, 3)).toBe(2);
	});
});

describe("format", () => {
	it("does not replace when not requested", () => {
		expect(format("aaa bbb ccc")).toBe("aaa bbb ccc");
	});

	it("ignores double-percents", () => {
		expect(format("%%s")).toBe("%s");
		expect(format("%%s", 1, 2, 3)).toBe("%s");
	});

	it("replaces %s by default", () => {
		expect(format("a %s c", "b")).toBe("a b c");
	});

	it("replaces multiple arguments", () => {
		expect(format("a %s,%s,x", "b", "c")).toBe("a b,c,x");
	});

	it("ignores remaining arguments", () => {
		expect(format("a %s c", "b", "c")).toBe("a b c");
	});

	it("skips missing arguments", () => {
		expect(format("a %s %s", "b")).toBe("a b %s");
	});

	it("supports brace syntax", () => {
		expect(format("%{s}ss", "b")).toBe("bss");
		expect(format("%s}ss", "b")).toBe("b}ss");
		expect(format("%{s ss", "b")).toBe("%{s ss");
	});

	it("capitalizes the result when the directive letter is uppercase", () => {
		expect(format("a %S", "b")).toBe("a B");
	});

	it("supports custom formatMap entries", () => {
		const savedMap = { ...formatMap };
		Object.assign(formatMap, { s: "test1", xxx: "test2" });
		const obj = {
			test1: () => "foo",
			test2: () => "bar",
		};
		expect(format("%s %S %x %xxx %Xxx %XXX", obj, obj, obj, obj, obj)).toBe(
			"foo Foo %x bar Bar Bar",
		);
		for (const key of Object.keys(formatMap)) delete formatMap[key];
		Object.assign(formatMap, savedMap);
	});

	it("passes params through to the mapped method", () => {
		const savedMap = { ...formatMap };
		Object.assign(formatMap, { foo: "foo" });
		const obj = { foo: (value: string) => value + value };
		expect(format("%{foo,bar}", obj)).toBe("barbar");
		for (const key of Object.keys(formatMap)) delete formatMap[key];
		Object.assign(formatMap, savedMap);
	});
});
