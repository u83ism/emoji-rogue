import { describe, expect, it } from "vitest";
import { advanceTurn } from "./advanceTurn.js";
import { ZOMBIE_MAX_HP } from "./balance.js";
import { buildArenaGameState, buildDungeonGameState } from "./initialState.js";
import type { Action, Direction, Enemy } from "./state.js";

const move = (direction: Direction): Action => ({
	type: "move",
	payload: { direction },
});

const zombie = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: ZOMBIE_MAX_HP,
	awake: true,
	slowedTurnsRemaining: 0,
});

describe("applyTrapTrigger", () => {
	it("stepping onto a hidden trap springs it: damage dealt, trap consumed", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			traps: [{ x: 5, y: 1, kind: "dart" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.traps).toEqual([]);
		expect(next.playerHp).toBe(state.playerHp - 2);
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "dart", damage: 2 } },
		]);
	});

	it("a fatal trap ends the run without a bonus enemy hit the same turn", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: 2,
			traps: [{ x: 5, y: 1, kind: "dart" as const }],
			enemies: [zombie(6, 1)] /* would be adjacent after the move */,
		};
		const next = advanceTurn(state, move("east"));
		expect(next.playerHp).toBe(0);
		expect(next.status).toBe("dead");
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "dart", damage: 2 } },
			{ type: "player-died", payload: { by: "trap" } },
		]);
	});

	it("stepping onto a trapdoor drops the player to the next floor (no damage)", () => {
		/* descendStairs' floor generation needs digger-sized dimensions, unlike
		 * the tiny arena fixture used by the other trap tests above */
		const start = buildDungeonGameState(40, 20, 12345);
		const state = {
			...start,
			playerHp: 4,
			traps: [
				{ x: start.player.x + 1, y: start.player.y, kind: "trapdoor" as const },
			],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.floor).toBe(state.floor + 1);
		expect(next.playerHp).toBe(4); /* the new floor's enemies wait a turn */
		expect(next.terrain).not.toEqual(state.terrain);
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "trapdoor", damage: 0 } },
			{ type: "floor-descended", payload: { floor: state.floor + 1 } },
		]);
	});

	it("stepping onto a teleport trap relocates the player without damage", () => {
		const state = {
			...buildArenaGameState(9, 9, 1),
			traps: [{ x: 5, y: 4, kind: "teleport" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.playerHp).toBe(state.playerHp); /* no damage */
		expect(next.traps).toEqual([]); /* consumed */
		expect(next.player).not.toEqual({ x: 5, y: 4 }); /* relocated elsewhere */
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "teleport", damage: 0 } },
			{
				type: "player-teleported",
				payload: { x: next.player.x, y: next.player.y },
			},
		]);
	});

	it("levitating floats over a teleport trap: no relocation, trap left armed", () => {
		const state = {
			...buildArenaGameState(9, 9, 1),
			levitationTurnsRemaining: 5,
			traps: [{ x: 5, y: 4, kind: "teleport" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 4 });
		expect(next.traps).toEqual(state.traps); /* untouched, still hidden */
		expect(next.events.some((event) => event.type === "trap-triggered")).toBe(
			false,
		);
	});

	it("levitating floats over a dart trap: no damage, trap left armed", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			levitationTurnsRemaining: 5,
			traps: [{ x: 5, y: 1, kind: "dart" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.traps).toEqual(state.traps); /* untouched, still hidden */
		expect(next.events.some((event) => event.type === "trap-triggered")).toBe(
			false,
		);
	});

	it("levitating floats over a trapdoor: no forced descent", () => {
		const start = buildDungeonGameState(40, 20, 12345);
		const state = {
			...start,
			levitationTurnsRemaining: 5,
			traps: [
				{ x: start.player.x + 1, y: start.player.y, kind: "trapdoor" as const },
			],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.floor).toBe(state.floor); /* did not fall */
		expect(next.player).toEqual({
			x: start.player.x + 1,
			y: start.player.y,
		});
		expect(next.traps).toEqual(state.traps);
	});
});
