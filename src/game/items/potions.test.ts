import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import {
	BLIND_POTION_DURATION,
	CONFUSION_POTION_DURATION,
	DETECT_MONSTER_POTION_DURATION,
	HALLUCINATION_POTION_DURATION,
	LEVITATION_POTION_DURATION,
	PLAYER_MAX_HP,
} from "../balance.js";
import { buildArenaGameState } from "../initialState.js";

describe("items/potions", () => {
	it("using a held potion heals level d4, one consumed from inventory", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerLevel: 3,
			playerHp: 10,
			playerMaxHp: 100,
			inventory: [
				{ itemId: 1, kind: "heal-potion" as const },
				{ itemId: 2, kind: "heal-potion" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		const amount = next.playerHp - state.playerHp;
		/* 3d4 */
		expect(amount).toBeGreaterThanOrEqual(3);
		expect(amount).toBeLessThanOrEqual(12);
		expect(next.playerMaxHp).toBe(state.playerMaxHp);
		expect(next.inventory).toEqual([{ itemId: 2, kind: "heal-potion" }]);
		expect(next.events).toEqual([
			{ type: "player-healed", payload: { by: "heal-potion", amount } },
		]);
	});

	it("a potion that would overheal fills HP and raises max HP by 1 instead, as in original Rogue", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerLevel: 20 /* 20d4 is at least 20 — always past the cap */,
			playerHp: PLAYER_MAX_HP - 3,
			inventory: [{ itemId: 1, kind: "heal-potion" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.playerMaxHp).toBe(PLAYER_MAX_HP + 1);
		expect(next.playerHp).toBe(PLAYER_MAX_HP + 1);
		expect(next.events).toEqual([
			{ type: "player-healed", payload: { by: "heal-potion", amount: 4 } },
		]);
	});

	it("using the last potion at full health still raises max HP by 1 and empties the stack", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "heal-potion" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.playerHp).toBe(state.playerHp + 1);
		expect(next.playerMaxHp).toBe(state.playerMaxHp + 1);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "player-healed", payload: { by: "heal-potion", amount: 1 } },
		]);
	});

	it("using a held poison potion lowers strength by 1-3 instead of hurting", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: PLAYER_MAX_HP,
			inventory: [
				{ itemId: 1, kind: "poison" as const },
				{ itemId: 2, kind: "poison" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.playerHp).toBe(PLAYER_MAX_HP);
		const strengthLost = state.playerStrength - next.playerStrength;
		expect(strengthLost).toBeGreaterThanOrEqual(1);
		expect(strengthLost).toBeLessThanOrEqual(3);
		expect(next.playerMaxStrength).toBe(state.playerMaxStrength);
		expect(next.inventory).toEqual([{ itemId: 2, kind: "poison" }]);
		expect(next.events).toEqual([
			{ type: "player-poisoned", payload: { strengthLost } },
		]);
	});

	it("a poison potion ends hallucination, and takes nothing once strength is at its floor", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerStrength: 3,
			hallucinatingTurnsRemaining: 20,
			inventory: [{ itemId: 1, kind: "poison" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.playerStrength).toBe(3);
		expect(next.hallucinatingTurnsRemaining).toBe(0);
		expect(next.events).toEqual([
			{ type: "player-poisoned", payload: { strengthLost: 0 } },
		]);
	});

	it("a poison potion never kills, even at 1 HP", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: 1,
			inventory: [{ itemId: 1, kind: "poison" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.playerHp).toBe(1);
		expect(next.status).toBe("playing");
	});

	it("using a held strength potion permanently raises playerPower", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{ itemId: 1, kind: "strength" as const },
				{ itemId: 2, kind: "strength" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.playerStrength).toBe(state.playerStrength + 1);
		expect(next.playerMaxStrength).toBe(state.playerStrength + 1);
		expect(next.inventory).toEqual([{ itemId: 2, kind: "strength" }]);
		expect(next.events).toEqual([
			{
				type: "player-strengthened",
				payload: { strength: state.playerStrength + 1 },
			},
		]);
	});

	it("using a held confusion potion sets confusedTurnsRemaining and logs player-confused", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "confusion" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		/* applyStatusCountdownTicks runs as part of the same turn-consuming action, so
		 * the drinking turn itself already counts as the first tick */
		expect(next.confusedTurnsRemaining).toBe(CONFUSION_POTION_DURATION - 1);
		expect(next.inventory).toEqual([]);
		expect(
			next.events.some(
				(event) =>
					event.type === "player-confused" &&
					event.payload.turns === CONFUSION_POTION_DURATION,
			),
		).toBe(true);
	});

	it("using a held levitation potion sets levitationTurnsRemaining and logs player-levitated", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "levitation" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		/* applyStatusCountdownTicks runs as part of the same turn-consuming action */
		expect(next.levitationTurnsRemaining).toBe(LEVITATION_POTION_DURATION - 1);
		expect(next.inventory).toEqual([]);
		expect(
			next.events.some(
				(event) =>
					event.type === "player-levitated" &&
					event.payload.turns === LEVITATION_POTION_DURATION,
			),
		).toBe(true);
	});

	it("using a held blindness potion sets blindTurnsRemaining and logs player-blinded", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "blindness" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		/* applyStatusCountdownTicks runs as part of the same turn-consuming action */
		expect(next.blindTurnsRemaining).toBe(BLIND_POTION_DURATION - 1);
		expect(next.inventory).toEqual([]);
		expect(
			next.events.some(
				(event) =>
					event.type === "player-blinded" &&
					event.payload.turns === BLIND_POTION_DURATION,
			),
		).toBe(true);
	});

	it("using a held raise-level potion levels up without touching playerExperience", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "raise-level" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.playerLevel).toBe(2);
		expect(next.playerExperience).toBe(state.playerExperience);
		expect(next.inventory).toEqual([]);
		expect(
			next.events.some(
				(event) =>
					event.type === "player-leveled-up" && event.payload.level === 2,
			),
		).toBe(true);
	});

	it("using a held detect-monster potion sets detectMonstersTurnsRemaining and logs player-detected-monsters", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "detect-monster" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		/* applyStatusCountdownTicks runs as part of the same turn-consuming action */
		expect(next.detectMonstersTurnsRemaining).toBe(
			DETECT_MONSTER_POTION_DURATION - 1,
		);
		expect(next.inventory).toEqual([]);
		expect(
			next.events.some(
				(event) =>
					event.type === "player-detected-monsters" &&
					event.payload.turns === DETECT_MONSTER_POTION_DURATION,
			),
		).toBe(true);
	});

	it("using a held hallucination potion sets hallucinatingTurnsRemaining and logs player-hallucinated", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "hallucination" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		/* applyStatusCountdownTicks runs as part of the same turn-consuming action */
		expect(next.hallucinatingTurnsRemaining).toBe(
			HALLUCINATION_POTION_DURATION - 1,
		);
		expect(next.inventory).toEqual([]);
		expect(
			next.events.some(
				(event) =>
					event.type === "player-hallucinated" &&
					event.payload.turns === HALLUCINATION_POTION_DURATION,
			),
		).toBe(true);
	});
});
