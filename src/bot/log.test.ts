import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../game/initialState.js";
import type { Item } from "../game/state.js";
import { buildTurnLogEntry } from "./log.js";

const armorAt = (x: number, y: number): Item => ({
	x,
	y,
	kind: "armor",
	identity: { itemId: 2, cursed: false, defenseBonus: 1, rustProtected: false },
});

describe("buildTurnLogEntry", () => {
	it("snapshots the fields relevant to offline analysis", () => {
		const state = {
			...buildArenaGameState(5, 5, 1),
			goldCollected: 12,
			inventory: [
				{ itemId: 1, kind: "food" as const },
				{
					itemId: 2,
					kind: "sword" as const,
					equipped: false,
					cursed: false,
					attackBonus: 1,
				},
			],
			items: [armorAt(1, 1)],
		};
		const entry = buildTurnLogEntry(
			7,
			state,
			{ type: "wait" },
			{ kind: "loot", x: 1, y: 1 },
			3,
		);
		expect(entry).toEqual({
			turn: 7,
			floor: state.floor,
			playerX: state.player.x,
			playerY: state.player.y,
			playerHp: state.playerHp,
			playerMaxHp: state.playerMaxHp,
			playerFood: state.playerFood,
			goldCollected: 12,
			hasAmulet: false,
			status: "playing",
			action: { type: "wait" },
			goalKind: "loot",
			stagnantTurns: 3,
			inventoryCount: 2,
			lootRemainingOnFloor: 1,
			recentEvents: [],
		});
	});

	it("has an undefined goalKind when there is no goal", () => {
		const state = buildArenaGameState(5, 5, 1);
		const entry = buildTurnLogEntry(1, state, { type: "wait" }, undefined, 0);
		expect(entry.goalKind).toBeUndefined();
	});
});
