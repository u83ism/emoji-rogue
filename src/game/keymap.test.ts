import type { Key } from "ink";
import { describe, expect, it } from "vitest";
import { toAction } from "./keymap.js";

const buildKey = (overrides: Partial<Key> = {}): Key => ({
	upArrow: false,
	downArrow: false,
	leftArrow: false,
	rightArrow: false,
	pageDown: false,
	pageUp: false,
	return: false,
	escape: false,
	ctrl: false,
	shift: false,
	tab: false,
	backspace: false,
	delete: false,
	meta: false,
	home: false,
	end: false,
	super: false,
	hyper: false,
	capsLock: false,
	numLock: false,
	eventType: "press",
	...overrides,
});

describe("toAction", () => {
	it("maps arrow keys to moves", () => {
		expect(toAction("", buildKey({ upArrow: true }))).toEqual({
			type: "move",
			payload: { direction: "north" },
		});
		expect(toAction("", buildKey({ downArrow: true }))).toEqual({
			type: "move",
			payload: { direction: "south" },
		});
		expect(toAction("", buildKey({ leftArrow: true }))).toEqual({
			type: "move",
			payload: { direction: "west" },
		});
		expect(toAction("", buildKey({ rightArrow: true }))).toEqual({
			type: "move",
			payload: { direction: "east" },
		});
	});

	it("maps vi keys (hjkl) to moves", () => {
		expect(toAction("k", buildKey())).toEqual({
			type: "move",
			payload: { direction: "north" },
		});
		expect(toAction("j", buildKey())).toEqual({
			type: "move",
			payload: { direction: "south" },
		});
		expect(toAction("h", buildKey())).toEqual({
			type: "move",
			payload: { direction: "west" },
		});
		expect(toAction("l", buildKey())).toEqual({
			type: "move",
			payload: { direction: "east" },
		});
	});

	it("maps period and space to wait", () => {
		expect(toAction(".", buildKey())).toEqual({ type: "wait" });
		expect(toAction(" ", buildKey())).toEqual({ type: "wait" });
	});

	it("maps q to quit and leaves unbound keys undefined", () => {
		expect(toAction("q", buildKey())).toEqual({ type: "quit" });
		expect(toAction("x", buildKey())).toBeUndefined();
		expect(toAction("", buildKey({ escape: true }))).toBeUndefined();
	});
});
