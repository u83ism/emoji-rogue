import { describe, expect, it } from "vitest";
import { measure } from "./text.js";

const A100 = "A".repeat(100);
const B100 = "B".repeat(100);

describe("measure: line breaking", () => {
	it("does not break when not requested", () => {
		const size = measure(A100);
		expect(size.width).toBe(A100.length);
		expect(size.height).toBe(1);
	});

	it("breaks when a max length is requested", () => {
		const size = measure(A100, 30);
		expect(size.height).toBe(4);
	});

	it("breaks at explicit newlines", () => {
		const size = measure("a\nb\nc");
		expect(size.height).toBe(3);
	});

	it("breaks at explicit newlines and max length", () => {
		expect(measure(A100 + B100, 30).height).toBe(7);
		expect(measure(`${A100}\n${B100}`, 30).height).toBe(8);
	});

	it("breaks at spaces", () => {
		const size = measure(`${A100} ${B100}`, 30);
		expect(size.height).toBe(8);
	});

	it("does not break at a non-breaking space", () => {
		const size = measure(A100 + String.fromCharCode(160) + B100, 30);
		expect(size.height).toBe(7);
	});

	it("does not break when the text is short", () => {
		const size = measure("aaa bbb", 7);
		expect(size.width).toBe(7);
		expect(size.height).toBe(1);
	});

	it("adjusts the resulting width", () => {
		const size = measure("aaa bbb", 6);
		expect(size.width).toBe(3);
		expect(size.height).toBe(2);
	});

	it("adjusts the resulting width even without breaks", () => {
		const size = measure("aaa ", 6);
		expect(size.width).toBe(3);
		expect(size.height).toBe(1);
	});

	it("removes unnecessary spaces around newlines", () => {
		const size = measure("aaa  \n  bbb");
		expect(size.width).toBe(3);
		expect(size.height).toBe(2);
	});

	it("removes unnecessary spaces at the beginning", () => {
		const size = measure("   aaa    bbb", 3);
		expect(size.width).toBe(3);
		expect(size.height).toBe(2);
	});

	it("removes unnecessary spaces at the end", () => {
		const size = measure("aaa    \nbbb", 3);
		expect(size.width).toBe(3);
		expect(size.height).toBe(2);
	});
});

describe("measure: color formatting", () => {
	it("does not break with a formatting directive", () => {
		expect(measure("aaa%c{x}bbb").height).toBe(1);
	});

	it("correctly removes formatting from the measured width", () => {
		expect(measure("aaa%c{x}bbb").width).toBe(6);
	});

	it("breaks independently of formatting - forced break", () => {
		const size = measure("aaa%c{x}bbb", 3);
		expect(size.width).toBe(3);
		expect(size.height).toBe(2);
	});

	it("breaks independently of formatting - forward break", () => {
		const size = measure("aaa%c{x}b bb", 5);
		expect(size.width).toBe(4);
		expect(size.height).toBe(2);
	});

	it("breaks independently of formatting - backward break", () => {
		const size = measure("aa a%c{x}bbb", 5);
		expect(size.width).toBe(4);
		expect(size.height).toBe(2);
	});
});
