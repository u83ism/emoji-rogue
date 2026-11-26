import { describe, expect, it } from "vitest";
import { revealsItemKind } from "./identification.js";
import { buildArenaGameState } from "./initialState.js";
import type { Enemy, GameState } from "./state.js";

/* a 9x5 arena — one lit room (1..7, 1..3) — the player at (4,2) */
const arena = (overrides: Partial<GameState> = {}): GameState => ({
	...buildArenaGameState(9, 5, 1),
	...overrides,
});

const zombie = (x: number, y: number, held = false): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: 5,
	maxHp: 5,
	awake: true,
	speed: "normal",
	held,
	carried: [],
	mean: true,
	gazeUsed: false,
	confused: false,
	cancelled: false,
	invisible: false,
});

describe("revealsItemKind", () => {
	it("always names most potions and scrolls, never the ones whose effect cannot be seen", () => {
		const state = arena();
		expect(revealsItemKind("heal-potion", state, state)).toBe(true);
		expect(revealsItemKind("mapping-scroll", state, state)).toBe(true);
		expect(revealsItemKind("restore-strength-potion", state, state)).toBe(
			false,
		);
		expect(revealsItemKind("see-invisible-potion", state, state)).toBe(false);
		expect(revealsItemKind("enchant-armor", state, state)).toBe(false);
		expect(revealsItemKind("remove-curse-scroll", state, state)).toBe(false);
	});

	it("names a detect monster potion only when a monster out of sight showed up", () => {
		const empty = arena();
		expect(revealsItemKind("detect-monster", empty, empty)).toBe(false);
		/* the whole lit room is in sight: a monster in it was already seen */
		const inSight = arena({ enemies: [zombie(6, 2)] });
		expect(revealsItemKind("detect-monster", inSight, inSight)).toBe(false);
		const dark = arena({
			rooms: [{ x1: 1, y1: 1, x2: 7, y2: 3, dark: true }],
			enemies: [zombie(7, 3)],
		});
		expect(revealsItemKind("detect-monster", dark, dark)).toBe(true);
	});

	it("names a confusion potion unless the player was hallucinating", () => {
		const state = arena();
		expect(revealsItemKind("confusion", state, state)).toBe(true);
		const tripping = arena({ hallucinatingTurnsRemaining: 5 });
		expect(revealsItemKind("confusion", tripping, tripping)).toBe(false);
	});

	it("names a hold monster scroll only when something froze, a teleport scroll only in another room", () => {
		const before = arena({ enemies: [zombie(5, 2)] });
		const frozen = { ...before, enemies: [zombie(5, 2, true)] };
		expect(revealsItemKind("hold-monster-scroll", before, before)).toBe(false);
		expect(revealsItemKind("hold-monster-scroll", before, frozen)).toBe(true);
		const corridor = { ...before, rooms: [] };
		expect(revealsItemKind("teleport-scroll", before, before)).toBe(false);
		expect(revealsItemKind("teleport-scroll", before, corridor)).toBe(true);
	});

	it("names a wand only when its effect shows, a ring never, and kinds without a hidden name always", () => {
		const state = arena();
		expect(revealsItemKind("magic-missile-wand", state, state)).toBe(true);
		expect(revealsItemKind("slow-wand", state, state)).toBe(false);
		expect(revealsItemKind("teleport-wand", state, state)).toBe(false);
		expect(revealsItemKind("stealth-ring", state, state)).toBe(false);
		expect(revealsItemKind("food-ration", state, state)).toBe(true);
	});
});
