import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../../initialState.js";
import { applyUseLightWand } from "./lightWand.js";

describe("applyUseLightWand", () => {
	it("lights a dark room for good, or only glows in a corridor", () => {
		const arena = buildArenaGameState(9, 5, 1);
		const dark = {
			...arena,
			rooms: [{ x1: 1, y1: 1, x2: 7, y2: 3, dark: true }],
		};
		const lit = applyUseLightWand(dark, "north");
		expect(lit.rooms[0]?.dark).toBe(false);
		expect(lit.events.at(-1)?.type).toBe("room-lit");
		/* the whole room is seen now */
		expect(lit.explored[7]?.[3]).toBe(true);
		const corridor = applyUseLightWand({ ...arena, rooms: [] }, "north");
		expect(corridor.events.at(-1)?.type).toBe("corridor-glowed");
		expect(applyUseLightWand(dark, undefined)).toBe(dark);
	});
});
