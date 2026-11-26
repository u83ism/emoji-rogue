import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../../initialState.js";
import type { Enemy, Item } from "../../state.js";
import { applyMagicDetectionPotion } from "./magicDetection.js";

const plainSword: Item = {
	x: 2,
	y: 1,
	kind: "weapon",
	identity: {
		itemId: 9,
		weaponKind: "long-sword",
		cursed: false,
		hitBonus: 0,
		damageBonus: 0,
		quantity: 1,
	},
};

describe("applyMagicDetectionPotion", () => {
	it("shows magic on the floor and on monsters carrying it, but not plain gear or food", () => {
		const carrier: Enemy = {
			x: 6,
			y: 1,
			kind: "nymph",
			hp: 5,
			maxHp: 5,
			awake: false,
			speed: "normal",
			held: false,
			carried: [{ x: 0, y: 0, kind: "poison" }],
			mean: false,
			gazeUsed: false,
			confused: false,
			invisible: false,
			cancelled: false,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			items: [
				plainSword,
				{ x: 3, y: 1, kind: "food-ration" as const },
				{ x: 7, y: 1, kind: "mapping-scroll" as const },
			],
			enemies: [carrier],
		};
		const drunk = applyMagicDetectionPotion(state);
		expect(drunk.sensedItems).toEqual([
			{ x: 7, y: 1, kind: "magic" },
			{ x: 6, y: 1, kind: "magic" },
		]);
		expect(drunk.events.at(-1)).toEqual({
			type: "magic-detected",
			payload: { count: 2 },
		});
	});

	it("finds nothing with no magic about", () => {
		const drunk = applyMagicDetectionPotion({
			...buildArenaGameState(9, 3, 1),
			items: [plainSword],
		});
		expect(drunk.sensedItems).toEqual([]);
	});
});
