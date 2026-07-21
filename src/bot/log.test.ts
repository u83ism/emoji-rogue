import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../game/initialState.js";
import { buildTurnLogEntry } from "./log.js";

describe("buildTurnLogEntry", () => {
	it("snapshots the fields relevant to offline analysis", () => {
		const state = {
			...buildArenaGameState(5, 5, 1),
			goldCollected: 12,
			inventory: [
				{ kind: "food" as const, quantity: 2 },
				{ kind: "sword" as const, quantity: 1 },
			],
			items: [{ x: 1, y: 1, kind: "shield" as const }],
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
			inventoryCount: 3,
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
