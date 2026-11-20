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
import type { GameState } from "../state.js";

/** original Rogue's spread(base): base - base/20 + rnd(base/10). */
const isInSpread = (turns: number, base: number): boolean => {
	const low = base - Math.floor(base / 20);
	return turns >= low && turns <= low + Math.max(0, Math.floor(base / 10) - 1);
};
const expectSpread = (turns: number, base: number): void => {
	expect(isInSpread(turns, base)).toBe(true);
};

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
		expectSpread(next.confusedTurnsRemaining + 1, CONFUSION_POTION_DURATION);
		expect(next.inventory).toEqual([]);
		expect(
			next.events.some(
				(event) =>
					event.type === "player-confused" &&
					isInSpread(event.payload.turns, CONFUSION_POTION_DURATION),
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
		expectSpread(next.levitationTurnsRemaining + 1, LEVITATION_POTION_DURATION);
		expect(next.inventory).toEqual([]);
		expect(
			next.events.some(
				(event) =>
					event.type === "player-levitated" &&
					isInSpread(event.payload.turns, LEVITATION_POTION_DURATION),
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
		expectSpread(next.blindTurnsRemaining + 1, BLIND_POTION_DURATION);
		expect(next.inventory).toEqual([]);
		expect(
			next.events.some(
				(event) =>
					event.type === "player-blinded" &&
					isInSpread(event.payload.turns, BLIND_POTION_DURATION),
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
		expectSpread(
			next.hallucinatingTurnsRemaining + 1,
			HALLUCINATION_POTION_DURATION,
		);
		expect(next.inventory).toEqual([]);
		expect(
			next.events.some(
				(event) =>
					event.type === "player-hallucinated" &&
					isInSpread(event.payload.turns, HALLUCINATION_POTION_DURATION),
			),
		).toBe(true);
	});

	it("restore strength brings a drained strength back to the maximum, keeping an add strength ring's value on top", () => {
		const drink = (state: GameState) =>
			advanceTurn(
				{
					...state,
					inventory: [
						...state.inventory,
						{ itemId: 50, kind: "restore-strength-potion" as const },
					],
				},
				{ type: "use-item", payload: { itemId: 50 } },
			);
		const drained = {
			...buildArenaGameState(9, 3, 1),
			playerStrength: 12,
			playerMaxStrength: 16,
		};
		expect(drink(drained).playerStrength).toBe(16);
		const ringed = {
			...drained,
			playerStrength: 14 /* 12 + the ring's 2 */,
			inventory: [
				{
					itemId: 1,
					kind: "add-strength-ring" as const,
					equipped: true,
					cursed: false,
					bonus: 2,
				},
			],
		};
		expect(drink(ringed).playerStrength).toBe(18);
		const strong = { ...drained, playerStrength: 17 };
		expect(drink(strong).playerStrength).toBe(17); /* never lowers it */
	});

	it("extra healing overheals the maximum by 1 or 2, and cures blindness and hallucination", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerLevel: 10,
			playerHp: 10,
			playerMaxHp: 10,
			blindTurnsRemaining: 5,
			hallucinatingTurnsRemaining: 5,
			inventory: [{ itemId: 1, kind: "extra-healing-potion" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect([11, 12]).toContain(next.playerMaxHp);
		expect(next.playerHp).toBe(next.playerMaxHp);
		expect(next.blindTurnsRemaining).toBe(0);
		expect(next.hallucinatingTurnsRemaining).toBe(0);
	});

	it("haste gives two moves per monster turn, and a second potion while hasted faints the player", () => {
		const start = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{ itemId: 1, kind: "haste-self-potion" as const },
				{ itemId: 2, kind: "haste-self-potion" as const },
			],
		};
		const hasted = advanceTurn(start, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(hasted.hasteTurnsRemaining).toBeGreaterThanOrEqual(3);
		const firstMove = advanceTurn(hasted, { type: "wait" });
		expect(firstMove.playerFood).toBe(hasted.playerFood); /* no turn end yet */
		expect(firstMove.hasteMoveSpent).toBe(true);
		const secondMove = advanceTurn(firstMove, { type: "wait" });
		expect(secondMove.playerFood).toBe(hasted.playerFood - 1);
		expect(secondMove.hasteMoveSpent).toBe(false);
		const exhausted = advanceTurn(secondMove, {
			type: "use-item",
			payload: { itemId: 2 },
		});
		expect(exhausted.hasteTurnsRemaining).toBe(0);
		expect(
			exhausted.events.some((event) => event.type === "player-exhausted"),
		).toBe(true);
	});
});
