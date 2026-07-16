import { describe, expect, it } from "vitest";
import { validateReplay } from "./validateReplay.js";

const VALID_REPLAY = {
	width: 40,
	height: 20,
	seed: 12345,
	actions: [
		{ type: "move", payload: { direction: "north" } },
		{ type: "wait" },
		{ type: "use-item", payload: { kind: "heal-potion" } },
		{ type: "save" },
		{ type: "quit" },
	],
};

describe("validateReplay", () => {
	it("accepts a well-formed replay and rebuilds it exactly", () => {
		const result = validateReplay(VALID_REPLAY);
		expect(result).toEqual({ ok: true, value: VALID_REPLAY });
	});

	it("drops unknown extra fields on rebuild", () => {
		const result = validateReplay({ ...VALID_REPLAY, cheatFlag: true });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect("cheatFlag" in result.value).toBe(false);
		}
	});

	it("rejects non-record roots", () => {
		expect(validateReplay(null)).toEqual({ ok: false, error: "root" });
		expect(validateReplay("[]")).toEqual({ ok: false, error: "root" });
	});

	it("rejects broken dimensions or seed", () => {
		expect(validateReplay({ ...VALID_REPLAY, width: 0 })).toEqual({
			ok: false,
			error: "width",
		});
		expect(validateReplay({ ...VALID_REPLAY, height: "20" })).toEqual({
			ok: false,
			error: "height",
		});
		expect(validateReplay({ ...VALID_REPLAY, seed: Number.NaN })).toEqual({
			ok: false,
			error: "seed",
		});
	});

	it("rejects a non-array or malformed action list", () => {
		expect(validateReplay({ ...VALID_REPLAY, actions: "nope" })).toEqual({
			ok: false,
			error: "actions",
		});
		expect(
			validateReplay({ ...VALID_REPLAY, actions: [{ type: "fly" }] }),
		).toEqual({ ok: false, error: "actions" });
		expect(
			validateReplay({
				...VALID_REPLAY,
				actions: [{ type: "move", payload: { direction: "up" } }],
			}),
		).toEqual({ ok: false, error: "actions" });
		expect(
			validateReplay({
				...VALID_REPLAY,
				actions: [{ type: "use-item", payload: { kind: "bow" } }],
			}),
		).toEqual({ ok: false, error: "actions" });
	});

	it("accepts an empty action list", () => {
		const result = validateReplay({ ...VALID_REPLAY, actions: [] });
		expect(result).toEqual({
			ok: true,
			value: { ...VALID_REPLAY, actions: [] },
		});
	});
});
