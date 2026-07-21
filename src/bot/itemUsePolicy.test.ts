import { describe, expect, it } from "vitest";
import { PLAYER_HUNGER_WARNING_THRESHOLD } from "../game/balance.js";
import { buildArenaGameState } from "../game/initialState.js";
import type { GameState } from "../game/state.js";
import { decideItemToUse } from "./itemUsePolicy.js";

const baseState = (): GameState => buildArenaGameState(5, 5, 1);

describe("decideItemToUse", () => {
	it("is undefined with nothing beneficial held", () => {
		expect(decideItemToUse(baseState())).toBeUndefined();
	});

	it("uses a mapping scroll before anything else", () => {
		const state = {
			...baseState(),
			playerHp: 1,
			inventory: [
				{ kind: "heal-potion" as const, quantity: 1 },
				{ kind: "mapping-scroll" as const, quantity: 1 },
			],
		};
		expect(decideItemToUse(state)).toBe("mapping-scroll");
	});

	it("drinks a heal potion once at half HP or lower", () => {
		const state = {
			...baseState(),
			playerHp: 5,
			playerMaxHp: 10,
			inventory: [{ kind: "heal-potion" as const, quantity: 1 }],
		};
		expect(decideItemToUse(state)).toBe("heal-potion");
	});

	it("does not waste a heal potion above half HP", () => {
		const state = {
			...baseState(),
			playerHp: 6,
			playerMaxHp: 10,
			inventory: [{ kind: "heal-potion" as const, quantity: 1 }],
		};
		expect(decideItemToUse(state)).toBeUndefined();
	});

	it("eats food once satiety crosses the warning threshold", () => {
		const state = {
			...baseState(),
			playerFood: PLAYER_HUNGER_WARNING_THRESHOLD,
			inventory: [{ kind: "food" as const, quantity: 1 }],
		};
		expect(decideItemToUse(state)).toBe("food");
	});

	it("does not eat while satiety is still comfortably above the threshold", () => {
		const state = {
			...baseState(),
			playerFood: PLAYER_HUNGER_WARNING_THRESHOLD + 1,
			inventory: [{ kind: "food" as const, quantity: 1 }],
		};
		expect(decideItemToUse(state)).toBeUndefined();
	});

	it("equips a permanent-upside item just sitting in inventory", () => {
		const state = {
			...baseState(),
			inventory: [{ kind: "strength" as const, quantity: 1 }],
		};
		expect(decideItemToUse(state)).toBe("strength");
	});

	it("never proactively drinks a harmful potion", () => {
		const state = {
			...baseState(),
			inventory: [
				{ kind: "poison" as const, quantity: 1 },
				{ kind: "confusion" as const, quantity: 1 },
				{ kind: "blindness" as const, quantity: 1 },
				{ kind: "paralysis" as const, quantity: 1 },
			],
		};
		expect(decideItemToUse(state)).toBeUndefined();
	});
});
