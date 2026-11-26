import { describe, expect, it } from "vitest";
import { createRng } from "../../../rng.js";
import { advanceTurn } from "../../advanceTurn.js";
import { AMULET_FLOOR } from "../../balance.js";
import { buildSpawnedEnemy } from "../../floor/enemies.js";
import { buildArenaGameState } from "../../initialState.js";
import type { Enemy, GameState } from "../../state.js";
import { drawXerocDisguise, XEROC_DISGUISES } from "./xerocDisguise.js";

/** A 9x3 arena with a sleeping xeroc disguised as gold right of the player. */
const buildXerocState = (overrides: Partial<GameState> = {}): GameState => {
	const base = buildArenaGameState(9, 3, 1);
	const xeroc: Enemy = {
		...buildSpawnedEnemy(
			"xeroc",
			{ x: base.player.x + 1, y: base.player.y },
			createRng(1),
		),
		disguise: "gold",
	};
	return { ...base, enemies: [xeroc], ...overrides };
};

describe("drawXerocDisguise", () => {
	it("draws any of rnd_thing()'s things, the amulet only from AMULET_FLOOR down", () => {
		const shallow = new Set<string>();
		const deep = new Set<string>();
		const rng = createRng(7);
		for (let i = 0; i < 400; i++) {
			shallow.add(drawXerocDisguise(rng, AMULET_FLOOR - 1));
			deep.add(drawXerocDisguise(rng, AMULET_FLOOR));
		}
		expect([...deep].sort()).toEqual([...XEROC_DISGUISES].sort());
		expect([...shallow].sort()).toEqual(
			XEROC_DISGUISES.filter((thing) => thing !== "amulet").sort(),
		);
	});

	it("is drawn for every newborn xeroc and no other kind", () => {
		const rng = createRng(3);
		expect(
			buildSpawnedEnemy("xeroc", { x: 1, y: 1 }, rng).disguise,
		).toBeDefined();
		expect(
			buildSpawnedEnemy("orc", { x: 1, y: 1 }, rng).disguise,
		).toBeUndefined();
	});
});

describe("unmasking a xeroc", () => {
	it("bumping a disguised xeroc only unmasks and wakes it — fight() returns before rolling", () => {
		const state = buildXerocState();
		const next = advanceTurn(state, {
			type: "move",
			payload: { direction: "east" },
		});
		const [xeroc] = next.enemies;
		expect(xeroc?.disguise).toBeUndefined();
		expect(xeroc?.awake).toBe(true);
		expect(xeroc?.hp).toBe(state.enemies[0]?.hp);
		expect(next.events[0]).toEqual({ type: "xeroc-revealed", payload: {} });
		expect(
			next.events.some(
				(event) =>
					event.type === "player-attack-missed" ||
					event.type === "enemy-hit" ||
					event.type === "enemy-defeated",
			),
		).toBe(false);
	});

	it("a blind player's swing leaves the disguise on and rolls as usual", () => {
		const state = buildXerocState({ blindTurnsRemaining: 5 });
		const next = advanceTurn(state, {
			type: "move",
			payload: { direction: "east" },
		});
		expect(next.enemies[0]?.disguise).toBe("gold");
		expect(next.events.some((event) => event.type === "xeroc-revealed")).toBe(
			false,
		);
	});

	it("an awake disguised xeroc attacking the player is unmasked before its blow", () => {
		const base = buildXerocState();
		const awake = base.enemies.map((enemy) => ({ ...enemy, awake: true }));
		const next = advanceTurn({ ...base, enemies: awake }, { type: "wait" });
		expect(next.enemies[0]?.disguise).toBeUndefined();
		const revealedAt = next.events.findIndex(
			(event) => event.type === "xeroc-revealed",
		);
		const blowAt = next.events.findIndex(
			(event) =>
				event.type === "player-hit" || event.type === "enemy-attack-missed",
		);
		expect(revealedAt).toBeGreaterThanOrEqual(0);
		expect(revealedAt).toBeLessThan(blowAt);
	});
});
