import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import {
	BLIND_POTION_DURATION,
	CONFUSION_POTION_DURATION,
	DETECT_MONSTER_POTION_DURATION,
	LEVITATION_POTION_DURATION,
	LIFE_POTION_MAX_HP_BONUS,
	PARALYSIS_POTION_DURATION,
	PLAYER_MAX_HP,
	ZOMBIE_MAX_HP,
} from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import type { Enemy } from "../state.js";

const zombie = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: ZOMBIE_MAX_HP,
	awake: true,
	slowedTurnsRemaining: 0,
});

describe("items/potions", () => {
	it("using a held potion drinks it: capped heal, one consumed from inventory", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: 7 /* missing 3, potion heals 5: the cap must win */,
			inventory: ["heal-potion" as const, "heal-potion" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "heal-potion" },
		});
		expect(next.playerHp).toBe(PLAYER_MAX_HP);
		expect(next.inventory).toEqual(["heal-potion"]);
		expect(next.events).toEqual([
			{ type: "player-healed", payload: { by: "heal-potion", amount: 3 } },
		]);
	});

	it("using the last potion at full health wastes it (amount 0) and empties the stack", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["heal-potion" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "heal-potion" },
		});
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "player-healed", payload: { by: "heal-potion", amount: 0 } },
		]);
	});

	it("using a held poison potion damages the player and identifies that kind", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: PLAYER_MAX_HP,
			inventory: ["poison" as const, "poison" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "poison" },
		});
		expect(next.playerHp).toBe(PLAYER_MAX_HP - 4);
		expect(next.inventory).toEqual(["poison"]);
		expect(next.identifiedPotionKinds).toEqual(["poison"]);
		expect(next.events).toEqual([
			{ type: "player-poisoned", payload: { damage: 4 } },
		]);
	});

	it("a fatal poison potion ends the run without a bonus enemy hit the same turn", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: 3,
			inventory: ["poison" as const],
			enemies: [zombie(5, 1)] /* adjacent to the player at (4,1) */,
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "poison" },
		});
		expect(next.playerHp).toBe(0);
		expect(next.status).toBe("dead");
		expect(next.events).toEqual([
			{ type: "player-poisoned", payload: { damage: 4 } },
			{ type: "player-died", payload: { by: "poison" } },
		]);
	});

	it("using a held strength potion permanently raises playerAttackDamage and identifies that kind", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["strength" as const, "strength" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "strength" },
		});
		expect(next.playerAttackDamage).toBe(state.playerAttackDamage + 1);
		expect(next.inventory).toEqual(["strength"]);
		expect(next.identifiedPotionKinds).toEqual(["strength"]);
		expect(next.events).toEqual([
			{ type: "player-strengthened", payload: { bonus: 1 } },
		]);
	});

	it("drinking either potion kind only identifies that kind, not the other", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["heal-potion" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "heal-potion" },
		});
		expect(next.identifiedPotionKinds).toEqual(["heal-potion"]);
	});

	it("using a held confusion potion sets confusedTurnsRemaining and logs player-confused", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["confusion" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "confusion" },
		});
		/* applyConfusionTick runs as part of the same turn-consuming action, so
		 * the drinking turn itself already counts as the first tick */
		expect(next.confusedTurnsRemaining).toBe(CONFUSION_POTION_DURATION - 1);
		expect(next.inventory).toEqual([]);
		expect(next.identifiedPotionKinds).toEqual(["confusion"]);
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
			inventory: ["levitation" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "levitation" },
		});
		/* applyLevitationTick runs as part of the same turn-consuming action */
		expect(next.levitationTurnsRemaining).toBe(LEVITATION_POTION_DURATION - 1);
		expect(next.inventory).toEqual([]);
		expect(next.identifiedPotionKinds).toEqual(["levitation"]);
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
			inventory: ["blindness" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "blindness" },
		});
		/* applyBlindnessTick runs as part of the same turn-consuming action */
		expect(next.blindTurnsRemaining).toBe(BLIND_POTION_DURATION - 1);
		expect(next.inventory).toEqual([]);
		expect(next.identifiedPotionKinds).toEqual(["blindness"]);
		expect(
			next.events.some(
				(event) =>
					event.type === "player-blinded" &&
					event.payload.turns === BLIND_POTION_DURATION,
			),
		).toBe(true);
	});

	it("using a held paralysis potion sets paralyzedTurnsRemaining and logs player-paralyzed", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["paralysis" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "paralysis" },
		});
		/* applyParalysisTick runs as part of the same turn-consuming action */
		expect(next.paralyzedTurnsRemaining).toBe(PARALYSIS_POTION_DURATION - 1);
		expect(next.inventory).toEqual([]);
		expect(next.identifiedPotionKinds).toEqual(["paralysis"]);
		expect(
			next.events.some(
				(event) =>
					event.type === "player-paralyzed" &&
					event.payload.turns === PARALYSIS_POTION_DURATION,
			),
		).toBe(true);
	});

	it("using a held raise-level potion levels up without touching playerExperience", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["raise-level" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "raise-level" },
		});
		expect(next.playerLevel).toBe(2);
		expect(next.playerExperience).toBe(state.playerExperience);
		expect(next.inventory).toEqual([]);
		expect(next.identifiedPotionKinds).toEqual(["raise-level"]);
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
			inventory: ["detect-monster" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "detect-monster" },
		});
		/* applyDetectMonstersTick runs as part of the same turn-consuming action */
		expect(next.detectMonstersTurnsRemaining).toBe(
			DETECT_MONSTER_POTION_DURATION - 1,
		);
		expect(next.inventory).toEqual([]);
		expect(next.identifiedPotionKinds).toEqual(["detect-monster"]);
		expect(
			next.events.some(
				(event) =>
					event.type === "player-detected-monsters" &&
					event.payload.turns === DETECT_MONSTER_POTION_DURATION,
			),
		).toBe(true);
	});

	it("using a held life potion permanently raises playerMaxHp and fully heals", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: 3,
			inventory: ["life" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "life" },
		});
		expect(next.playerMaxHp).toBe(state.playerMaxHp + LIFE_POTION_MAX_HP_BONUS);
		expect(next.playerHp).toBe(next.playerMaxHp);
		expect(next.inventory).toEqual([]);
		expect(next.identifiedPotionKinds).toEqual(["life"]);
		expect(next.events).toEqual([
			{
				type: "player-revitalized",
				payload: { maxHpBonus: LIFE_POTION_MAX_HP_BONUS },
			},
		]);
	});
});
